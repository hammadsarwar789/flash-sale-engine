# 🧠 AI Architectural Decisions & Engineering Rationale (`Decision.md`)

This document records the **WHY** behind every major design choice, data structure, concurrency strategy, financial model, and architectural pattern in the **Flash Sale Engine**. It moves beyond *what* code was written to explain the trade-offs, catastrophic failure modes avoided, and engineering principles driving system design.

---

## 🏛️ 1. In-Memory Atomic Redis Lua Reservations vs. Database Row Locking

### The Context
During high-concurrency flash sales (e.g. 50,000 users attempting to purchase 100 available units of a promotional item simultaneously), traditional monolithic database operations collapse under load.

### What Was Considered
1. **Pessimistic Row Locking (`SELECT ... FOR UPDATE` in PostgreSQL):**
   * *Drawback:* Causes 50,000 HTTP threads to block waiting for database connection pool sockets. Connection pool saturates instantly, causing cascading `HTTP 504 Gateway Timeout` errors and database CPU spiking to 100%.
2. **Optimistic Concurrency Control (`version` column):**
   * *Drawback:* 49,900 requests receive `StaleDataError` exceptions simultaneously and crash or require full HTTP retry loops, wasting client bandwidth and server CPU cycles.
3. **In-Memory Atomic Redis Lua Scripting (Selected Solution):**
   * *Implementation:* [`backend/app/services/inventory_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_service.py)

### The "WHY" Behind the Decision
* **Single-Threaded Execution Guarantee:** Redis executes Lua scripts sequentially in a single thread. This converts concurrent read-modify-write requests into an ordered, indivisible queue inside memory.
* **Elimination of TOC-TOU (Time-of-Check to Time-of-Use) Race Conditions:** The check (`GET stock`) and decrement (`DECRBY stock`) happen in the exact same sub-millisecond atomic CPU cycle inside Redis:
  ```lua
  local current_stock = tonumber(redis.call('GET', KEYS[1]) or '0')
  if current_stock >= requested_qty then
      redis.call('DECRBY', KEYS[1], requested_qty)
      redis.call('INCRBY', KEYS[2], requested_qty)
      return 1 -- RESERVED
  end
  return 0 -- OUT_OF_STOCK
  ```
* **Latency Reduction:** Stock check and reservation completes in $< 0.5\text{ ms}$, freeing the HTTP worker thread to process thousands of requests per second without touching disk-backed database row locks during initial reservation.

---

## 📦 2. The Transactional Outbox Pattern vs. Inline Webhook / Message Queue Publishing

### The Context
When an order is completed or stock changes locally, external systems (Shopify Admin API, fulfillment services, analytics) need to be notified in real time.

### What Was Considered
1. **Inline API Calls / Direct Message Queue Publishing in HTTP Request:**
   * *Drawback (The Dual-Write Problem):* If the local PostgreSQL transaction commits successfully, but the network connection to Shopify or RabbitMQ fails right after, the external system is never updated (data drift). Conversely, if external message publishing succeeds but PostgreSQL transaction rolls back (e.g. credit check failure), external systems act on a phantom order.

### The "WHY" Behind the Decision
* **Guaranteed Atomic Persistence (`OutboxEvent`):**
  * *Implementation:* [`backend/app/models/outbox.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outbox.py), [`backend/app/services/inventory_sync.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_sync.py)
  * By writing an `OutboxEvent` record to PostgreSQL *inside the exact same SQL transaction* as the `Order` or `Product` update, domain state changes and pending notifications either both commit or both roll back together.
* **Asynchronous Resilient Polling Daemon (`publisher.py` / `shopify_tasks.py`):**
  * Independent worker processes poll or drain pending `OutboxEvent` records (`status = PENDING`) asynchronously, handling retries, exponential backoff, and rate limits without slowing down the HTTP user checkout path.

---

## 🔄 3. Centralized `adjust_stock()` Gateway & Webhook Origin Checks

### The Context
Stock adjustments can be triggered by multiple independent channels: Web checkouts, Admin dashboard edits, Shopify customer purchases, merchant warehouse restocks, or customer order refunds.

### What Was Considered
1. **Decentralized Model Mutations:** Updating `product.available_stock` directly inside controllers, API webhooks, or background tasks whenever needed.
   * *Drawback:* Scatter-shot updates cause Redis cache keys, PostgreSQL tables, and Shopify endpoints to drift out of sync. It also introduces infinite update loops (e.g., Flash Sale updates Shopify ➔ Shopify sends webhook ➔ Webhook updates Flash Sale ➔ Flash Sale updates Shopify...).

### The "WHY" Behind the Decision
* **Single Source of Truth (`adjust_stock`):**
  * *Implementation:* [`backend/app/services/inventory_sync.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_sync.py)
  * Mandating that EVERY stock mutation routes exclusively through `inventory_sync.py:adjust_stock()` guarantees atomic row locking (`with_for_update()`), parent variant aggregation, Redis cache mirroring, and catalog cache eviction in a single audited step.
* **Origin Suppression (`_SHOPIFY_ORIGIN_SOURCES`):**
  * When an adjustment originates from a Shopify Webhook (`source="SHOPIFY"`), `adjust_stock()` explicitly suppresses outbox event generation. This cleanly terminates the event loop while keeping local databases and Redis 100% synchronized with Shopify.

---

## 💰 4. Multi-Vendor Double-Entry Escrow & Periodic Maturity Release

### The Context
In a multi-merchant marketplace, a single customer order may contain line items from multiple independent sellers. Directly crediting seller balances upon customer payment exposes the platform to financial fraud, unrecoverable chargebacks, and high return costs.

### What Was Considered
1. **Direct Immediate Payouts:** Transferring funds directly to merchant bank/stripe accounts at checkout.
   * *Drawback:* If a customer returns a defective product or opens a fraud dispute after funds are withdrawn by the seller, the platform incurs negative balances.

### The "WHY" Behind the Decision
* **Sub-Order Partitioning (`OrderSplitter`):**
  * *Implementation:* [`backend/app/services/order_splitter.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_splitter.py)
  * Parent orders are partitioned into distinct `SubOrder` records per vendor, deducting platform commission upfront (e.g. 10%).
* **Immutable Double-Entry Ledger (`LedgerEntry`):**
  * *Implementation:* [`backend/app/models/financials.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/financials.py), [`backend/app/services/escrow_engine.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/escrow_engine.py)
  * Merchant funds are initially locked in `held_escrow_balance` as `entry_type='ESCROW_HOLD'` with an automated 7-day maturity delay (`available_at = NOW() + 7 days`).
* **Automated Celery Beat Release Daemon (`release_matured_escrow_task`):**
  * *Implementation:* [`backend/app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py)
  * A daily cron job (`0 2 * * *`) safely transitions matured entries (`available_at <= NOW()`) from `HELD` to `RELEASED`, moving money to `seller.available_balance` only after the customer return window closes.

---

## ⚡ 5. Counter-Cache Denormalization (`message_count` on `Ticket`)

### The Context
Customer support agent dashboards list hundreds of active tickets, displaying metadata such as customer name, status, priority, and total message thread count.

### What Was Considered
1. **SQL Dynamic Aggregation (`SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = ...`) or ORM `len(ticket.messages)`:**
   * *Drawback (The N+1 Query Problem):* Rendering 50 tickets on a dashboard triggers 50 secondary SQL query executions, causing query latency to spike by over $+800\text{ ms}$.

### The "WHY" Behind the Decision
* **O(1) Direct Column Reads:**
  * *Implementation:* [`backend/app/customer_support/models/ticket.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/models/ticket.py), [`backend/app/customer_support/services/ticket_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/services/ticket_service.py)
  * The integer column `message_count` is denormalized directly on the `tickets` table. Every time `TicketService.add_message()` runs, `ticket.message_count` is incremented by 1 inside the same database transaction.
  * Dashboard queries read `ticket.message_count` instantly without secondary queries.

---

## 🛡️ 6. Sliding-Window Rate Limiting & Header-Based Idempotency Keys

### The Context
Flash sale start times trigger intense bot traffic, rapid page refreshes, and accidental duplicate form submissions by users clicking "Pay Now" multiple times.

### The "WHY" Behind the Decision
* **Redis ZSET Sliding-Window Algorithm (`@rate_limit`):**
  * *Implementation:* [`backend/app/api/decorators/rate_limit.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/rate_limit.py)
  * Fixed-window counters suffer from boundary spikes (double throughput allowed right at minute boundaries). Redis `ZSET` sliding windows measure true rolling request density over 60-second sliding intervals, enforcing strict caps (e.g. 10,000 req/min).
* **Distributed Lock & Response Cache (`@idempotent`):**
  * *Implementation:* [`backend/app/api/decorators/idempotent.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/idempotent.py)
  * Inspects `Idempotency-Key` headers and uses Redis `SET key "PROCESSING" NX EX 120` to block duplicate concurrent requests instantly with `HTTP 409 Conflict`. When completed, it stores the response payload so retries receive the original result without re-executing stock decrements or payment processing.

---

## 🤖 7. In-Memory Vector Cosine Similarity RAG Support Engine

### The Context
Customer support queues get flooded with repetitive policy questions during major sales, slowing down response times for genuine defects or shipping issues.

### The "WHY" Behind the Decision
* **Vector Cosine Similarity Model (`AIService`):**
  * *Implementation:* [`backend/app/customer_support/services/ai_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/services/ai_service.py)
  * Analyzes ticket query vectors $Q$ against candidate policy vector embeddings $D$:
    $$\text{Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|}$$
* **Confidence Threshold Gate ($\ge 0.85$):**
  * General policy queries matching $\ge 0.85$ confidence automatically dispatch `SYSTEM_AI_BOT` responses with policy citations.
  * Product defect queries bypass policy bots completely and are categorized as `HIGH` priority, automatically routed straight to the responsible vendor's dashboard queue.
