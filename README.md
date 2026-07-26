# High-Scale E-Commerce & Distributed Flash Sale Engine Backend

A production-grade, event-driven e-commerce platform and inventory reservation engine engineered to handle extreme concurrent traffic during flash sale events. Built with **Flask 3.x**, **Flask-Smorest / Marshmallow**, **PostgreSQL**, **Redis**, **RabbitMQ**, and **Celery**, this platform delivers a full-featured e-commerce suite—including multi-item shopping carts with per-variant purchasing, product catalog depth with hierarchical categories and SKU variants, order fulfillment lifecycle tracking, Stripe PaymentIntents & signature-verified webhooks, guest checkout, automated sales tax calculation, promo coupons, customer reviews, and wishlists.

---

## Architecture Overview & Core Design Patterns

During high-concurrency flash sales, hitting a relational database directly for inventory checks leads to row locks, connection pool exhaustion, and latency spikes. This system decouples high-throughput inventory allocation from database persistence using a multi-tiered architecture:

```text
                             [ REST Clients / API Consumers / Mobile Apps ]
                                                    │
                                      POST /api/v1/orders/checkout
                                     (Header: Idempotency-Key)
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Flask REST Gateway Layer                                   │
│  1. Validate JWT Auth & Rate Limit (Redis Sliding Window Decorator)                         │
│  2. Check/Set Idempotency state in Redis (Flask Custom Before-Request Decorator)            │
│  3. Execute Atomic Multi-SKU Inventory Decrement & Hold via Redis Lua Script                │
│  4. Open Postgres Transaction: Insert Order + OrderItems + Outbox Event                      │
│  5. Commit DB Transaction & Return HTTP 202 Accepted + Reservation Payload                 │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                 Transactional Outbox Pattern
                                  (Postgres Outbox Publisher)
                                               │
                                               ▼
                               ┌───────────────────────────────┐
                               │ Outbox Publisher Relay Service│
                               └───────────────┬───────────────┘
                                               │
                                 Publish Event (order.reserved)
                                               │
                                               ▼
                               ┌───────────────────────────────┐
                               │    RabbitMQ Message Broker    │
                               │  (With Dead Letter Exchange)  │
                               └───────────────┬───────────────┘
                                               │
                                 Consume Event (At-Least-Once)
                                               │
                                               ▼
                               ┌───────────────────────────────┐
                               │    Celery Async Worker Pool   │
                               │  - Stripe Payment Intent      │
                               │  - Email & Notification       │
                               │  - 10-Min Expiry & Stock Auto-│
                               │    Restoration Timer          │
                               └───────────────┬───────────────┘
```

### Key Distributed Systems & E-Commerce Patterns Implemented

1. **Per-Variant Stock Isolation & Purchasing Integration**: Both `cart_items` and `order_items` link directly to specific SKU variants via `variant_id`. `InventoryService` generates independent stock keys (`variant:<variant_id>:stock`), isolating variant inventory so selling out "Red / Large" decrements only that variant's pool without blocking "Red / Small".
2. **Atomic Multi-SKU In-Memory Reservations (Redis Lua Scripting)**: Reads, validates, and decrements stock counters for multiple cart items and variants atomically in Redis, preventing race conditions and overselling without database row locking.
3. **Automated Sales Tax Calculation Engine**: `OrderService` calculates an 8% sales tax automatically during checkout (`tax = round(subtotal * 0.08, 2)`), computing `subtotal`, `tax`, and `total_amount`.
4. **Transactional Outbox Pattern**: Writes order entities, order line items, and outbox event records into PostgreSQL within the same atomic SQL transaction. A background publisher relay polls outbox records and dispatches events to RabbitMQ with zero event loss.
5. **Idempotency Key Validation**: Custom Flask decorators validate `Idempotency-Key` headers against Redis to guarantee that retried requests safely return cached responses without duplicate processing.
6. **Stripe Gateway, PaymentIntents, & Refunds**:
   - `POST /api/v1/orders/payments/intent`: Creates Stripe `PaymentIntent` objects (with automatic Sandbox mode fallback when API keys are omitted).
   - `POST /api/v1/webhooks/stripe`: Signature-verified webhook handler processing `payment_intent.succeeded` (marks order `PAID`) and `payment_intent.payment_failed` (cancels order and restores stock).
   - `PATCH /api/v1/admin/orders/<id>`: Updating status to `REFUNDED` automatically executes `stripe.Refund.create()`.
7. **Full Product Catalog Depth**: Hierarchical product categories, size/color SKU variants, multi-image product galleries, PostgreSQL full-text search, filtering, price/date sorting, and paginated catalog queries.
8. **Complete Order Lifecycle & Fulfillment**: Supports status transitions (`PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`, `RETURNED`) along with customer shipping addresses, tracking numbers, and carrier details.
9. **Guest Checkout**: `POST /api/v1/orders/guest-checkout` enables non-authenticated users to place orders directly without creating a prior account.
10. **Automatic Schema Synchronization**: Startup hooks ([app/core/db_init.py](file:///d:/Flash%20Sale%20Engine/app/core/db_init.py)) automatically execute safe `ALTER TABLE` statements and `db.create_all()` across PostgreSQL and SQLite databases.
11. **Production WSGI & CI/CD**: Production process manager config ([gunicorn.conf.py](file:///d:/Flash%20Sale%20Engine/gunicorn.conf.py)), automated GitHub Actions pipeline ([.github/workflows/ci.yml](file:///d:/Flash%20Sale%20Engine/.github/workflows/ci.yml)), and optional Sentry error tracking integration.

---

## Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **API Gateway & Core Web** | **Flask 3.x** | WSGI web application framework running Application Factory Pattern |
| **REST Serialization & API Docs** | **Marshmallow / Flask-Smorest** | Strict schema validation, request parsing, and OpenAPI (Swagger UI) generation |
| **Primary Database** | **PostgreSQL 16** | Relational storage for transactional integrity and audit logging |
| **Database ORM & Driver** | **Flask-SQLAlchemy + psycopg3** | Object-Relational Mapper with native PostgreSQL support |
| **Schema Synchronization** | **Custom Auto-Sync + Flask-Migrate** | Non-destructive column additions and table auto-creation |
| **In-Memory Store & Cache** | **Redis 7** | Atomic Lua scripting, per-variant inventory pools, sliding-window rate limiting |
| **Message Broker** | **RabbitMQ 3** | AMQP event message queue supporting durable exchanges, queues, and DLQ |
| **Distributed Task Queue** | **Celery** | Asynchronous background worker execution and task scheduling |
| **Payment Gateway** | **Stripe API & Webhooks** | Stripe PaymentIntent creation, signature-verified webhooks, & refund processing |
| **Production WSGI & Monitoring** | **Gunicorn + Sentry SDK** | Multi-worker WSGI process management and external error tracking |
| **CI/CD Pipeline** | **GitHub Actions** | Automated linting, static analysis, and Pytest coverage pipeline |
| **Testing & Verification** | **Pytest** | Automated integration and multi-thread concurrency test suite |

---

## Relational Schema Architecture

```text
┌───────────────────────────────────────┐         ┌───────────────────────────────────────┐
│                 users                 │         │              categories               │
├───────────────────┬───────────────────┤         ├───────────────────┬───────────────────┤
│ id                │ UUID PRIMARY KEY  │         │ id                │ UUID PRIMARY KEY  │
│ email             │ VARCHAR(255) UNIQUE│        │ name              │ VARCHAR(128)      │
│ password_hash     │ VARCHAR(255)      │◄──┐     │ slug              │ VARCHAR(128) UNIQUE│
│ full_name         │ VARCHAR(128)      │   │     │ parent_id         │ UUID (Self-Ref)   │
│ role              │ VARCHAR(32)       │   │     └───────────────────┴─────────┬─────────┘
│ is_email_verified │ BOOLEAN           │   │                                   │ 1
└───────────────────┴─────────┬─────────┘   │                                   │ N
                              │ 1           │     ┌─────────────────────────────▼─────────┐
                              │             │     │               products                │
                              │ N           │     ├───────────────────┬───────────────────┤
┌─────────────────────────────▼─────────┐   │     │ id                │ UUID PRIMARY KEY  │
│              cart_items               │   │     │ category_id       │ UUID REFERENCES   │
├───────────────────┬───────────────────┤   │     │ name              │ VARCHAR(255)      │
│ id                │ UUID PRIMARY KEY  │   │     │ sku               │ VARCHAR(64) UNIQUE│
│ user_id           │ UUID REFERENCES   │───┘     │ total_stock       │ INTEGER           │
│ product_id        │ UUID REFERENCES   │──┐      │ available_stock   │ INTEGER           │
│ variant_id        │ UUID REFERENCES   │──┼─┐    │ price             │ NUMERIC(12,2)     │
│ quantity          │ INTEGER           │  │ │    │ images            │ JSONB DEFAULT '[]'│
└───────────────────┴───────────────────┘  │ │    └───────────────────┴─────────┬─────────┘
                                            │ │                                   │ 1
                                            │ │                                   │ N
┌───────────────────────────────────────┐   │ │   ┌─────────────────────────────▼─────────┐
│                orders                 │   │ │   │           product_variants            │
├───────────────────┬───────────────────┤   │ │   ├───────────────────┬───────────────────┤
│ id                │ UUID PRIMARY KEY  │   │ │   │ id                │ UUID PRIMARY KEY  │
│ user_id           │ UUID REFERENCES   │───┤ │   │ product_id        │ UUID REFERENCES   │
│ status            │ VARCHAR(32)       │   │ │   │ sku               │ VARCHAR(64) UNIQUE│
│ subtotal          │ NUMERIC(12,2)     │   │ │   │ name              │ VARCHAR(128)      │
│ tax               │ NUMERIC(12,2)     │   │ │   │ size / color      │ VARCHAR(64)       │
│ shipping_fee      │ NUMERIC(12,2)     │   │ │   │ total_stock       │ INTEGER           │
│ total_amount      │ NUMERIC(12,2)     │   │ │   │ available_stock   │ INTEGER           │
│ shipping_address_id│ UUID REFERENCES  │   │ │   │ price             │ NUMERIC(12,2)     │
│ tracking_number   │ VARCHAR(128)      │   │ │   └─────────────────────────────▲─────────┘
│ carrier           │ VARCHAR(64)       │   │ │                                 │
│ idempotency_key   │ VARCHAR(255)      │   │ │                                 │ 1 (FK)
│ expires_at        │ TIMESTAMPTZ       │   │ │   ┌─────────────────────────────┴─────────┐
└───────────────────┴─────────┬─────────┘   │ │   │              order_items              │
                              │ 1           │ │   ├───────────────────┬───────────────────┤
                              │             └─┼──►│ id                │ UUID PRIMARY KEY  │
                              │ N             │   │ order_id          │ UUID REFERENCES   │
┌─────────────────────────────▼─────────┐     │   │ product_id        │ UUID REFERENCES   │
│             outbox_events             │     └──►│ variant_id        │ UUID REFERENCES   │
├───────────────────┬───────────────────┤         │ quantity          │ INTEGER           │
│ id                │ UUID PRIMARY KEY  │         │ unit_price        │ NUMERIC(12,2)     │
│ aggregate_type    │ VARCHAR(64)       │         │ subtotal          │ NUMERIC(12,2)     │
│ aggregate_id      │ VARCHAR(255)      │         └───────────────────────────────────────┘
│ payload           │ JSONB             │
│ status            │ VARCHAR(32)       │         ┌───────────────────────────────────────┐
└───────────────────┴───────────────────┘         │    shipping_addresses / coupons /     │
                                                  │         reviews / wishlist_items        │
                                                  ├───────────────────────────────────────┤
                                                  │ Auxiliary user commerce state tables  │
                                                  └───────────────────────────────────────┘
```

---

## Folder Structure

```text
flash-sale-engine/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD pipeline definition
├── app/
│   ├── __init__.py              # Application Factory (create_app) & blueprint registrations
│   ├── api/
│   │   ├── __init__.py
│   │   ├── decorators/
│   │   │   ├── auth.py          # JWT & Admin decorators (@jwt_required, @admin_required)
│   │   │   ├── idempotency.py   # Redis-backed Idempotency Flask decorator
│   │   │   └── rate_limit.py    # Redis sliding-window rate limiter decorator
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── admin.py         # Admin orders, stats, users, & task log management
│   │       ├── auth.py          # Register, login, refresh, logout, password reset, email verify
│   │       ├── cart.py          # Multi-item shopping cart API endpoints
│   │       ├── commerce.py      # Coupons, reviews, wishlists, & shipping addresses
│   │       ├── health.py        # Readiness & Liveness probes
│   │       ├── orders.py        # Order checkout, guest checkout, payment intent, cancellation
│   │       ├── products.py      # Product CRUD, category hierarchy, SKU variants, & search
│   │       └── webhooks.py      # Signature-verified Stripe webhook handler
│   ├── core/
│   │   ├── config.py            # Development, Production, & Testing configuration objects
│   │   ├── db_init.py           # Automatic schema synchronization & migration engine
│   │   ├── extensions.py        # Shared extension singletons (db, migrate, smorest_api, redis, celery)
│   │   └── security.py          # Password hashing, JWT creation & token decode helpers
│   ├── models/                  # SQLAlchemy Models
│   │   ├── cart.py              # CartItem model (with variant_id)
│   │   ├── category.py          # Category hierarchical model
│   │   ├── coupon.py            # Coupon promo model
│   │   ├── order.py             # Order model with status lifecycle & totals
│   │   ├── order_item.py        # OrderItem line item model (with variant_id)
│   │   ├── outbox.py            # OutboxEvent transactional model
│   │   ├── product.py           # Product catalog model
│   │   ├── product_variant.py   # ProductVariant SKU model (with stock)
│   │   ├── review.py            # Customer product review model
│   │   ├── shipping_address.py  # User saved shipping address model
│   │   ├── task_log.py          # Background Celery execution log model
│   │   ├── user.py              # User account model
│   │   └── wishlist.py          # WishlistItem model
│   ├── schemas/                 # Marshmallow Schemas for API validation & OpenAPI docs
│   │   ├── auth_schema.py
│   │   ├── cart_schema.py
│   │   ├── category_schema.py
│   │   ├── order_schema.py
│   │   └── product_schema.py
│   ├── services/
│   │   ├── inventory_service.py # Redis Lua multi-SKU & variant atomic reservations & reconciliation
│   │   ├── order_service.py     # Multi-item checkout, guest checkout, tax calculation & cancellation
│   │   ├── outbox_service.py    # Outbox table polling & RabbitMQ relay logic
│   │   └── payment_service.py   # Stripe PaymentIntent creation, refunds, & sandbox fallback service
│   └── workers/
│       ├── celery_app.py        # Celery application initialization
│       ├── publisher.py         # Transactional outbox publisher relay runner
│       └── tasks.py             # Celery tasks (order expiration, stock restoration, notifications)
├── gunicorn.conf.py             # Production Gunicorn process manager configuration
├── pyproject.toml               # Pytest & tool configurations
├── requirements.txt             # Dependencies
├── seed.py                      # Database schema sync & sample data seeder
└── wsgi.py                      # WSGI application entrypoint
```

---

## REST API Routes & Endpoints

All API endpoints follow RESTful standards, support JSON bodies, and return RFC 7807 Problem Details on errors. Interactive OpenAPI / Swagger documentation is rendered live at `/docs`.

### 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | None | `201 Created` | Register new user account with salted password hashing |
| **POST** | `/api/v1/auth/login` | None | `200 OK` | Authenticate user and return JWT Access & Refresh tokens |
| **POST** | `/api/v1/auth/refresh` | Bearer | `200 OK` | Issue fresh access token from valid refresh token |
| **POST** | `/api/v1/auth/logout` | Bearer | `200 OK` | Revoke active JWT access token via Redis blacklist |
| **POST** | `/api/v1/auth/forgot-password` | None | `200 OK` | Trigger password reset verification email token |
| **POST** | `/api/v1/auth/reset-password` | None | `200 OK` | Reset account password using token |
| **POST** | `/api/v1/auth/verify-email` | None | `200 OK` | Verify user email address token |

### 2. Product Catalog, Categories & Variants (`/api/v1/products`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/products` | None | `200 OK` | List products with search, category filter, sorting, & pagination |
| **GET** | `/api/v1/products/<id>` | None | `200 OK` | Retrieve single product detail with cached stock levels |
| **POST** | `/api/v1/products` | Admin | `201 Created` | Create new product with optional nested SKU variants & warm Redis pool |
| **PUT** | `/api/v1/products/<id>` | Admin | `200 OK` | Update product details & variants |
| **DELETE** | `/api/v1/products/<id>` | Admin | `200 OK` | Deactivate/delete product |
| **POST** | `/api/v1/products/<id>/sync-stock` | Admin | `200 OK` | Force sync Redis stock cache with PostgreSQL database |
| **GET** | `/api/v1/products/categories` | None | `200 OK` | List all product categories |
| **POST** | `/api/v1/products/categories` | Admin | `201 Created` | Create new product category |
| **PUT** | `/api/v1/products/categories/<id>` | Admin | `200 OK` | Update category details |
| **DELETE** | `/api/v1/products/categories/<id>` | Admin | `200 OK` | Delete product category |
| **GET** | `/api/v1/products/<id>/variants` | None | `200 OK` | List variants for a product |
| **POST** | `/api/v1/products/<id>/variants` | Admin | `201 Created` | Add a new SKU variant to a product |
| **PUT** | `/api/v1/products/<id>/variants/<vid>` | Admin | `200 OK` | Update SKU variant details |
| **DELETE** | `/api/v1/products/<id>/variants/<vid>` | Admin | `200 OK` | Delete SKU variant |

### 3. Shopping Cart (`/api/v1/cart`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/cart` | User | `200 OK` | Retrieve current user's shopping cart items (with variant info) |
| **POST** | `/api/v1/cart/items` | User | `201 Created` | Add item or specific SKU variant (`variant_id`) to shopping cart |
| **PATCH** | `/api/v1/cart/items/<id>` | User | `200 OK` | Update item quantity in shopping cart |
| **DELETE** | `/api/v1/cart/items/<id>` | User | `200 OK` | Remove item from shopping cart |
| **DELETE** | `/api/v1/cart` | User | `200 OK` | Clear all items from shopping cart |

### 4. Orders, Checkout & Payments (`/api/v1/orders`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/orders/checkout` | User | `202 Accepted` | **Multi-Item Cart Checkout**. Requires `Idempotency-Key` header. Reserves per-variant stock via Lua, computes 8% sales tax, creates Order + OrderItems. |
| **POST** | `/api/v1/orders/guest-checkout` | None | `202 Accepted` | **Guest Checkout**. Place order directly with email & item list (with optional `variant_id`) without account. |
| **POST** | `/api/v1/orders/payments/intent` | User | `201 Created` | Create Stripe `PaymentIntent` (with Sandbox fallback mode). |
| **POST** | `/api/v1/webhooks/stripe` | None | `200 OK` | **Stripe Webhook Handler**. Signature-verified callback for `payment_intent.succeeded` & `payment_intent.payment_failed`. |
| **GET** | `/api/v1/orders` | User | `200 OK` | List authenticated user's order history |
| **GET** | `/api/v1/orders/<id>` | User | `200 OK` | Retrieve specific order detail, line items, & fulfillment status |
| **POST** | `/api/v1/orders/<id>/pay` | User | `200 OK` | Pay order directly |
| **POST** | `/api/v1/orders/<id>/cancel` | User | `200 OK` | Cancel pending order reservation and release per-variant stock back to pool |

### 5. Commerce Features (`/api/v1/coupons`, `/reviews`, `/wishlist`, `/shipping-addresses`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/coupons/validate` | User | `200 OK` | Validate promo code coupon and return discount calculation |
| **POST** | `/api/v1/coupons` | Admin | `201 Created` | Create new promo coupon code |
| **GET** | `/api/v1/products/<id>/reviews` | None | `200 OK` | List customer reviews & rating summary for a product |
| **POST** | `/api/v1/products/<id>/reviews` | User | `201 Created` | Submit customer review & star rating |
| **GET** | `/api/v1/wishlist` | User | `200 OK` | Get saved user wishlist items |
| **POST** | `/api/v1/wishlist` | User | `201 Created` | Add product to wishlist |
| **DELETE** | `/api/v1/wishlist/<id>` | User | `200 OK` | Remove product from wishlist |
| **GET** | `/api/v1/shipping-addresses` | User | `200 OK` | List saved user shipping addresses |
| **POST** | `/api/v1/shipping-addresses` | User | `201 Created` | Add new saved shipping address |

### 6. Admin Management & Telemetry (`/api/v1/admin`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/admin/stats` | Admin | `200 OK` | System aggregate metrics (Products, Orders, Revenue, Users) |
| **GET** | `/api/v1/admin/orders` | Admin | `200 OK` | List all system orders with status filtering |
| **PATCH** | `/api/v1/admin/orders/<id>` | Admin | `200 OK` | Update order status (`SHIPPED`, `DELIVERED`, `REFUNDED`) & tracking details (triggers Stripe refund when status is set to `REFUNDED`) |
| **GET** | `/api/v1/admin/outbox` | Admin | `200 OK` | View Transactional Outbox Event stream logs |
| **GET** | `/api/v1/admin/users` | Admin | `200 OK` | Directory of registered user accounts |
| **GET** | `/api/v1/admin/task-logs` | Admin | `200 OK` | View Celery background task execution logs |

### 7. System Health Probes (`/` & `/healthz`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | None | `200 OK` | API System Navigation index |
| **GET** | `/docs` | None | `200 OK` | **OpenAPI / Swagger UI Interactive Specifications** |
| **GET** | `/healthz` | None | `200 OK` | Liveness health probe |
| **GET** | `/api/v1/health/ready` | None | `200 OK` | Readiness probe checking PostgreSQL DB and Redis connectivity |

---

## Getting Started & Local Setup

### Prerequisites
- **Python 3.11+**
- **PostgreSQL 16** (or SQLite local fallback)
- **Redis 7** (In-memory inventory accelerator & rate limiter)
- **RabbitMQ 3** (Message broker for transactional outbox pattern)

### Setup Instructions

1. **Clone repository and set up environment variables:**
   ```bash
   git clone https://github.com/hammadsarwar789/flash-sale-engine.git
   cd flash-sale-engine
   cp .env.example .env
   ```

2. **Create virtual environment and install dependencies:**
   ```bash
   python -m venv .venv
   # On Windows:
   .\.venv\Scripts\activate
   # On Linux/macOS:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Initialize & Seed Database:**
   ```bash
   python seed.py
   ```
   *(Executes `sync_database_schema()` to auto-create PostgreSQL tables and populates initial sample products, categories, admin (`admin@flashsale.com`), and buyer accounts).*

4. **Run Server (Development vs Production WSGI):**
   - **Development Server:**
     ```bash
     python wsgi.py
     ```
   - **Production Gunicorn Server:**
     ```bash
     gunicorn -c gunicorn.conf.py wsgi:app
     ```

5. **Start Async Background Workers (in separate terminals):**
   - **Celery Worker Pool:**
     ```bash
     python -m celery -A app.workers.celery_app.celery worker --loglevel=info
     ```
   - **Transactional Outbox Publisher Relay Daemon:**
     ```bash
     python -m app.workers.publisher
     ```

6. **Run Full Test Suite:**
   ```bash
   python -m pytest -v
   ```

7. **Explore OpenAPI Documentation:**
   - Open your browser to **`http://localhost:5000/docs`** to test all endpoints interactively in Swagger UI.
