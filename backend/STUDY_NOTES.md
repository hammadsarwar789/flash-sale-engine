# Study Notes: High-Scale Distributed Flash Sale & Multi-Vendor Engine
## Comprehensive Technical Guide & Distributed Systems Deep Dive (Phases 1 – 11)

---

## 1. System Engineering Challenges in High-Scale Flash Sales & Marketplaces

During high-concurrency event-driven flash sales (e.g., thousands of requests per second for limited items):
1. **Database Row-Lock Contention**: Directly executing `UPDATE products SET stock = stock - 1 WHERE id = ...` causes hundreds of transactions to block on the same row lock, leading to database connection pool exhaustion and HTTP 504 Gateway Timeouts.
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
- **JSON Web Tokens (JWT)**: Stateless HMAC-SHA256 (`HS256`) tokens containing user claims (`sub`, `role`, `exp`).

---

## 3. Phase 2: Relational Data Modeling & Schemas

### 3.1 PostgreSQL Database Models
- **Location**: [`app/models/`](file:///d:/Flash%20Sale%20Engine/backend/app/models/)

| Model | File | Key Columns & Constraints | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| **`User`** | [`user.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/user.py) | `id` (UUID), `email` (Unique), `password_hash`, `role` | Identity management (`user`, `admin`, `vendor`, `stock_operator`). |
| **`Product`** | [`product.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product.py) | `id` (UUID), `sku` (Unique), `seller_id`, `total_stock`, `available_stock`, `discount_percentage` | Catalog model with **Optimistic Locking** (`version` counter) and DB Check Constraints (`available_stock >= 0`). |
| **`Order`** | [`order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order.py) | `id` (UUID), `user_id`, `status`, `idempotency_key` (Unique), `expires_at` | Order lifecycle records (`PENDING`, `PAID`, `EXPIRED`, `CANCELLED`). Unique `idempotency_key` prevents duplicate order records. |
| **`SubOrder`** | [`sub_order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/sub_order.py) | `id` (UUID), `order_id`, `seller_id`, `subtotal`, `commission_fee`, `status` | Vendor-specific order split branches for multi-seller checkouts. |
| **`LedgerEntry`** | [`ledger_entry.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/ledger_entry.py) | `id` (UUID), `seller_id`, `entry_type`, `amount`, `status`, `available_at` | Double-entry accounting ledger (`ESCROW_HOLD`, `RELEASED`, `REFUND`, `PAYOUT`). |
| **`OutboxEvent`** | [`outbox.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outbox.py) | `id` (UUID), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSON), `status` | Implements **Transactional Outbox Pattern** (`PENDING`, `PUBLISHED`, `FAILED`). |

---

## 4. Phase 3: Core Distributed Systems Patterns & Services

### 4.1 Atomic In-Memory Inventory Reservation (Redis Lua Scripting)
- **Location**: [`app/services/inventory_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_service.py)
- **Lua Stock Reservation**: Single-threaded atomic execution checking `product:{id}:stock` and transferring quantity to `product:{id}:hold`.
- **Lua Stock Release**: Atomically restores held stock back to available pool upon order cancellation or 10-minute payment expiration.

### 4.2 Transactional Outbox Pattern & Automatic Compensation
- **Location**: [`app/services/order_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_service.py)
- Executes atomic SQL transaction inserting `Order` (`PENDING`), `SubOrder` records, and `OutboxEvent` (`order.reserved`).
- Automatically calls `InventoryService.release_stock()` to compensate Redis stock if PostgreSQL transaction fails.

---

## 5. Phase 4: API Decorators & Operational Resilience

- **`@idempotent`**: Redis key `idempotency:<key>`. Locks concurrent requests (`409 Conflict`) and replays cached HTTP responses (`COMPLETED`).
- **`@rate_limit`**: Redis Sorted Set (`ZSET`) sliding-window algorithm enforcing request quotas per rolling window.
- **`@jwt_required` & `@admin_required`**: Validates Authorization Bearer header and injects claims into Flask `g`.

---

## 6. Phase 5: REST API Blueprints & OpenAPI Docs

- **Authentication (`/api/v1/auth`)**: Registration & login JWT token issuance.
- **Products (`/api/v1/products`)**: Listing, lookup, admin creation, stock warmup & reconciliation.
- **Vendor Desk (`/api/v1/vendor`)**: Onboarding applications, merchant product catalog CRUD, SKU variants, and payout requests.
- **Orders (`/api/v1/orders`)**: `POST /orders/reserve` returning `HTTP 202 Accepted`, multi-seller order splitting, payment, cancellation.
- **Health (`/api/v1/health`)**: `/live` probe and `/ready` DB & Redis probe.

---

## 7. Phase 6 & 7: Celery Workers, Outbox Relay & Escrow Release Beat Scheduler

- **Celery Tasks** ([`app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py)): Asynchronous payment gateway (`process_payment_task`), 10-minute expiry countdown timer (`schedule_order_expiry_task`), and **Automated Daily Escrow Release** (`release_matured_escrow_task`).
- **Publisher Relay Daemon** ([`app/workers/publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py)): Polling relay process pushing pending outbox events to RabbitMQ.

---

## 8. Phase 8 & 9: Multi-Vendor Marketplace & Escrow Financial Engine

### 8.1 Multi-Seller Order Splitting & Double-Entry Financial Accounting
Upon payment completion:
1. Parent `Order` is partitioned into distinct merchant `SubOrder` records per `seller_id`.
2. Escrow ledger entries are written (`entry_type='ESCROW_HOLD'`, `status='HELD'`, `amount=subtotal - commission_fee`).
3. Funds are locked for a 7-day maturity window (`available_at = NOW() + 7 days`).
4. Celery Beat executes `release_matured_escrow_task` daily at 02:00 UTC, transitioning matured holds to `RELEASED` status.

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
- Added composite database indexes:
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

## 10. Automated Test Verification & Metrics

- **Backend Pytest Suite**: **34/34 tests passing cleanly** (`34 passed in 47.22s`), including authentication, Lua Redis concurrency, order idempotency, seller escrow, Marshmallow schema validation, purchaser ticket validation, and Cosine RAG response generation.
- **Frontend TypeScript Build**: `cmd /c npx tsc --noEmit` verified with **0 errors**.
