# ⚡ High-Scale Flash Sale Engine & Multi-Vendor Marketplace Platform

A production-grade, full-stack distributed e-commerce platform, multi-vendor marketplace, and high-concurrency inventory reservation engine. Designed around **Frontend Design Specification v2 ("Trading Floor Editorial")** using **React 18 + Vite + TypeScript** and backed by an event-driven **Flask + PostgreSQL + Redis + RabbitMQ + Celery** microservice architecture.

---

## 🎨 Visual Interface Showcase

### 🛍️ 1. Floor Catalog & Real-Time Drops (`/products`)
![Trading Floor Catalog](frontend/public/screenshots/catalog.png)
*High-density 4-column product grid featuring issue counters (`Nº 001`), live signal dots, monospace stock block gauges (`▓▓▓▓▓░░░`), category filters (`● ALL`, `FOOTWEAR`, `TECH`), inline variant color swatches, and zero-padded tabular prices (`$099.99`).*

---

### 🛒 2. Multi-Seller Cart & Reserved Hold Timer (`/cart`)
![Cart & Inventory Hold Timer](frontend/public/screenshots/cart.png)
*Active inventory reservation hold timer featuring real-time countdown, `localStorage` persistence, seller store line-item grouping (`Central Outlet`, merchant brand stores), promo coupon validation, and sticky order subtotal summary.*

---

### 💳 3. Multi-Channel Checkout & Sub-Order Generation (`/checkout`)
![Worldwide Checkout & Payment Options](frontend/public/screenshots/checkout.png)
*Single-column 720px stack with **Worldwide Shipping Address** entry (200+ UN ISO countries), multi-seller sub-order splitting, payment method selector (**Credit/Debit Card** & **Cash on Delivery / COD**), and test card auto-fill.*

---

### 🏬 4. Merchant Store Portal & Variant Parity (`/vendor`)
*Dedicated Merchant Store Portal featuring seller account onboarding, business & KYC verification, payout withdrawal requests, financial escrow ledger, and full catalog parity with Admin (SKU variants, size/color variations, discount percentages, and category assignment).*

---

### 🏢 5. Hierarchical Approval Pipeline & Multi-Tenant Control (`/admin`)
![Admin Control Rail & Approvals](frontend/public/screenshots/approvals.png)
*Role-gated Admin Control Floor featuring multi-outlet RBAC, onboarding approval pipeline, user directory deletion controls, dynamic custom role generator, promo coupon rules engine, and stock ledger telemetry.*

---

## 📁 Repository Structure

```text
flash-sale-engine/
├── backend/                  # Python Flask REST API & Async Workers
│   ├── app/                  # Application core, blueprints, models, services
│   │   ├── api/v1/           # Auth, Products, Cart, Orders, Approvals, RBAC, Vendor, Logistics, Commerce
│   │   ├── core/             # DB extensions, config, security, rate limiting, RBAC authorization, Celery Beat
│   │   ├── models/           # SQLAlchemy ORM models (Product, ProductVariant, Order, SubOrder, Seller, LedgerEntry, User, Outlet, Coupon)
│   │   ├── schemas/          # Marshmallow validation schemas
│   │   └── services/         # OrderService, VendorService, OrderSplitter, MultiOutletService, PaymentService
│   ├── workers/              # Celery tasks (Escrow release, hold expiration, notifications)
│   ├── tests/                # Automated pytest suite (Auth, Products, Cart, Orders, RBAC, Vendor Escrow)
│   ├── wsgi.py               # WSGI server entry point
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React 18 + Vite + TypeScript SPA
    ├── public/screenshots/   # Visual interface documentation screenshots
    ├── src/
    │   ├── api/              # Typed REST client wrappers (Auth, Products, Cart, Orders, Admin, Vendor)
    │   ├── components/       # UI components (Navbar, Footer, ProductCard, VariantPicker, ReviewForm, CouponInput)
    │   ├── context/          # AuthContext session management & Bearer token handling
    │   ├── hooks/            # TanStack React Query state management hooks
    │   ├── pages/            # Public & protected views (Products, Cart, Checkout, AdminPortal, VendorPortal)
    │   └── types/            # Generated OpenAPI types & domain interfaces
    ├── package.json          # Node dependencies
    └── vite.config.ts        # Vite build & local proxy server configuration
```

---

## 🔥 Key System Capabilities

### 🏬 1. Multi-Vendor Marketplace & Escrow Financial Engine
* **Seller Onboarding & KYC Pipeline:** Merchants register store profiles with business registration, tax IDs, and KYC documentation. Requests enter the Admin Approval Queue (`VENDOR_REGISTRATION`).
* **Admin-Merchant Catalog Parity:** Vendors manage product listings with full feature parity to admins: specify custom SKUs, size/color variant combinations, variant prices, stock, discount percentages (`DISCOUNT %`), and category classifications.
* **Sub-Order Multi-Seller Splitting:** Checkout automatically splits multi-item orders into vendor-specific `SubOrder` records linked to parent orders.
* **Automated Escrow Hold & Maturity Release:**
  * Sub-order balances enter `ESCROW_HOLD` state (`HELD`).
  * Delivers set funds to mature after 7 days (`available_at = delivered_at + 7 days`).
  * Celery Beat background task (`release_matured_escrow_task`) automatically transfers matured escrow holds into the merchant's available payout balance.
* **Ledger Integrity & Refund Reversal:** Order refunds trigger corresponding `REFUND` ledger entries and automatically reverse held escrow funds.

### 🏢 2. Dynamic RBAC & Multi-Tenant Enterprise Scope
* **Dynamic Custom Role Generator:** Create custom organizational roles (`Store Manager`, `Stock Auditor`, `Vendor Specialist`) with granular permission codes.
* **Granular Permission Matrix:** Enforces 9+ permission scopes (`outlet:stock:read`, `outlet:stock:write`, `outlet:staff:approve`, `enterprise:roles:read`, `enterprise:roles:write`, `enterprise:roles:assign`, `enterprise:orders:manage`, `enterprise:products:manage`, `enterprise:coupons:manage`).
* **Hierarchical Approval Chain:** Onboarding pipeline for Managers (`MANAGER_ONBOARDING`), Staff (`STAFF_ONBOARDING`), and Vendors (`VENDOR_REGISTRATION`).
* **Hierarchical User Deletion:** Super Admins can manage and delete vendor or staff accounts, while store managers control staff within assigned outlet scopes.

### 🎟️ 3. Advanced Promotional Coupon Engine
* **Global & Per-User Usage Caps:** Configure global redemption caps (e.g., valid for first 50 customers) and per-user account limits. Automatically sets status to `AUTO-DEACTIVATED` upon cap reach.
* **Cart Hint Badges & Redemption Ledger:** Real-time discount calculation hints in the Cart UI tracked via the `CouponRedemption` ledger.

### 🎨 4. "Trading Floor Editorial" Design System (`/frontend`)
* **Editorial Aesthetic Tokens:** Built with Instrument Serif, Inter Tight, and JetBrains Mono. Flat paper surfaces (`--paper`, `--bone`, `--paper-sunk`), hairline borders (`1px solid var(--rule)`), and Signal Red (`#E5321B`) CTAs.
* **Tabular Monospace Numerics:** All prices, stock counts, order SKUs, and timers use `font-variant-numeric: tabular-nums` with zero-padded formatting (`$099.99`).
* **Delivery-Gated Product Reviews:** Verified purchase check preventing users from reviewing products unless they have a verified delivered order.

### ⚡ 5. High-Concurrency Distributed Backend (`/backend`)
* **Redis Lua Atomic Stock Lock:** High-concurrency inventory holds executed atomically via Redis Lua scripts to eliminate race conditions and row locking.
* **Transactional Outbox Pattern:** Ensures atomic database updates by writing domain models (`Order`) and event payloads (`OutboxEvent`) within a single PostgreSQL transaction.
* **Celery Beat Scheduler:** Periodic tasks for automated escrow release, hold expirations, and background notifications.
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

## 🔑 Default Credentials

- **Super Admin Account:**
  - **Email:** `admin@flashsale.com`
  - **Password:** `Password123`

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
.venv\Scripts\python.exe -m pytest tests/
```

---

## 📄 License
Distributed under the MIT License. Built for high-scale e-commerce, flash sale applications, and multi-seller marketplaces.
