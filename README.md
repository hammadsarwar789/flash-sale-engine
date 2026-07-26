# ⚡ High-Scale Flash Sale Engine & E-Commerce Platform

A production-grade, full-stack distributed e-commerce platform and high-concurrency inventory reservation engine. Built with a **React 18 + Vite + TypeScript** frontend and an event-driven **Flask + PostgreSQL + Redis + RabbitMQ + Celery** backend microservice architecture.

---

## 📁 Repository Structure

```text
flash-sale-engine/
├── backend/                  # Python Flask REST API & Async Workers
│   ├── app/                  # Application core, blueprints, models, schemas, services
│   │   ├── api/v1/           # Auth, Products, Cart, Orders, Commerce, Admin, Webhooks
│   │   ├── core/             # DB extensions, config, security, rate limiting
│   │   ├── models/           # SQLAlchemy ORM models (Product, Order, User, Outbox, etc.)
│   │   ├── schemas/          # Marshmallow validation schemas
│   │   └── services/         # InventoryService, OrderService, PaymentService
│   ├── tests/                # Automated pytest suite
│   ├── wsgi.py               # WSGI server entry point
│   ├── requirements.txt      # Python dependencies
│   └── README.md             # Backend architecture documentation
│
└── frontend/                 # React 18 + Vite + TypeScript SPA
    ├── src/
    │   ├── api/              # Typed REST client wrappers (Auth, Products, Cart, Orders, Admin)
    │   ├── components/       # UI components (Navbar, Footer, ProductCard, VariantPicker, StripeForm)
    │   ├── context/          # AuthContext session management & Bearer token handling
    │   ├── hooks/            # TanStack React Query state management hooks
    │   ├── pages/            # Public & protected views + Admin Portal sub-routes
    │   └── types/            # Generated OpenAPI types & domain interfaces
    ├── package.json          # Node dependencies
    └── vite.config.ts        # Vite build & local proxy server configuration
```

---

## 🔥 Key System Capabilities

### 🛒 1. Full-Featured E-Commerce Frontend (`/frontend`)
* **Modern Tech Stack:** React 18, Vite 5, TypeScript (strict mode), Tailwind CSS, `@tanstack/react-query`, and `react-router-dom` v6+.
* **Vite Proxy Networking:** Dev proxy forwards relative `/api/v1` calls to `http://localhost:5000` for native same-origin cookie & session handling.
* **Product Catalog:** Real-time search, category dropdown filter, price/date sorting, pagination, and stock counters.
* **Product Details (PDP):** Multi-image gallery, interactive size/color **VariantPicker** with independent price & stock resolution, live stock badge, quantity selector, Add to Cart, Buy Now, and Wishlist toggles.
* **Cart & Promotions:** Line item quantity steppers, item removal, cart clearing, and promo coupon code validation with instant discount calculation.
* **Idempotent Checkout & Stripe Payments:** Authenticated or guest checkout toggle, shipping address selection, cryptographically secure `crypto.randomUUID()` **Idempotency-Key** header attachment, and Stripe Card Elements UI.
* **Order History & Fulfillment Lifecycle:** Customer order list with status badges (`PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`), fulfillment status timeline, and order cancellation for `PENDING` reservations.

### 🛡️ 2. Role-Gated Admin Control Center (`/admin`)
* **Role-Based Security:** Logged-in users with `user.role === 'admin'` are automatically routed to `/admin`. Non-admin users are restricted via client-side `AdminRoute` guards.
* **Product Catalog CRUD (`/admin/products`):** Create products with automatic Redis stock warmup, edit details, deactivate products, force-sync Redis stock cache with PostgreSQL DB, and create SKU variants inline.
* **Fulfillment & Refund Triggers (`/admin/orders`):** Filter order status (`SHIPPED`, `DELIVERED`, `REFUNDED`), update tracking numbers, and automatically trigger Stripe refunds upon setting an order to `REFUNDED`.
* **Promo Code Generator (`/admin/coupons`):** Create percentage (`%`) or fixed dollar (`$`) promotional codes with minimum order amount rules.
* **Category Management (`/admin/categories`):** Add, update, and delete categories.
* **User Directory (`/admin/users`):** Read-only directory of registered user accounts.
* **System Telemetry & Outbox Stream (`/admin`):** Real-time aggregate metric counters, Transactional Outbox event stream monitoring, and Celery task execution logs.

### ⚡ 3. High-Concurrency Distributed Backend (`/backend`)
* **Redis Lua Atomic Stock Lock:** Inventory decrements and holds during flash sales execute atomically via Redis Lua scripts to eliminate race conditions and row locking in Postgres.
* **Transactional Outbox Pattern:** Guarantees atomic database operations by writing business objects (Orders) and event messages (OutboxEvents) within the same PostgreSQL transaction.
* **Async Workers & Broker:** Outbox publisher service relays events to **RabbitMQ**, consumed asynchronously by **Celery** worker pools for Stripe PaymentIntents, emails, and automatic 10-minute order expirations.
* **Stripe Webhook Integration:** Signature-verified webhook handler for `payment_intent.succeeded` and `payment_intent.payment_failed` events.
* **Interactive OpenAPI Specs:** Swagger UI documentation available at `http://localhost:5000/docs`.

---

## 🚦 Quickstart Guide

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Redis** & **PostgreSQL** (running locally or via Docker)

---

### Step 1: Start the Backend API

```powershell
# Navigate to the backend directory
cd backend

# Activate virtual environment
.\.venv\Scripts\activate   # On Windows
# source .venv/bin/activate  # On Linux/macOS

# Run WSGI server
python wsgi.py
```
> The Flask REST API will start at **[http://localhost:5000](http://localhost:5000)**.
> Swagger API docs are interactive at **[http://localhost:5000/docs](http://localhost:5000/docs)**.

---

### Step 2: Start the Frontend Application

Open a second terminal window:

```powershell
# Navigate to the frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
> The React application will start at **[http://localhost:5173](http://localhost:5173)**.

---

## 🧪 Testing & Type Generation

### Frontend Type Generation
Generate TypeScript API interfaces from the live Flask OpenAPI document:
```powershell
cd frontend
npx openapi-typescript http://localhost:5000/openapi.json -o src/types/api.ts
```

### Frontend TypeScript Verification
```powershell
cd frontend
npx tsc --noEmit
```

### Backend Automated Test Suite
```powershell
cd backend
pytest -v
```

---

## 📄 License
Distributed under the MIT License. Built for high-scale e-commerce & flash sale applications.
