# ⚡ High-Scale Flash Sale Engine & E-Commerce Platform

A production-grade, full-stack distributed e-commerce platform and high-concurrency inventory reservation engine. Designed around **Frontend Design Specification v2 ("Trading Floor Editorial")** using **React 18 + Vite + TypeScript** and backed by an event-driven **Flask + PostgreSQL + Redis + RabbitMQ + Celery** microservice architecture.

---

## 🎨 Visual Interface Showcase

### 🛍️ 1. Floor Catalog & Real-Time Drops (`/products`)
![Trading Floor Catalog](frontend/public/screenshots/catalog.png)
*High-density 4-column product grid featuring issue counters (`Nº 001`), live signal dots, monospace stock block gauges (`▓▓▓▓▓░░░`), category filters (`● ALL`, `FOOTWEAR`, `TECH`), and zero-padded tabular prices (`$099.99`).*

---

### 🛒 2. Cart & Reserved Inventory Hold Timer (`/cart`)
![Cart & Inventory Hold Timer](frontend/public/screenshots/cart.png)
*Active inventory reservation hold timer featuring real-time digit-flip countdown, `localStorage` persistence across page refreshes, promo coupon code validation, and sticky order subtotal summary.*

---

### 💳 3. Multi-Channel Checkout & Worldwide Shipping (`/checkout`)
![Worldwide Checkout & Payment Options](frontend/public/screenshots/checkout.png)
*Single-column 720px stack with **Worldwide Shipping Address** entry (covering 200+ UN ISO countries & territories with free-form autocomplete), payment method selector (**Credit/Debit Card** & **Cash on Delivery / COD**), and one-click test card auto-fill.*

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
    ├── public/screenshots/   # Visual interface documentation screenshots
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

### 🛒 1. "Trading Floor Editorial" Design System (`/frontend`)
* **Editorial Aesthetic Tokens:** Built with Instrument Serif, Inter Tight, and JetBrains Mono. Flat paper surfaces (`--paper`, `--bone`, `--paper-sunk`), hairline borders (`1px solid var(--rule)`), and Signal Red (`#E5321B`) CTAs. Zero gradients, zero backdrop blurs, zero drop shadows.
* **Tabular Monospace Numerics:** All prices, stock counts, order SKUs, and timers use `font-variant-numeric: tabular-nums` with zero-padded formatting (`$099.99`).
* **Cart Reserve Timer:** Real-time 5-minute inventory hold timer with `localStorage` timestamp persistence preventing reset on page refreshes.
* **Worldwide Shipping Entry:** Full ISO 3166-1 country autocomplete list supporting over 200 global countries and territories alongside free-form manual input.
* **Dual Payment Gateway:** Toggle seamlessly between **Credit/Debit Card (Stripe)** with 1-click test card auto-fill and **Cash on Delivery (COD)**.
* **Order Tracking & Fulfillment:** Dense table order ledger with accordion rows, horizontal fulfillment steppers (`[ PENDING ]───[ PAID ]───[ SHIPPED ]───[ DELIVERED ]`), and auto-generated tracking numbers (`TRK-84920194US`).

### 🛡️ 2. Role-Gated Admin Control Center (`/admin`)
* **240px Dark Control Rail:** Dark `--ink` sidebar with 6-cell KPI telemetry metrics bar (24h Revenue, 24h Orders, AOV, Active Holds, Redis Hits/s, Outbox Lag).
* **Product Catalog CRUD:** Create products, sync Redis Lua stock locks, add product variants inline, and delete obsolete SKUs.
* **Order Fulfillment Ledger:** Update order status, assign carrier details, and trigger Stripe refunds.
* **Promo Code Generator:** Issue percentage (`%`) or fixed dollar (`$`) promotional codes with minimum order thresholds.

### ⚡ 3. High-Concurrency Distributed Backend (`/backend`)
* **Redis Lua Atomic Stock Lock:** High-concurrency inventory holds executed atomically via Redis Lua scripts to eliminate race conditions and database row locking.
* **Transactional Outbox Pattern:** Ensures atomic database updates by writing domain models (`Order`) and event payloads (`OutboxEvent`) within a single PostgreSQL transaction.
* **Async Workers & Event Broker:** Outbox publisher relays events to **RabbitMQ**, consumed by **Celery** workers for Stripe PaymentIntents and 10-minute hold expirations.
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
# Navigate to backend directory
cd backend

# Activate virtual environment
.\.venv\Scripts\activate   # On Windows
# source .venv/bin/activate  # On Linux/macOS

# Run WSGI server
python wsgi.py
```
> The Flask REST API starts at **[http://localhost:5000](http://localhost:5000)**.
> Swagger API docs are interactive at **[http://localhost:5000/docs](http://localhost:5000/docs)**.

---

### Step 2: Start the Frontend Application

Open a second terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
> The React application starts at **[http://localhost:5173](http://localhost:5173)**.

---

## 🧪 Verification & Automated Tests

### Frontend TypeScript Verification
```powershell
cd frontend
cmd /c npx tsc --noEmit
```

### Backend Automated Test Suite
```powershell
cd backend
pytest -v
```

---

## 📄 License
Distributed under the MIT License. Built for high-scale e-commerce & flash sale applications.
