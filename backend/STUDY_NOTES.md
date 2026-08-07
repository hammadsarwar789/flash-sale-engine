# Study Notes: High-Scale Distributed Flash Sale & Multi-Vendor Engine
## Comprehensive Technical Guide & Distributed Systems Deep Dive (Phases 1 – 11)

---

## 1. System Engineering Challenges in High-Scale Flash Sales & Marketplaces

During high-concurrency event-driven flash sales (e.g., thousands of requests per second for limited items):
1. **Database Row-Lock Contention**: Directly executing `UPDATE products SET available_stock = available_stock - 1 WHERE id = ...` causes hundreds of database connections to block on the same row lock, leading to database connection pool exhaustion and HTTP 504 Gateway Timeouts.
2. **Race Conditions & Overselling (TOC-TOU)**: Fetching available stock (`SELECT stock`) and then updating it in two separate steps introduces a **Time-of-Check to Time-of-Use** race condition where multiple concurrent workers read stock > 0 and overcommit inventory.
3. **The Dual-Write Problem**: Attempting to write to PostgreSQL AND publish to RabbitMQ in the same HTTP request handler leads to partial failures (e.g., DB transaction commits, but network glitch causes queue publish to fail, resulting in lost events and inconsistent system state).
4. **Network Retries & Duplicate Purchases**: High-latency network spikes cause users to hit "Buy Now" multiple times, resulting in duplicate order creation without proper idempotency control.
5. **Multi-Vendor Financial Escrow & N+1 Query Traps**: Splitting cart checkout across multiple merchants without automated escrow maturity locks leads to premature seller payouts, while lazy-loading support message threads introduces severe N+1 database bottlenecks.

---

## 2. Phase 1: Project Architecture & Environment Setup

### 2.1 Application Factory Pattern (`create_app`)
- **Location**: [`app/__init__.py`](file:///d:/Flash%20Sale%20Engine/backend/app/__init__.py)
- **Concept**: Instantiates the Flask application dynamically inside a function instead of top-level module load.
- **Benefits**: Solves circular imports when registering extensions, models, and blueprints; supports isolated `TestingConfig` vs `DevelopmentConfig`.

### 2.2 Security & Authentication Foundations
- **Location**: [`app/core/security.py`](file:///d:/Flash%20Sale%20Engine/backend/app/core/security.py)
- **Salted PBKDF2 Password Hashing**: Passwords use 16-byte random salts and 100,000 iterations of PBKDF2-HMAC-SHA256 (`salt_hex:hash_hex`). Constant-time comparison (`hmac.compare_digest`) prevents timing attacks.
- **JSON Web Tokens (JWT)**: Stateless HMAC-SHA256 (`HS256`) tokens containing user claims (`sub`, `role`, `user_type`, `exp`).

---

## 3. Phase 2: Relational Data Modeling & Schemas (`app/models/`)

The platform's relational layer is built on PostgreSQL with SQLAlchemy ORM, enforcing strict data integrity, optimistic locking, check constraints, and audit trails:

| Model | File | Key Columns & Constraints | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| **`User`** | [`user.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/user.py) | `id` (UUID), `email` (Unique), `password_hash`, `role`, `user_type`, `status` | Identity management (`customer`, `admin`, `vendor`, `outlet_manager`, `stock_operator`). |
| **`Seller`** | [`seller.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/seller.py) | `id` (UUID), `user_id`, `store_name`, `status`, `available_balance`, `held_escrow_balance` | Merchant store profiles, business registration, tax IDs, KYC state, and double-entry balances. |
| **`Tenant` & `Outlet`** | [`tenant.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/tenant.py) | `id`, `code`, `name`, `is_hq`, `tenant_id` | Multi-tenant hierarchy and brick-and-mortar store branch modeling. |
| **`OutletInventory`** | [`outlet_inventory.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outlet_inventory.py) | `outlet_id`, `product_id`, `available_stock`, `reorder_level` | Branch-specific stock levels supporting inter-outlet stock transfers. |
| **`Product`** | [`product.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product.py) | `id` (UUID), `sku` (Unique), `seller_id`, `total_stock`, `available_stock`, `version` | Catalog model with **Optimistic Locking** (`version` counter) and DB Check Constraints (`available_stock >= 0`). |
| **`ProductVariant`** | [`product_variant.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product_variant.py) | `id` (UUID), `product_id`, `sku`, `color`, `size`, `available_stock`, `price` | Variant matrix modeling color/size combinations with dedicated stock pools. |
| **`Category`** | [`category.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/category.py) | `id` (UUID), `name`, `slug`, `parent_id` | Hierarchical product classification taxonomy. |
| **`Cart` & `CartItem`** | [`cart.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/cart.py) | `user_id`, `product_id`, `variant_id`, `quantity`, `reserved_until` | Multi-seller cart state with hold expiry countdown tracking. |
| **`Order`** | [`order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order.py) | `id` (UUID), `user_id`, `status`, `idempotency_key` (Unique), `expires_at` | Order lifecycle records (`PENDING`, `RESERVED`, `PAID`, `CANCELLED`, `EXPIRED`, `REFUNDED`). |
| **`SubOrder`** | [`sub_order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/sub_order.py) | `id` (UUID), `order_id`, `seller_id`, `subtotal`, `commission_amount`, `status` | Merchant-specific sub-order split records for multi-seller checkouts. |
| **`OrderItem`** | [`order_item.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order_item.py) | `order_id`, `sub_order_id`, `product_id`, `variant_id`, `unit_price`, `quantity` | Itemized order lines snapshot at purchase time. |
| **`LedgerEntry`** | [`financials.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/financials.py) | `id` (UUID), `seller_id`, `entry_type`, `amount`, `status`, `available_at` | Double-entry accounting ledger (`ESCROW_HOLD`, `RELEASED`, `REFUND`, `PAYOUT`). |
| **`OutboxEvent`** | [`outbox.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outbox.py) | `id` (UUID), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSON), `status` | Implements **Transactional Outbox Pattern** (`PENDING`, `PUBLISHED`, `FAILED`). |
| **`Coupon` & `Redemption`** | [`coupon.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/coupon.py) | `code`, `discount_type`, `discount_value`, `max_redemptions`, `redemption_count` | Promotional coupon rules engine with account and global usage caps. |
| **`Review`** | [`review.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/review.py) | `user_id`, `product_id`, `rating`, `comment`, `is_verified_buyer` | Customer reviews gated by verified order delivery checks. |
| **`Wishlist`** | [`wishlist.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/wishlist.py) | `user_id`, `product_id` | Customer product bookmarks. |
| **`Logistics`** | [`logistics.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/logistics.py) | `order_id`, `tracking_number`, `carrier`, `status` | Shipment dispatch tracking and courier webhook status updates. |
| **`ReturnRequest` & `Dispute`** | [`return_request.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/return_request.py), [`dispute.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/dispute.py) | `order_id`, `reason`, `status`, `resolution_type` | Return request inspection and vendor dispute resolution workflow. |
| **`Approval`** | [`approval.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/approval.py) | `request_type`, `applicant_email`, `status`, `target_outlet_id` | Multi-stage onboarding queue (`VENDOR_REGISTRATION`, `MANAGER_ONBOARDING`, `STAFF_ONBOARDING`). |
| **`TaskLog`** | [`task_log.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/task_log.py) | `task_id`, `task_name`, `status`, `execution_time_ms` | Async Celery background worker execution audit trail. |
| **`Ticket` & `TicketMessage`** | [`ticket.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/models/ticket.py) | `id`, `customer_id`, `vendor_id`, `status`, `message_count`, `assigned_agent_id` | Customer support ticket system featuring composite indexes and message counter cache. |

---

## 4. Phase 3: Core Distributed Systems Patterns & Services

### 4.1 Atomic In-Memory Inventory Reservation (Redis Lua Scripting)
- **Location**: [`app/services/inventory_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_service.py)
- **`LUA_RESERVE_STOCK`**: Single-threaded atomic execution checking `product:{id}:stock` and transferring quantity to `product:{id}:hold`.
- **`LUA_RELEASE_STOCK`**: Atomically restores held stock back to available pool upon order cancellation or 10-minute payment expiration.
- **`LUA_RESERVE_MULTI_STOCK`**: Atomically reserves stock across multi-item cart checkouts in a single Redis script call.
- **DB Fallback Mode**: Uses `db.session.query(Product).with_for_update()` pessimistic row locks if Redis connection is unavailable.

### 4.2 Transactional Outbox Pattern & Automatic Compensation
- **Location**: [`app/services/order_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_service.py)
- Executes atomic SQL transaction inserting `Order` (`PENDING`), `SubOrder` records, and `OutboxEvent` (`order.reserved`).
- Solves the dual-write problem by writing domain entities and outbox events in a single PostgreSQL transaction.
- Automatically calls `InventoryService.release_stock()` to compensate Redis stock if the database transaction fails.

---

## 5. Phase 4: API Decorators & Operational Resilience

- **`@idempotent`** ([`app/api/decorators/idempotent.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/idempotent.py)): Redis key `idempotency:<key>`. Rejects concurrent duplicate requests (`409 Conflict`) and replays cached HTTP responses (`COMPLETED`).
- **`@rate_limit`** ([`app/api/decorators/rate_limit.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/rate_limit.py)): Redis Sorted Set (`ZSET`) sliding-window algorithm enforcing request quotas (`limit=10000, period=60`) per user/IP.
- **`@jwt_required` & `@require_permission`** ([`app/api/decorators/auth.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/auth.py), [`app/core/authorization.py`](file:///d:/Flash%20Sale%20Engine/backend/app/core/authorization.py)): Validates Authorization Bearer header, injects claims into Flask `g`, and enforces 9+ permission codes (`outlet:stock:read/write`, `enterprise:roles:read/write/assign`, `enterprise:orders:manage`, etc.).

---

## 6. Phase 5: REST API Endpoint Directory (`app/api/v1/`)

- **Authentication (`/api/v1/auth`)**: Account registration (customer, staff, manager, vendor), login JWT issuance, password reset, email verification.
- **Products (`/api/v1/products`)**: Listing, lookup, category filtering, admin creation, Redis stock warmup (`/warmup`), DB stock reconciliation (`/reconcile`).
- **Cart (`/api/v1/cart`)**: View cart, add item with Redis hold, update quantity, remove item with stock release.
- **Orders (`/api/v1/orders`)**: `POST /orders/reserve` (`HTTP 202 Accepted`), `POST /orders/checkout`, `POST /orders/guest-checkout`, order cancellation, payment processing.
- **Merchant Portal (`/api/v1/vendor`)**: Onboarding state, store product catalog CRUD, variant matrix, store analytics, financial ledger, payout requests.
- **Enterprise Admin (`/api/v1/admin`)**: Onboarding approval queue (`VENDOR_REGISTRATION`, `MANAGER_ONBOARDING`, `STAFF_ONBOARDING`), user deletion, custom role generator, coupon management, telemetry.
- **Dynamic Roles (`/api/v1/roles`)**: Enterprise role definition and permission code assignment.
- **Commerce & Logistics (`/api/v1/commerce`, `/api/v1/logistics`)**: Verified reviews, wishlist toggle, shipment tracking, return requests.
- **Support Desk (`/api/v1/support`)**: Customer tickets, agent assignment, AI RAG suggested reply generation, message threads.
- **Health Probes (`/api/v1/health`)**: Liveness probe (`/live`) and readiness probe (`/ready` checking DB + Redis).

---

## 7. Phase 6 & 7: Celery Workers, Outbox Relay & Escrow Release Beat Scheduler

- **Celery Async Tasks** ([`app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py)):
  - `process_payment_task`: Asynchronous payment processing gateway.
  - `schedule_order_expiry_task`: 10-minute order reservation expiration task.
  - `release_matured_escrow_task`: **Automated Daily Escrow Release** running daily via Celery Beat at 02:00 UTC.
- **Publisher Relay Daemon** ([`app/workers/publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py)): Polling relay process pushing pending outbox events from `OutboxEvent` table to RabbitMQ.

---

## 8. Phase 8 & 9: Multi-Vendor Marketplace & Escrow Financial Engine

### 8.1 Multi-Seller Order Splitting & Double-Entry Accounting
Upon payment completion:
1. Parent `Order` is partitioned into distinct merchant `SubOrder` records per `seller_id`.
2. Escrow ledger entries are written (`entry_type='ESCROW_HOLD'`, `status='HELD'`, `amount = subtotal - commission_amount`).
3. Funds are locked for a 7-day maturity window (`available_at = NOW() + 7 days`).
4. Celery Beat executes `release_matured_escrow_task` daily, transitioning matured holds to `RELEASED` status and updating `seller.available_balance`.
5. Refunds trigger `REFUND` ledger entries and automatically reverse held escrow funds.

---

## 9. Phase 10 & 11: Dedicated Customer Support & Vector RAG AI Engine

### 9.1 Module Layout (`backend/app/customer_support/`)
```text
backend/app/customer_support/
├── __init__.py
├── api/
│   └── v1/
│       └── support.py          # REST endpoints (/tickets, /reply, /assign, /status, /suggest-reply)
├── models/
│   ├── ticket.py               # Ticket (with composite indexes) & TicketAI models
│   └── ticket_message.py       # TicketMessage model
├── schemas/
│   └── ticket_schema.py        # Marshmallow validation schemas
├── services/
│   ├── ai_service.py           # Vector Cosine Similarity RAG engine & sentiment detection
│   └── ticket_service.py       # Ticket lifecycle, purchaser validation & vendor isolation RBAC
└── workers/
    └── ai_tasks.py             # Asynchronous Celery workers for AI dispatch & auto-reply
```

### 9.2 Key Technical Architecture Highlights

#### 1. Purchaser-Only Ticket Validation
- `TicketService.create_ticket()` verifies `Order.filter_by(user_id=customer_id)` before ticket creation.
- Non-purchasing users receive an HTTP `403 Forbidden` error.

#### 2. N+1 Query Trap Elimination & Composite Indexing
- Added `message_count` column (`db.Integer, default=1`) to `Ticket` model to eliminate lazy `len(self.messages)` database queries during list operations.
- Composite database indexes:
  - `idx_tickets_customer_status` (`customer_id`, `status`)
  - `idx_tickets_agent_status` (`assigned_agent_id`, `status`)
  - `idx_tickets_status_updated` (`status`, `updated_at`)

#### 3. Vector Cosine Similarity RAG Search Engine
- `AIService.generate_rag_suggested_reply()` computes term frequency vector embeddings for customer queries and platform policy documentation:
  $$\text{Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|}$$
- Returns grounded answer drafts with confidence metrics and source document citations.

#### 4. AI First-Line Auto-Responder (`SYSTEM_AI_BOT`)
- `process_new_ticket_task` automatically replies to general/policy queries when RAG confidence $\ge 0.85$, setting ticket status to `WAITING_CUSTOMER`.
- Product/order defect tickets are automatically routed to the specific seller's `vendor_id` at `HIGH` priority.

#### 5. Domain-Level RBAC & Closed Ticket Message Blocking
- **Role-Gated State Machine**: Customers can only set status to `CLOSED` (canceling own ticket). Returns `403 Forbidden` if customer attempts to mark status as `RESOLVED`.
- **Closed Ticket Lockout**: `TicketService.add_message()` blocks replies on `CLOSED` or `RESOLVED` tickets, protecting conversation integrity.
- **Vendor Store Isolation**: Merchants query tickets filtered by `vendor_id`, while Admins retain global oversight across all stores.

---

## 10. Server Deployment & Process Topology

- **WSGI Master Server** ([`gunicorn.conf.py`](file:///d:/Flash%20Sale%20Engine/backend/gunicorn.conf.py)): Gunicorn process manager running `gthread` worker pool (CPU cores $\times 2 + 1$ workers, 2 threads per worker).
- **Entry Point** ([`wsgi.py`](file:///d:/Flash%20Sale%20Engine/backend/wsgi.py)): Standard WSGI entry point invoking `create_app()`.
- **Background Daemons**:
  - `celery -A wsgi.celery_app worker -l info`
  - `celery -A wsgi.celery_app beat -l info`
  - `python -m app.workers.publisher`

---

## 11. Automated Test Verification & Metrics

- **Backend Pytest Suite**: **41/41 passing tests cleanly** (`41 passed in 60.91s`), including authentication, Lua Redis concurrency, order idempotency, seller escrow, Marshmallow schema validation, purchaser ticket validation, and Cosine RAG response generation.
- **Frontend TypeScript Build**: `cmd /c npx tsc --noEmit` verified with **0 errors**.
