# High-Scale Distributed Flash Sale & Inventory Reservation System

A production-grade, event-driven backend platform engineered to process extreme concurrent traffic during flash sale events. Built with **Flask**, **Flask-RESTful / Marshmallow / Flask-Smorest**, **PostgreSQL**, **Redis**, **RabbitMQ**, and **Celery**, this platform solves critical distributed engineering challenges: preventing inventory overselling through atomic operations, maintaining zero data loss via the Transactional Outbox pattern, and achieving reliable event delivery with idempotent REST API endpoints.

---

## Architecture Overview & Core Design Patterns

During a flash sale, hitting a relational database directly for inventory checks leads to row locks, connection pool exhaustion, and latency spikes. This system decouples high-throughput inventory allocation from database persistence using a multi-tiered architecture:

```text
                             [ REST Clients / API Consumers ]
                                            │
                               POST /api/v1/orders/reserve
                              (Header: Idempotency-Key)
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Flask REST Gateway Layer                                   │
│  1. Validate JWT Auth & Rate Limit (Redis Sliding Window Decorator)                         │
│  2. Check/Set Idempotency state in Redis (Flask Custom Before-Request Decorator)            │
│  3. Execute Atomic Inventory Decrement & Hold via Redis Lua Script (with DB Fallback)        │
│  4. Open Postgres Transaction: Insert Order (PENDING) + Insert Outbox Event                │
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
                               │  - Payment Processing Gateway │
                               │  - Email & Notification       │
                               │  - 10-Min Expiry & Stock Auto-│
                               │    Restoration Timer          │
                               └───────────────┬───────────────┘
```

### Key Distributed Systems Patterns Implemented

1. **Atomic In-Memory Reservations (Redis Lua Scripting)**: Reads, validates, and decrements stock counters atomically in Redis, preventing race conditions and overselling without locking database rows.
2. **Transactional Outbox Pattern**: Writes order entities and event notifications into PostgreSQL within the same atomic SQL transaction. A dedicated background publisher relay polls outbox records and dispatches events to RabbitMQ with zero event loss.
3. **Idempotency Key Validation**: Custom Flask decorators validate `Idempotency-Key` headers against Redis to guarantee that retried requests safely return cached responses without duplicate processing.
4. **Asynchronous Request-Reply (HTTP 202)**: Offloads long-running tasks (payment, notifications, delayed release) to Celery workers, returning immediate `202 Accepted` status codes with task tracking locations.
5. **Automatic Inventory Expiry & Release**: Celery handles 10-minute payment countdown timers. Unpaid reservations trigger automated inventory restoration back into the Redis and PostgreSQL pools.
6. **Stock Reconciliation & Cache Warm-Up**: Automated startup and admin tools sync PostgreSQL stock balances into Redis, ensuring zero stock mismatch on cold starts or cache evictions.
7. **Database Resilient Fallback**: All product catalog and reservation endpoints gracefully fall back to PostgreSQL database transactions when Redis is offline.

---

## Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **API Gateway & Core Web** | **Flask 3.x** | WSGI web application framework running Application Factory Pattern |
| **REST Serialization & API Docs** | **Marshmallow / Flask-Smorest** | Strict schema validation, request parsing, and OpenAPI (Swagger UI) generation |
| **Primary Database** | **PostgreSQL 16** | Relational storage for transactional integrity and audit logging |
| **Database ORM & Driver** | **Flask-SQLAlchemy + psycopg3** | Object-Relational Mapper with native PostgreSQL support |
| **Database Migrations** | **Flask-Migrate (Alembic wrapper)** | Automated relational schema version management |
| **In-Memory Store & Cache** | **Redis 7** | Atomic Lua scripting, distributed sliding-window rate limiting, and idempotency cache |
| **Message Broker** | **RabbitMQ 3** | AMQP event message queue supporting durable exchanges, queues, and DLQ |
| **Distributed Task Queue** | **Celery** | Asynchronous background worker execution and task scheduling |
| **Code Quality & Tooling** | **Ruff & MyPy** | Linting, formatting, and static type validation |
| **Testing & Infrastructure** | **Pytest** | Automated integration and 20-thread concurrency test suite |

---

## Relational Schema Diagram

```text
┌────────────────────────────────────────────────────────┐
│                         users                          │
├───────────────────────┬────────────────────────────────┤
│ id                    │ UUID PRIMARY KEY               │
│ email                 │ VARCHAR(255) UNIQUE NOT NULL   │
│ password_hash         │ VARCHAR(255) NOT NULL          │
│ full_name             │ VARCHAR(128)                   │
│ role                  │ VARCHAR(32) DEFAULT 'user'     │ -- user, admin
│ is_active             │ BOOLEAN DEFAULT true           │
│ created_at            │ TIMESTAMPTZ DEFAULT NOW()      │
│ updated_at            │ TIMESTAMPTZ DEFAULT NOW()      │
└───────────────────────┴────────────────────────────────┘
                            │ 1
                            │
                            │ N
┌───────────────────────────▼────────────────────────────┐
│                        products                        │
├───────────────────────┬────────────────────────────────┤
│ id                    │ UUID PRIMARY KEY               │
│ name                  │ VARCHAR(255) NOT NULL          │
│ sku                   │ VARCHAR(64) UNIQUE NOT NULL    │
│ total_stock           │ INTEGER NOT NULL CHECK (>= 0)  │
│ available_stock       │ INTEGER NOT NULL CHECK (>= 0)  │
│ price                 │ NUMERIC(12, 2) NOT NULL        │
│ is_active             │ BOOLEAN DEFAULT true           │
│ version               │ INTEGER DEFAULT 1              │ -- Optimistic Locking
│ created_at            │ TIMESTAMPTZ DEFAULT NOW()      │
│ updated_at            │ TIMESTAMPTZ DEFAULT NOW()      │
└───────────────────────┴────────────────────────────────┘
                            │ 1
                            │
                            │ N
┌───────────────────────────▼────────────────────────────┐
│                         orders                         │
├───────────────────────┬────────────────────────────────┤
│ id                    │ UUID PRIMARY KEY               │
│ user_id               │ UUID REFERENCES users(id)      │
│ product_id            │ UUID REFERENCES products(id)   │
│ status                │ VARCHAR(32) NOT NULL           │ -- PENDING, PAID, EXPIRED, CANCELLED
│ quantity              │ INTEGER NOT NULL CHECK (> 0)   │
│ unit_price            │ NUMERIC(12, 2) NOT NULL        │
│ total_amount          │ NUMERIC(12, 2) NOT NULL        │
│ idempotency_key       │ VARCHAR(255) UNIQUE NOT NULL   │
│ expires_at            │ TIMESTAMPTZ NOT NULL           │
│ created_at            │ TIMESTAMPTZ DEFAULT NOW()      │
│ updated_at            │ TIMESTAMPTZ DEFAULT NOW()      │
└───────────────────────┴────────────────────────────────┘
                            │ 1
                            │
                            │ N
┌───────────────────────────▼────────────────────────────┐
│                     outbox_events                      │
├───────────────────────┬────────────────────────────────┤
│ id                    │ UUID PRIMARY KEY               │
│ aggregate_type        │ VARCHAR(64) NOT NULL           │ -- e.g., 'ORDER'
│ aggregate_id          │ VARCHAR(255) NOT NULL          │
│ event_type            │ VARCHAR(64) NOT NULL           │ -- e.g., 'order.reserved'
│ payload               │ JSONB NOT NULL                 │
│ status                │ VARCHAR(32) DEFAULT 'PENDING'  │ -- PENDING, PUBLISHED, FAILED
│ retry_count           │ INTEGER DEFAULT 0              │
│ error_log             │ TEXT                           │
│ created_at            │ TIMESTAMPTZ DEFAULT NOW()      │
│ processed_at          │ TIMESTAMPTZ                    │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                       task_logs                        │
├───────────────────────┬────────────────────────────────┤
│ id                    │ UUID PRIMARY KEY               │
│ task_id               │ VARCHAR(255) NOT NULL          │
│ order_id              │ UUID REFERENCES orders(id)     │
│ task_name             │ VARCHAR(128) NOT NULL          │
│ status                │ VARCHAR(32) NOT NULL           │ -- SUCCESS, FAILURE, RETRYING
│ execution_time_ms     │ NUMERIC(10, 2)                 │
│ error_message         │ TEXT                           │
│ created_at            │ TIMESTAMPTZ DEFAULT NOW()      │
└────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```text
flash-sale-engine/
├── app/
│   ├── __init__.py              # Application Factory (create_app)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── decorators/
│   │   │   ├── auth.py          # JWT & Admin decorators (@jwt_required, @admin_required)
│   │   │   ├── idempotency.py   # Redis-backed Idempotency Flask decorator
│   │   │   └── rate_limit.py    # Redis sliding-window rate limiter decorator
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── admin.py         # Admin telemetry & stats routes
│   │       ├── auth.py          # JWT Authentication routes
│   │       ├── health.py        # Readiness & Liveness probes
│   │       ├── orders.py        # Order & Reservation REST Views
│   │       └── products.py      # Flash sale product management Views
│   ├── core/
│   │   ├── config.py            # Flask Config objects (Development, Production, Testing)
│   │   ├── extensions.py        # Shared instances (db, migrate, smorest_api, redis_client, celery_app)
│   │   └── security.py          # Salted PBKDF2 password hashing & JWT token validation
│   ├── models/                  # Flask-SQLAlchemy Models
│   │   ├── order.py
│   │   ├── outbox.py
│   │   ├── product.py
│   │   ├── task_log.py
│   │   └── user.py
│   ├── schemas/                 # Marshmallow Schema definitions
│   │   ├── auth_schema.py
│   │   ├── order_schema.py
│   │   └── product_schema.py
│   ├── services/
│   │   ├── inventory_service.py # Redis Lua atomic execution & reconciliation service
│   │   ├── order_service.py     # Transactional DB operations & outbox creation
│   │   └── outbox_service.py    # Outbox table polling & RabbitMQ relay logic
│   └── workers/
│       ├── celery_app.py        # Celery application initialization with Flask context
│       ├── publisher.py         # Outbox relay daemon runner
│       └── tasks.py             # Celery background tasks (payments, releases, emails)
├── migrations/                  # Flask-Migrate / Alembic directory
├── tests/
│   ├── conftest.py              # Pytest fixtures setup
│   ├── test_api/                # REST API integration tests
│   └── test_services/           # 20-thread concurrency & race-condition tests
├── .env.example
├── .gitignore
├── pyproject.toml               # Setuptools / Poetry configuration
├── requirements.txt             # Pip dependencies
├── seed.py                      # Database seeding script for sample products & users
├── STUDY_NOTES.md               # Technical deep dive and study guide (Phases 1-7)
└── wsgi.py                      # Production WSGI entrypoint
```

---

## REST API Routes & Endpoints

All API endpoints follow strict RESTful conventions and return RFC 7807 Problem Details on errors. Interactive OpenAPI / Swagger UI is available at `/docs`.

### 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | None | `201 Created` | Register new user account with salted PBKDF2 hashing |
| **POST** | `/api/v1/auth/login` | None | `200 OK` | Authenticate user and return JWT Access & Refresh tokens |

### 2. Flash Sale Products (`/api/v1/products`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/products` | None | `200 OK` | Fetch active products and flash sale stock levels |
| **GET** | `/api/v1/products/<id>` | None | `200 OK` | Fetch individual product detail with real-time cached availability |
| **POST** | `/api/v1/products` | Admin | `201 Created` | Create new product and populate/warm-up Redis inventory pool |
| **POST** | `/api/v1/products/<id>/sync-stock` | Admin | `200 OK` | Force sync Redis inventory cache from PostgreSQL database |

### 3. Reservations & Orders (`/api/v1/orders`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/orders/reserve` | User | `202 Accepted` | **Core Flash Sale Endpoint**. Requires `Idempotency-Key` header. Decrements stock via Lua script, saves order & outbox event, enqueues background processing. |
| **GET** | `/api/v1/orders/<id>` | User | `200 OK` | Retrieve detailed reservation/order state |
| **GET** | `/api/v1/orders` | User | `200 OK` | Paginated listing of user's order history |
| **POST** | `/api/v1/orders/<id>/pay` | User | `200 OK` | Process payment for reserved order before 10-minute expiry |
| **POST** | `/api/v1/orders/<id>/cancel` | User | `200 OK` | Cancel active reservation and immediately release inventory back to pool |

### 4. Admin Operations & Telemetry (`/api/v1/admin`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/admin/stats` | Admin | `200 OK` | System aggregate telemetry metrics (Total products, orders, reservations, users) |
| **GET** | `/api/v1/admin/outbox` | Admin | `200 OK` | Transactional Outbox Event stream logs |
| **GET** | `/api/v1/admin/users` | Admin | `200 OK` | User account directory |
| **GET** | `/api/v1/admin/task-logs` | Admin | `200 OK` | Background Celery task execution logs |

### 5. System Operations & Probes (`/api/v1/health` & `/healthz`)

| Method | Endpoint | Auth | Status Code | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | None | `200 OK` | API Navigation index & specifications |
| **GET** | `/docs` | None | `200 OK` | **OpenAPI / Swagger UI Interactive Portal** |
| **GET** | `/healthz` | None | `200 OK` | Liveness health probe |
| **GET** | `/api/v1/health/ready` | None | `200 OK` | Readiness probe checking PostgreSQL DB and Redis connectivity |

---

## Getting Started & Local Execution

### Prerequisites
- **Python 3.12+**
- **PostgreSQL 16** (or SQLite local fallback)
- **Redis 7** (optional accelerator; system automatically falls back to PostgreSQL if Redis is offline)

### Step-by-Step Setup

1. **Clone the repository and prepare environment:**
   ```bash
   git clone https://github.com/your-username/flash-sale-engine.git
   cd flash-sale-engine
   cp .env.example .env
   ```

2. **Create Python virtual environment & install dependencies:**
   ```bash
   python -m venv .venv
   # On Windows:
   .\.venv\Scripts\activate
   # On Linux/macOS:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

3. **Seed Database with Sample Products & Accounts:**
   ```bash
   python seed.py
   ```

4. **Start the Flask Application Server:**
   ```bash
   python wsgi.py
   ```

5. **Start Celery Worker & Outbox Publisher (in separate terminal windows):**
   ```bash
   # Terminal 2: Celery Worker Pool
   python -m celery -A app.workers.celery_app.celery worker --loglevel=info

   # Terminal 3: Transactional Outbox Publisher Relay
   python -m app.workers.publisher
   ```

6. **Run Automated Test Suite:**
   ```bash
   python -m pytest -v
   ```

7. **Verify Application Status & Interactive Specs:**
   - **OpenAPI Swagger UI Portal:** `http://localhost:5000/docs`
   - **System Readiness Probe:** `http://localhost:5000/api/v1/health/ready`
