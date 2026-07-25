# Study Notes: High-Scale Distributed Flash Sale & Inventory Reservation System
## Comprehensive Technical Guide & Distributed Systems Deep Dive (Phases 1 – 7)

---

## 1. System Engineering Challenges in Flash Sales

During high-concurrency event-driven flash sales (e.g., thousands of requests per second for limited items):
1. **Database Row-Lock Contention**: Directly executing `UPDATE products SET stock = stock - 1 WHERE id = ...` causes hundreds of transactions to block on the same row lock, leading to database connection pool exhaustion and HTTP 504 Gateway Timeouts.
2. **Race Conditions & Overselling (TOC-TOU)**: Fetching available stock (`SELECT stock`) and then updating it in two separate steps introduces a **Time-of-Check to Time-of-Use** race condition where multiple concurrent workers read stock > 0 and overcommit inventory.
3. **The Dual-Write Problem**: Attempting to write to PostgreSQL AND publish to RabbitMQ in the same HTTP request handler leads to partial failures (e.g., DB transaction commits, but network glitch causes queue publish to fail, resulting in lost events and inconsistent system state).
4. **Network Retries & Duplicate Purchases**: High-latency network spikes cause users to hit "Buy Now" multiple times, resulting in duplicate order creation without proper idempotency control.

---

## 2. Phase 1: Project Architecture & Environment Setup

### 2.1 Application Factory Pattern (`create_app`)
- **Location**: [`app/__init__.py`](file:///d:/Flash%20Sale%20Engine/app/__init__.py)
- **Concept**: Instantiates the Flask application dynamically inside a function instead of top-level module load.
- **Benefits**: Solves circular imports when registering extensions, models, and blueprints; supports isolated `TestingConfig` vs `DevelopmentConfig`.

### 2.2 Security & Authentication Foundations
- **Location**: [`app/core/security.py`](file:///d:/Flash%20Sale%20Engine/app/core/security.py)
- **Salted PBKDF2 Password Hashing**: Passwords use 16-byte random salts and 100,000 iterations of PBKDF2-HMAC-SHA256 (`salt_hex:hash_hex`). Constant-time comparison (`hmac.compare_digest`) prevents timing attacks.
- **JSON Web Tokens (JWT)**: Stateless HMAC-SHA256 (`HS256`) tokens containing user claims (`sub`, `role`, `exp`).

---

## 3. Phase 2: Relational Data Modeling & Schemas

### 3.1 PostgreSQL Database Models
- **Location**: [`app/models/`](file:///d:/Flash%20Sale%20Engine/app/models/)

| Model | File | Key Columns & Constraints | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| **`User`** | [`user.py`](file:///d:/Flash%20Sale%20Engine/app/models/user.py) | `id` (UUID), `email` (Unique), `password_hash`, `role` | Identity management (`user`, `admin`). |
| **`Product`** | [`product.py`](file:///d:/Flash%20Sale%20Engine/app/models/product.py) | `id` (UUID), `sku` (Unique), `total_stock`, `available_stock`, `version` | Product catalog with **Optimistic Locking** (`version` counter) and DB Check Constraints (`available_stock >= 0`). |
| **`Order`** | [`order.py`](file:///d:/Flash%20Sale%20Engine/app/models/order.py) | `id` (UUID), `user_id`, `product_id`, `status`, `idempotency_key` (Unique), `expires_at` | Order lifecycle records (`PENDING`, `PAID`, `EXPIRED`, `CANCELLED`). Unique `idempotency_key` prevents duplicate order records. |
| **`OutboxEvent`** | [`outbox.py`](file:///d:/Flash%20Sale%20Engine/app/models/outbox.py) | `id` (UUID), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSON), `status` | Implements **Transactional Outbox Pattern** (`PENDING`, `PUBLISHED`, `FAILED`). |
| **`TaskLog`** | [`task_log.py`](file:///d:/Flash%20Sale%20Engine/app/models/task_log.py) | `id` (UUID), `task_id`, `order_id`, `status`, `execution_time_ms` | Audit log for Celery background tasks (payments, notifications, releases). |

---

## 4. Phase 3: Core Distributed Systems Patterns & Services

### 4.1 Atomic In-Memory Inventory Reservation (Redis Lua Scripting)
- **Location**: [`app/services/inventory_service.py`](file:///d:/Flash%20Sale%20Engine/app/services/inventory_service.py)
- **Lua Stock Reservation**: Single-threaded atomic execution checking `product:{id}:stock` and transferring quantity to `product:{id}:hold`.
- **Lua Stock Release**: Atomically restores held stock back to available pool upon order cancellation or 10-minute payment expiration.

### 4.2 Transactional Outbox Pattern & Automatic Compensation
- **Location**: [`app/services/order_service.py`](file:///d:/Flash%20Sale%20Engine/app/services/order_service.py)
- Executes atomic SQL transaction inserting `Order` (`PENDING`) and `OutboxEvent` (`order.reserved`).
- Automatically calls `InventoryService.release_stock()` to compensate Redis stock if PostgreSQL transaction fails.

---

## 5. Phase 4: API Decorators & Operational Resilience

- **`@idempotent`**: Redis key `idempotency:<key>`. Locks concurrent requests (`409 Conflict`) and replays cached HTTP responses (`COMPLETED`).
- **`@rate_limit`**: Redis Sorted Set (`ZSET`) sliding-window algorithm enforcing request quotas per rolling window.
- **`@jwt_required` & `@admin_required`**: Validates Authorization Bearer header and injects claims into Flask `g`.

---

## 6. Phase 5: REST API Blueprints & OpenAPI Docs

- **Authentication (`/api/v1/auth`)**: Registration & login JWT token issuance.
- **Products (`/api/v1/products`)**: Listing, lookup, admin creation, stock warmup & reconciliation with Redis offline fallback resilience.
- **Orders (`/api/v1/orders`)**: `POST /orders/reserve` returning `HTTP 202 Accepted`, order lookup, payment, cancellation.
- **Health (`/api/v1/health`)**: `/live` probe and `/ready` DB & Redis probe.
- **OpenAPI Swagger UI**: Interactive documentation dashboard accessible at **`/docs`**.

---

## 7. Phase 6 & 7: Celery Workers, Outbox Relay & Test Verification

- **Celery Tasks** ([`app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/app/workers/tasks.py)): Asynchronous payment gateway (`process_payment_task`), 10-minute expiry countdown timer (`schedule_order_expiry_task`), and notifications (`send_notification_task`).
- **Publisher Relay Daemon** ([`app/workers/publisher.py`](file:///d:/Flash%20Sale%20Engine/app/workers/publisher.py)): Polling relay process pushing pending outbox events to RabbitMQ.
- **Automated Pytest Suite** ([`tests/`](file:///d:/Flash%20Sale%20Engine/tests/)): Integration tests for authentication, product management, order idempotency, and multi-threaded zero-overselling concurrency testing (**7 passed, 2 skipped**).
