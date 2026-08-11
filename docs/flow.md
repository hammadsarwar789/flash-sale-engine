# 🔀 System Execution Flow & Code Tracing (`flow.md`)

This document traces **EXACTLY** how execution moves between frontend callers, HTTP API endpoints, service layer functions, Redis scripts, database transactions, background workers, and webhooks across the **Flash Sale Engine**.

---

## ⚡ Flow 1: Flash Sale High-Speed Item Reservation & Checkout

Traces what happens when a customer clicks **"Buy Now"** during a high-concurrency event.

```text
[ React Client ]
       │
       │ POST /api/v1/orders/reserve (Idempotency-Key: "idemp_8f92a")
       ▼
[ app/api/v1/orders.py:create_order() ]
       │
       ├─► 1. [@idempotent] Check Redis key `idempotency:idemp_8f92a`
       │      └─► Exec: `SET idempotency:idemp_8f92a "PROCESSING" NX EX 120`
       │
       ├─► 2. [@rate_limit] Sliding window check on IP/User ZSET
       │      └─► Exec: `ZREM...`, `ZADD...`, `ZCARD rate_limit:user_123`
       │
       ├─► 3. [app/services/inventory_service.py:reserve_stock()]
       │      └─► Execute Single-Threaded Redis Lua Script: `LUA_RESERVE_STOCK`
       │          • Input: KEYS[1]="product:p99:stock", KEYS[2]="product:p99:hold", ARGV[1]="1"
       │          • Check: `GET product:p99:stock` >= 1
       │          • Decrement: `DECRBY product:p99:stock 1`
       │          • Increment: `INCRBY product:p99:hold 1`
       │          • Result: Returns 1 (SUCCESS)
       │
       ├─► 4. [app/services/order_service.py:create_order()]
       │      └─► Open PostgreSQL Transaction:
       │          • `INSERT INTO orders (id, user_id, status='PENDING', expires_at=NOW()+10min)...`
       │          • `INSERT INTO order_items (order_id, product_id, quantity=1, price)...`
       │          • `INSERT INTO outbox_events (aggregate_type='ORDER', event_type='ORDER_RESERVED')...`
       │          • `COMMIT TRANSACTION;`
       │          └─► (If DB Exception occurs: triggers compensation `release_stock()` back to Redis)
       │
       ├─► 5. [app/workers/tasks.py:schedule_order_expiry_task.apply_async()]
       │      └─► Enqueue Celery delayed task with `eta = NOW() + 10 minutes`
       │
       ▼
[ HTTP 201 Created Response ] ➔ Returns `{ order_id: "ord_5510", expires_at: "..." }`
```

### Detailed File & Line Map for Flow 1
1. **HTTP Controller Handler:** [`create_order()`](file:///d:/Flash%20Sale%20Engine/backend/app/api/v1/orders.py#L42-L115) in `app/api/v1/orders.py`
2. **Idempotency Guard:** [`idempotent_guard()`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/idempotent.py#L18-L60) in `app/api/decorators/idempotent.py`
3. **Sliding-Window Rate Limiter:** [`rate_limit_guard()`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/rate_limit.py#L15-L55) in `app/api/decorators/rate_limit.py`
4. **Redis Lua Inventory Reserve:** [`reserve_stock()`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_service.py#L85-L125) in `app/services/inventory_service.py`
5. **Database Transaction & Order Write:** [`create_order()`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_service.py#L110-L210) in `app/services/order_service.py`
6. **Async Expiry Scheduler:** [`schedule_order_expiry_task`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py#L45-L75) in `app/workers/tasks.py`

---

## 🛍️ Flow 2: Bidirectional Shopify Inventory & Webhook Sync

Traces how inventory changes in Shopify update Flash Sale Engine, and vice versa.

### Flow 2A: Shopify Purchase ➔ Flash Sale Engine Sync (Incoming Webhook)

```text
[ Shopify Admin Platform ]
       │
       │ POST /api/v1/webhooks/shopify/orders/create (X-Shopify-Hmac-SHA256: "...")
       ▼
[ app/api/v1/shopify_webhooks.py:handle_shopify_order_webhook() ]
       │
       ├─► 1. Verify HMAC Signature using `SHOPIFY_WEBHOOK_SECRET`
       │      └─► If invalid: Return `HTTP 401 Unauthorized`
       │
       ├─► 2. Extract Shopify `inventory_item_id` & `quantity` sold
       │
       ├─► 3. [app/services/inventory_sync.py:adjust_stock()]
       │      │  Params: target_id="p99", delta=-2, reason="SHOPIFY_ORDER_PLACED", source="SHOPIFY"
       │      │
       │      ├─► Lock SQL Row: `db.session.query(Product).filter_by(id='p99').with_for_update()`
       │      ├─► Update SQL: `Product.available_stock = current_stock - 2`
       │      ├─► Check Source: `source == "SHOPIFY"` ➔ DO NOT create OutboxEvent (Loop Suppression)
       │      ├─► Commit SQL: `db.session.commit()`
       │      ├─► Mirror to Redis: `redis_client.set("product:p99:stock", new_qty)`
       │      └─► Invalidate Catalog Cache: `redis_client.delete("catalog:default")`
       │
       ▼
[ HTTP 200 OK Response ] ➔ Acknowledges Shopify Webhook
```

### Flow 2B: Local Admin Restock ➔ Push to Shopify API (Outbox Drainage)

```text
[ Admin Dashboard ]
       │
       │ PUT /api/v1/products/p99/stock (Qty: +50)
       ▼
[ app/api/v1/products.py:update_product_stock() ]
       │
       ├─► 1. [app/services/inventory_sync.py:adjust_stock()]
       │      │  Params: target_id="p99", delta=+50, reason="ADMIN_STOCK_EDIT", source="ADMIN"
       │      │
       │      ├─► Lock SQL Row & update: `Product.available_stock = current_stock + 50`
       │      ├─► Check Source: `source == "ADMIN"` ➔ CREATE OutboxEvent:
       │      │   `INSERT INTO outbox_events (aggregate_type='PRODUCT', event_type='INVENTORY_ADJUSTED', payload={...})`
       │      ├─► Commit SQL
       │      ├─► Mirror to Redis: `redis_client.set("product:p99:stock", new_qty)`
       │      └─► Immediate Outbox Kick + Background Poller Fallback:
       │          ├─► Immediate: [app/workers/shopify_tasks.py:drain_outbox_events()]
       │          └─► Poller Thread (every 30s): [app/workers/shopify_tasks.py:_outbox_poller_loop()]
       │
       ▼
[ app/workers/shopify_tasks.py:drain_outbox_events() ]
       │
       ├─► Query: `SELECT * FROM outbox_events WHERE status='PENDING' ORDER BY id ASC LIMIT 50`
       ├─► For each event:
       │   └─► Send GraphQL/REST HTTP call to Shopify API:
       │       `POST https://flash-sale-21466.myshopify.com/admin/api/2024-01/inventory_levels/set.json`
       ├─► Mark Event Complete: `UPDATE outbox_events SET status='PUBLISHED' WHERE id=...`
       └─► Commit SQL
```

### Detailed File & Line Map for Flow 2
1. **Shopify Webhook Gateway:** [`handle_shopify_order_webhook()`](file:///d:/Flash%20Sale%20Engine/backend/app/api/v1/shopify_webhooks.py#L30-L85) in `app/api/v1/shopify_webhooks.py`
2. **Central Sync Gateway:** [`adjust_stock()`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_sync.py#L36-L175) in `app/services/inventory_sync.py`
3. **Outbox Model:** [`OutboxEvent`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outbox.py#L12-L40) in `app/models/outbox.py`
4. **Outbox Worker Task & Poller:** [`drain_outbox_events()`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/shopify_tasks.py#L104-L163) and [`start_outbox_poller()`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/shopify_tasks.py#L36-L45) in `app/workers/shopify_tasks.py`

---

## 💳 Flow 3: Payment Gateway Processing & Seller Escrow Release Lifecycle

Traces customer payment processing, vendor order splitting, escrow balance holds, and periodic fund release.

```text
[ Payment Webhook / Client Gateway ]
       │
       │ POST /api/v1/commerce/payments/process (order_id: "ord_5510")
       ▼
[ app/workers/tasks.py:process_payment_task() ]
       │
       ├─► 1. Verify Payment Status with Stripe/Gateway API
       │
       ├─► 2. Transition Parent Order: `Order.status = 'PAID'`
       │
       ├─► 3. [app/services/order_splitter.py:split_order()]
       │      └─► Group `order_items` by `seller_id`
       │          For each seller:
       │          • `INSERT INTO sub_orders (id, order_id, seller_id, subtotal, commission_amount, status='PAID')...`
       │
       ├─► 4. [app/services/escrow_engine.py:hold_funds()]
       │      └─► For each `SubOrder`:
       │          • Net payout = `subtotal - commission_amount`
       │          • `INSERT INTO ledger_entries (seller_id, sub_order_id, entry_type='ESCROW_HOLD', amount=net, status='HELD', available_at=NOW()+7days)...`
       │          • `UPDATE sellers SET held_escrow_balance = held_escrow_balance + net WHERE id=...`
       │
       ├─► 5. Commit SQL Transaction & Write `TaskLog` entry
       │
       ▼
[ Celery Beat Periodic Scheduler ] (Daily at 02:00 UTC)
       │
       │ Triggers `app/workers/tasks.py:release_matured_escrow_task()`
       ▼
[ app/workers/tasks.py:release_matured_escrow_task() ]
       │
       ├─► 1. Query: `SELECT * FROM ledger_entries WHERE entry_type='ESCROW_HOLD' AND status='HELD' AND available_at <= NOW()`
       │
       ├─► 2. For each matured entry:
       │      • `UPDATE ledger_entries SET status='RELEASED' WHERE id=...`
       │      • `UPDATE sellers SET held_escrow_balance = held_escrow_balance - amount, available_balance = available_balance + amount WHERE id=...`
       │
       └─► 3. Commit SQL Transaction
```

### Detailed File & Line Map for Flow 3
1. **Payment Celery Task:** [`process_payment_task()`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py#L80-L130) in `app/workers/tasks.py`
2. **Sub-Order Partitioning:** [`split_order()`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_splitter.py#L20-L75) in `app/services/order_splitter.py`
3. **Escrow Engine:** [`hold_funds()`](file:///d:/Flash%20Sale%20Engine/backend/app/services/escrow_engine.py#L25-L60) in `app/services/escrow_engine.py`
4. **Financial Ledger Model:** [`LedgerEntry`](file:///d:/Flash%20Sale%20Engine/backend/app/models/financials.py#L15-L50) in `app/models/financials.py`
5. **Periodic Release Scheduler:** [`release_matured_escrow_task()`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py#L135-L180) in `app/workers/tasks.py`

---

## 🤖 Flow 4: Support AI Vector Cosine RAG & Vendor Queue Dispatch

Traces customer ticket submission, vector similarity analysis, and auto-triage.

```text
[ Customer Support Portal ]
       │
       │ POST /api/v1/support/tickets (customer_id: "user_77", message: "Item arrived broken")
       ▼
[ app/api/v1/support.py:create_ticket() ]
       │
       ├─► 1. [app/customer_support/services/ticket_service.py:create_ticket()]
       │      ├─► Gate Check: Verify `Order.filter_by(user_id='user_77')` exists. (If none ➔ HTTP 403)
       │      ├─► `INSERT INTO tickets (id, customer_id, subject, status='OPEN', message_count=1)...`
       │      ├─► `INSERT INTO ticket_messages (ticket_id, sender_id, message_body)...`
       │      └─► Commit SQL
       │
       ├─► 2. Dispatch Async Celery Task: `process_new_ticket_task.delay(ticket_id)`
       │
       ▼
[ app/workers/tasks.py:process_new_ticket_task() ]
       │
       ├─► 1. [app/customer_support/services/ai_service.py:generate_rag_suggested_reply()]
       │      ├─► Calculate Cosine Similarity against KB embeddings:
       │      │   `Similarity(Q, D) = (Q • D) / (||Q|| ||D||)`
       │      │
       │      ├─► Check Keywords: Matches ["broken", "defect", "damaged"]
       │      │   └─► Priority set to `HIGH`
       │      │   └─► Target Vendor resolved from order line item: `vendor_id = "seller_99"`
       │      │
       │      └─► Check Similarity Threshold:
       │          ├─► If Policy query & Similarity >= 0.85:
       │          │   • Create automated reply `SYSTEM_AI_BOT`
       │          │   • Update `ticket.status = 'WAITING_CUSTOMER'`
       │          │
       │          └─► If Defect / Low Similarity:
       │              • Route directly to Vendor Queue: `ticket.assigned_vendor_id = 'seller_99'`
       │              • Update `ticket.status = 'OPEN'`
       │
       └─► 2. Commit SQL Transaction
```

### Detailed File & Line Map for Flow 4
1. **Support Controller:** [`create_ticket()`](file:///d:/Flash%20Sale%20Engine/backend/app/api/v1/support.py#L25-L65) in `app/api/v1/support.py`
2. **Ticket Service:** [`create_ticket()`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/services/ticket_service.py#L30-L80) in `app/customer_support/services/ticket_service.py`
3. **AI Vector RAG Engine:** [`generate_rag_suggested_reply()`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/services/ai_service.py#L40-L110) in `app/customer_support/services/ai_service.py`
4. **Celery Worker Auto-Responder:** [`process_new_ticket_task()`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py#L185-L230) in `app/workers/tasks.py`
