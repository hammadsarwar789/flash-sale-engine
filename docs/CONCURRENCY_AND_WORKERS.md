# ⚙️ Concurrency Controls, Redis Lua Scripting & Async Worker Topology

This document details the low-level concurrency mechanisms, Redis in-memory Lua scripts, background Celery worker tasks, Celery Beat periodic schedulers, rate limiters, and idempotency decorators operating in the **Flash Sale Engine**.

---

## 1. Atomic Redis Lua Scripts Breakdown

To guarantee atomic inventory operations under extreme concurrency ($> 10,000 \text{ req/sec}$), inventory reservations execute in single-threaded Redis Lua scripts ([`backend/app/services/inventory_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_service.py)):

### 1.1 Single-Item Inventory Reservation (`LUA_RESERVE_STOCK`)
```lua
-- KEYS[1]: product:{id}:stock (Available Stock String)
-- KEYS[2]: product:{id}:hold  (Reserved Hold String)
-- ARGV[1]: requested_quantity (Number)

local current_stock = tonumber(redis.call('GET', KEYS[1]) or '0')
local requested_qty = tonumber(ARGV[1])

if current_stock >= requested_qty then
    redis.call('DECRBY', KEYS[1], requested_qty)
    redis.call('INCRBY', KEYS[2], requested_qty)
    return 1 -- SUCCESS: Stock Reserved
else
    return 0 -- ERR: Insufficient Stock
end
```
- **Execution Latency:** $\approx 0.4 \text{ ms}$
- **Guarantees:** Zero overselling, zero row-lock contention on PostgreSQL.

---

### 1.2 Single-Item Inventory Release (`LUA_RELEASE_STOCK`)
```lua
-- KEYS[1]: product:{id}:stock (Available Stock String)
-- KEYS[2]: product:{id}:hold  (Reserved Hold String)
-- ARGV[1]: release_quantity   (Number)

local current_hold = tonumber(redis.call('GET', KEYS[2]) or '0')
local release_qty = tonumber(ARGV[1])
local actual_release = math.min(current_hold, release_qty)

if actual_release > 0 then
    redis.call('DECRBY', KEYS[2], actual_release)
    redis.call('INCRBY', KEYS[1], actual_release)
    return actual_release -- Returns quantity restored
else
    return 0
end
```
- **Triggered By:** Order cancellations, 10-minute reservation countdown expirations, or PostgreSQL transaction rollbacks.

---

### 1.3 Multi-Item Cart Inventory Reservation (`LUA_RESERVE_MULTI_STOCK`)
For multi-item cart checkouts, reserving stock sequentially across multiple items creates partial reservation risk (item A succeeds, item B fails, leaving item A locked). `LUA_RESERVE_MULTI_STOCK` inspects ALL cart items in a single atomic pass:
```lua
-- ARGV: Alternating product_ids and requested_quantities
-- 1. First Pass: Verify ALL items have sufficient available stock
for i = 1, #ARGV, 2 do
    local stock_key = "product:" .. ARGV[i] .. ":stock"
    local qty = tonumber(ARGV[i+1])
    local current_stock = tonumber(redis.call('GET', stock_key) or '0')
    if current_stock < qty then
        return 0 -- ERR: Item ARGV[i] out of stock. Abort ENTIRE checkout.
    end
end

-- 2. Second Pass: All items confirmed available. Perform atomic decrements.
for i = 1, #ARGV, 2 do
    local stock_key = "product:" .. ARGV[i] .. ":stock"
    local hold_key  = "product:" .. ARGV[i] .. ":hold"
    local qty = tonumber(ARGV[i+1])
    redis.call('DECRBY', stock_key, qty)
    redis.call('INCRBY', hold_key, qty)
end

return 1 -- SUCCESS: Entire multi-item cart reserved
```

---

## 2. Celery Background Worker Tasks & Beat Schedulers

Async tasks are defined in [`backend/app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py) and executed via Celery worker processes connected to RabbitMQ:

### 2.1 Payment Gateway Processing (`process_payment_task`)
* **Signature:** `process_payment_task(order_id: str, user_id: str)`
* **Task Retries:** Max 3 retries with 5-second backoff.
* **Execution:** Interacts with payment gateway, transitions `Order.status` to `PAID`, triggers `OrderSplitter` to generate `SubOrder` branches, and writes initial `ESCROW_HOLD` ledger entries. Writes execution audit metrics to `TaskLog`.

### 2.2 10-Minute Order Expiration Timer (`schedule_order_expiry_task`)
* **Signature:** `schedule_order_expiry_task(order_id: str)`
* **Countdown Delay:** Scheduled with `eta = Date.now() + 10 minutes`.
* **Execution:** Checks `Order.status`. If status is still `PENDING` (unpaid), transitions status to `EXPIRED` and invokes `adjust_stock()` (`reason="WEB_ORDER_EXPIRED"`, `source="WEB"`) to restore Redis and PostgreSQL stock, automatically enqueueing Shopify outbox events.

### 2.3 Automated Daily Escrow Release (`release_matured_escrow_task`)
* **Schedule:** Celery Beat Cron: `0 2 * * *` (Daily at 02:00 UTC).
* **Execution:** Scans `LedgerEntry` records where `entry_type = 'ESCROW_HOLD'`, `status = 'HELD'`, and `available_at <= NOW()`. Transitions status to `RELEASED` and credits merchant `seller.available_balance`.

### 2.4 Support AI RAG Auto-Responder (`process_new_ticket_task`)
* **Signature:** `process_new_ticket_task(ticket_id: str)`
* **Execution:** Executes `AIService.generate_rag_suggested_reply()`. If confidence $\ge 0.85$ on general policy questions, dispatches automated `SYSTEM_AI_BOT` response and updates ticket status to `WAITING_CUSTOMER`. Defect tickets are automatically routed to the vendor's queue at `HIGH` priority.

### 2.5 Resilient Background Outbox Poller (`start_outbox_poller`)
* **Location:** [`backend/app/workers/shopify_tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/shopify_tasks.py)
* **Mechanics:** Daemon thread initialized at application startup (`__init__.py`). Runs every 30 seconds (`_POLL_INTERVAL_SECONDS = 30`), fetching `PENDING` `OutboxEvent` items and executing `drain_outbox_events()`.
* **Guarantees:** Ensures that even if immediate synchronous outbox processing encounters transient network error or API rate-limiting during `adjust_stock()`, inventory adjustments (from sales, cancellations, refunds, or restocks) are reliably pushed to the Shopify Admin API without manual intervention or standalone worker processes.

---

## 3. Resilience Decorators: Rate Limiting & Idempotency

### 3.1 Distributed Idempotency Layer (`@idempotent`)
* **Location:** [`backend/app/api/decorators/idempotent.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/idempotent.py)
* **Mechanics:**
  1. Inspects incoming `Idempotency-Key` HTTP header.
  2. Executes `SET idempotency:<key> "PROCESSING" NX EX 120` in Redis.
  3. If key exists, rejects duplicate request with `HTTP 409 Conflict` (or returns cached payload if status is `COMPLETED`).
  4. Upon controller completion, updates key status to `COMPLETED` and stores JSON response payload.

### 3.2 Sliding-Window Rate Limiter (`@rate_limit`)
* **Location:** [`backend/app/api/decorators/rate_limit.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/rate_limit.py)
* **Algorithm:** Redis Sorted Set (`ZSET`) sliding-window algorithm.
  ```python
  # ZSET Key: rate_limit:<ip_or_user_id>:<endpoint>
  now = time.time()
  window_start = now - window_seconds

  pipeline = redis_client.pipeline()
  pipeline.zremrangebyscore(key, 0, window_start) # Evict expired requests
  pipeline.zadd(key, {str(now): now})             # Add current request
  pipeline.zcard(key)                             # Count requests in window
  pipeline.expire(key, window_seconds)
  _, _, current_count, _ = pipeline.execute()

  if current_count > max_requests:
      raise RateLimitExceeded("Too many requests")
  ```
* **Default Throughput Cap:** 10,000 requests per 60-second window on flash sale reserve endpoints.
