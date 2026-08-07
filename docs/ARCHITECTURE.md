# 🏛️ System Architecture & Distributed Engineering Trade-Offs

## 1. High-Scale Engineering Challenges & Design Trade-Offs

During high-concurrency event-driven flash sales (thousands of requests per second targeting limited inventory), standard monolithic patterns break down:

### 1.1 Database Row-Lock Contention vs. In-Memory Atomic Scripting
* **The Problem:** Executing standard SQL updates (`UPDATE products SET available_stock = available_stock - 1 WHERE id = ...`) causes hundreds of concurrent database connections to queue on the exact same row lock. This leads to connection pool saturation, thread starvation, and `HTTP 504 Gateway Timeout` errors.
* **The Solution:** We offload high-frequency stock check-and-decrement operations to **Redis in-memory Lua scripts** (`LUA_RESERVE_STOCK`). Because Redis executes scripts single-threaded, stock reservations complete in sub-millisecond time ($< 1\text{ ms}$) without acquiring SQL database locks during the initial HTTP request.

### 1.2 TOC-TOU (Time-of-Check to Time-of-Use) Race Conditions
* **The Problem:** Reading stock in application memory (`SELECT available_stock FROM products`) followed by an update (`UPDATE products SET available_stock = available_stock - 1`) introduces a race condition where multiple concurrent workers read `available_stock > 0` simultaneously, leading to negative inventory and severe overselling.
* **The Solution:** Atomic Lua scripting combines check and mutation into an indivisible operation within Redis:
  ```lua
  local current_stock = tonumber(redis.call('GET', stock_key) or '0')
  if current_stock >= requested_qty then
      redis.call('DECRBY', stock_key, requested_qty)
      redis.call('INCRBY', hold_key, requested_qty)
      return 1 -- SUCCESS
  else
      return 0 -- ERR_OUT_OF_STOCK
  end
  ```

---

## 2. The Transactional Outbox Pattern

Attempting to write to PostgreSQL AND publish an event to RabbitMQ within an HTTP request handler creates the **Dual-Write Problem**: if the database transaction commits but the network glitches before queue publishing, event state becomes inconsistent.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database Transaction                       │
│                                                                             │
│   1. INSERT INTO orders (id, status, ...) VALUES (...);                     │
│   2. INSERT INTO sub_orders (id, seller_id, ...) VALUES (...);              │
│   3. INSERT INTO outbox_events (aggregate_type, event_type, payload, status)│
│      VALUES ('Order', 'order.reserved', '{...}', 'PENDING');                │
│                                                                             │
│   4. COMMIT TRANSACTION; (Both Domain State & Event are atomically saved)  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Async Polling Daemon (publisher.py)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Outbox Publisher Daemon Process                        │
│                                                                             │
│   1. SELECT * FROM outbox_events WHERE status = 'PENDING' LIMIT 100;        │
│   2. Publish payload to RabbitMQ Exchange ('flash_events');                │
│   3. UPDATE outbox_events SET status = 'PUBLISHED' WHERE id = ...;          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Location**: [`backend/app/services/order_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_service.py) and [`backend/app/workers/publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py)
- **Automatic Compensation:** If the database transaction fails for any reason during commit, `OrderService` invokes `InventoryService.release_stock()` to immediately restore the held Redis stock back to the available pool.

---

## 3. Multi-Vendor Financial Escrow Lifecycle

In a multi-merchant marketplace, cart checkouts contain items originating from different independent sellers. The platform enforces strict sub-order partitioning and double-entry escrow tracking:

```text
[ Customer Checkout ] ──► Parent Order ($200.00)
                              │
                              ├──► SubOrder 1 (Merchant A: $120.00)
                              │     └── LedgerEntry: ESCROW_HOLD ($108.00, 10% commission deducted)
                              │         Maturity: NOW() + 7 Days
                              │
                              └──► SubOrder 2 (Merchant B: $80.00)
                                    └── LedgerEntry: ESCROW_HOLD ($72.00, 10% commission deducted)
                                        Maturity: NOW() + 7 Days
```

### Escrow State Machine
1. **Order Payment:** Parent `Order` payment triggers `OrderSplitter` to create seller `SubOrder` records.
2. **Escrow Hold Entry:** `EscrowEngine.hold_funds()` creates a double-entry `LedgerEntry` (`entry_type='ESCROW_HOLD'`, `status='HELD'`, `available_at = NOW() + 7 days`).
3. **Maturity Delay Window:** Funds remain locked in `held_escrow_balance` for 7 days to cover potential customer return or dispute requests.
4. **Celery Beat Periodic Release:** Daily at 02:00 UTC, `release_matured_escrow_task` queries:
   ```sql
   SELECT * FROM ledger_entries 
   WHERE entry_type = 'ESCROW_HOLD' 
     AND status = 'HELD' 
     AND available_at <= NOW();
   ```
   Matured entries transition to `RELEASED`, transferring the net amount into the merchant's `available_balance`.
5. **Refund Reversals:** Authorized returns trigger `EscrowEngine.process_refund()`, writing a `REFUND` ledger entry and deducting held funds before release.

---

## 4. Vector Cosine Similarity RAG Support Engine

The customer support module ([`backend/app/customer_support/services/ai_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/services/ai_service.py)) integrates an in-memory Retrieval-Augmented Generation (RAG) vector engine to analyze customer ticket descriptions against platform documentation.

### 4.1 Vector Cosine Similarity Formula
The engine constructs term-frequency vector embeddings for the customer query $Q$ and candidate document vector $D$:

$$\text{Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|} = \frac{\sum_{i=1}^{n} Q_i D_i}{\sqrt{\sum_{i=1}^{n} Q_i^2} \sqrt{\sum_{i=1}^{n} D_i^2}}$$

### 4.2 Automated Response Thresholds & Workflow
- **Confidence Threshold ($\ge 0.85$):** If similarity score $\ge 0.85$ on general policy queries, `process_new_ticket_task` automatically dispatches `SYSTEM_AI_BOT` response, attaching policy citations and updating ticket status to `WAITING_CUSTOMER`.
- **Product Defect Auto-Routing:** Tickets containing defect or damage keywords are categorized at `HIGH` priority and routed directly to the specific seller's `vendor_id` queue.
- **Purchaser-Only Gating:** `TicketService.create_ticket()` verifies `Order.filter_by(user_id=customer_id)` prior to ticket creation, blocking non-purchasing users (`HTTP 403 Forbidden`).
