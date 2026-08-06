# ⚡ High-Scale Flash Sale Engine & Multi-Vendor Marketplace Platform

A production-grade, full-stack distributed e-commerce platform, multi-vendor marketplace, and high-concurrency inventory reservation engine. Designed around **Frontend Design Specification v2 ("Trading Floor Editorial")** using **React 18 + Vite + TypeScript** and backed by an event-driven **Flask + PostgreSQL + Redis + RabbitMQ + Celery** microservice architecture.

---

## 📸 Visual Interface Showcase

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

### 🏬 4. Merchant Store Portal & Financial Escrow (`/vendor`)
*Dedicated Merchant Store Portal featuring seller account onboarding, business & KYC verification, payout withdrawal requests, double-entry financial escrow ledger, store sales analytics, and full catalog parity with Admin (SKU variants, size/color variations, discount percentages, and category assignment).*

---

### 🏢 5. Hierarchical Approval Pipeline & Multi-Tenant Control (`/admin`)
![Admin Control Rail & Approvals](frontend/public/screenshots/approvals.png)
*Role-gated Admin Control Floor featuring multi-outlet RBAC, onboarding approval pipeline, user directory deletion controls, dynamic custom role generator, promo coupon rules engine, and stock ledger telemetry.*

---

## 🏗️ System Architecture & Engineering Highlights

```text
                               ┌─────────────────────────────────────────┐
                               │       React 18 + Vite + TypeScript      │
                               │      "Trading Floor Editorial" UI       │
                               └────────────────────┬────────────────────┘
                                                    │ REST API (JSON / JWT)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │           Flask REST API Gateway        │
                               │   (@idempotent, @rate_limit, @jwt)     │
                               └────────┬───────────┬───────────┬────────┘
                                        │           │           │
                     ┌──────────────────┘           │           └──────────────────┐
                     ▼                              ▼                              ▼
      ┌─────────────────────────────┐┌─────────────────────────────┐┌─────────────────────────────┐
      │     Redis In-Memory Engine  ││    PostgreSQL DB Storage    ││   Celery + RabbitMQ Workers │
      │  • Atomic Lua Stock Locks   ││  • Relational Schema (ORM) ││  • Escrow Release Scheduler │
      │  • Idempotency Locks        ││  • Transactional Outbox    ││  • Outbox Relay Publisher   │
      │  • Sliding-Window Rate Limit││  • Optimistic Version Locks││  • AI RAG Auto-Responder    │
      └─────────────────────────────┘└─────────────────────────────┘└─────────────────────────────┘
```

---

## 🧩 Comprehensive Feature & System Map (Micro to Macro)

### 1. Database Schema & Low-Level Data Models (`backend/app/models/`)

The platform's relational layer is built on PostgreSQL with SQLAlchemy ORM, enforcing strict data integrity, optimistic locking, constraints, and audit trails:

* **`User` (`user.py`):** Identity management supporting core roles (`customer`, `admin`, `vendor`, `outlet_manager`, `stock_operator`) and dynamic custom roles. Features salted PBKDF2-HMAC-SHA256 password hashing.
* **`Seller` (`seller.py`):** Merchant profile storing business registration numbers, tax IDs, store verification status (`PENDING`, `APPROVED`, `REJECTED`), rating scores, and financial balances (`available_balance` vs `held_escrow_balance`).
* **`Product` & `ProductVariant` (`product.py`, `product_variant.py`):** Multi-SKU product model supporting variants (color, size, material), variant-specific pricing, stock allocations, discount percentages (`discount_percentage`), and version-based optimistic locking (`version` column) alongside DB check constraints (`available_stock >= 0`).
* **`Cart` & `CartItem` (`cart.py`):** Multi-seller cart state management with real-time reservation hold expiry timestamps (`reserved_until`).
* **`Order` & `SubOrder` (`order.py`, `sub_order.py`):** Core order entities. Parent `Order` handles checkout-level metadata, unique `idempotency_key`, overall status, and expiration timestamps. `SubOrder` partitions items by `seller_id` for multi-vendor checkout.
* **`OrderItem` (`order_item.py`):** Snapshot records preserving product name, unit price, quantity, and variant specifications at time of purchase.
* **`LedgerEntry` (`financials.py`):** Double-entry accounting system tracking escrow movements (`ESCROW_HOLD`, `RELEASED`, `REFUND`, `PAYOUT`) with maturity timestamp checks (`available_at`).
* **`OutboxEvent` (`outbox.py`):** Implements the **Transactional Outbox Pattern** to guarantee atomic database updates and event publishing (`PENDING`, `PUBLISHED`, `FAILED`).
* **`Coupon` & `CouponRedemption` (`coupon.py`):** Promotional code configuration including fixed amount or percentage discounts, global max redemption limits, per-user limits, minimum spend requirements, and auto-deactivation triggers.
* **`Review` (`review.py`):** Product rating and text review system gated by verified order delivery check.
* **`Wishlist` (`wishlist.py`):** User item bookmarking.
* **`Logistics` (`logistics.py`):** Courier shipment tracking records (`PENDING`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`) with tracking numbers.
* **`Approval` (`approval.py`):** Multi-stage onboarding queue tracking request types (`VENDOR_REGISTRATION`, `MANAGER_ONBOARDING`, `STAFF_ONBOARDING`) and approval actions.
* **`Customer Support` (`ticket.py`, `ticket_message.py`):** Ticket management featuring composite indexes (`customer_id + status`, `assigned_agent_id + status`), message counter caching (`message_count`), and AI RAG thread attachments.

---

### 2. High-Concurrency Systems & Resilience Patterns (`backend/app/services/` & `core/`)

To prevent database bottlenecks and race conditions during high-volume flash sales, the engine utilizes low-level distributed systems design patterns:

* **Atomic In-Memory Lua Stock Locks (`inventory_service.py`):**
  * **Stock Reservation (`reserve_stock.lua`):** Executes atomically inside Redis single-threaded engine. Verifies `product:{id}:stock >= qty` and deducts stock while incrementing `product:{id}:hold` in a single execution step. Eliminates **Time-of-Check to Time-of-Use (TOC-TOU)** race conditions and database row-lock contention.
  * **Stock Release (`release_stock.lua`):** Restores expired or cancelled hold stock atomically back to the available pool.
  * **Stock Commit (`commit_stock.lua`):** Permanently deducts held inventory upon successful payment confirmation.
* **Transactional Outbox Pattern (`order_service.py` & `outbox_service.py`):**
  * Solves the dual-write problem by inserting domain entities (`Order`, `SubOrder`, `LedgerEntry`) and an `OutboxEvent` inside the exact same PostgreSQL transaction.
  * A background publisher daemon ([`publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py)) continuously polls pending outbox entries and publishes them reliably to RabbitMQ.
  * Features automatic Redis stock rollback compensation if the database transaction fails.
* **Distributed Idempotency Layer (`@idempotent` in `security.py`):**
  * Locks concurrent incoming API requests using Redis key `idempotency:<key>`. Rejects duplicate active attempts with `409 Conflict` and caches response payloads for instant replay on client retries.
* **Sliding-Window Rate Limiting (`@rate_limit` in `security.py`):**
  * Prevents API abuse using Redis Sorted Sets (`ZSET`) to count requests within a rolling time window per user/IP.

---

### 3. Mid-Level Business Services & Financial Engines

* **Multi-Vendor Order Splitting Engine (`order_splitter.py`):**
  * Automatically segregates items in a unified cart into distinct merchant `SubOrder` entities based on `seller_id`.
  * Computes vendor-specific subtotals, platform commission fee deductions, and proportional coupon discounts.
* **Double-Entry Financial Accounting & Escrow Engine (`escrow_engine.py`):**
  * Locks seller revenues into `ESCROW_HOLD` status upon order completion.
  * Enforces a mandatory 7-day maturity delay (`available_at = delivered_at + 7 days`).
  * Celery Beat background scheduler (`release_matured_escrow_task`) automatically scans and releases matured funds daily into the seller's `available_balance`.
  * Automatic ledger adjustments for customer returns and order cancellations (`REFUND`).
* **Vector Cosine Similarity RAG AI Support Assistant (`ai_service.py`):**
  * Computes term frequency vector embeddings over platform policy documentation and customer queries:
    $$\text{Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|}$$
  * Generates grounded answer drafts with confidence scores and source document citations.
  * Automated first-line bot responder (`SYSTEM_AI_BOT`) automatically resolves policy questions when confidence $\ge 0.85$ and routes product defect issues directly to the vendor's portal queue.
* **Granular Dynamic RBAC Engine (`authorization.py`):**
  * Enforces role-based permissions (`@require_permission(...)`) across 9+ enterprise granular codes (`outlet:stock:read`, `outlet:stock:write`, `outlet:staff:approve`, `enterprise:roles:read`, `enterprise:roles:write`, `enterprise:roles:assign`, `enterprise:orders:manage`, `enterprise:products:manage`, `enterprise:coupons:manage`).
  * Allows super admins to create custom roles and assign precise permission subsets.

---

### 4. "Trading Floor Editorial" Design System (`frontend/src/`)

The frontend user experience is built around an editorial aesthetic inspired by modern trading platforms and modern financial publishing:

* **Typography & Palette:** Custom fonts (Instrument Serif for headlines, Inter Tight for interface labels, JetBrains Mono for numeric telemetry). Flat paper surfaces (`--paper`, `--bone`, `--paper-sunk`), crisp 1px borders (`1px solid var(--rule)`), and Signal Red (`#E5321B`) CTAs.
* **Tabular Monospace Numerics:** All currency values, stock counts, timers, and SKU numbers use `font-variant-numeric: tabular-nums` with zero-padded formatting (`$099.99`).
* **Interactive UI Components:**
  * Live signal dots and stock block gauges (`▓▓▓▓▓░░░`).
  * Real-time 10-minute hold countdown timer with state persistence in `localStorage`.
  * Inline product variant selector swatches (color, size, material).
  * Interactive star rating breakdown with delivery-verified badges.

---

## 💻 Frontend Views & Application Routing (`frontend/src/pages/`)

| Route | Page Component | Key Functionality & Features |
| :--- | :--- | :--- |
| `/products` | `ProductsPage.tsx` | High-density 4-column product catalog, category filters, monospace stock gauges, zero-padded pricing, and search bar. |
| `/products/:id` | `ProductDetailPage.tsx` | Multi-image gallery, variant picker matrix, live stock meter, delivery-gated customer reviews, and wishlist toggle. |
| `/cart` | `CartPage.tsx` | Reserved inventory countdown timer, seller-grouped line items, promo coupon validation hints, and order summary. |
| `/checkout` | `CheckoutPage.tsx` | Worldwide shipping address form (200+ ISO countries), multi-vendor sub-order breakdown, payment options (Credit Card / COD), test card auto-fill. |
| `/orders` | `OrdersPage.tsx` | Customer order history, status timeline badges (`PENDING`, `PAID`, `FULFILLED`, `CANCELLED`), and detail links. |
| `/orders/:id` | `OrderDetailPage.tsx` | Itemized sub-order view, shipping details, courier tracking status, support ticket trigger, and return request creation. |
| `/vendor` | `VendorPortalPage.tsx` | Seller portal: store profile setup, KYC status, sales analytics, financial escrow ledger, payout requests, and full catalog CRUD with variant matrix. |
| `/admin` | `AdminPage.tsx` | Role-gated admin floor: multi-outlet stock telemetry, onboarding approval queue (`VENDOR_REGISTRATION`, `MANAGER_ONBOARDING`, `STAFF_ONBOARDING`), custom RBAC generator, user account deletion, coupon manager. |
| `/support` | `SupportPortalPage.tsx` | Customer & vendor support desk: conversation thread, agent assignment, AI RAG suggested reply button with confidence scores and document citations. |
| `/wishlist` | `WishlistPage.tsx` | Bookmarked product gallery with quick add-to-cart actions. |
| `/login` | `LoginPage.tsx` | Secure login form with JWT token storage and role-based navigation. |
| `/register` | `RegisterPage.tsx` | Customer and Merchant store registration with business field toggle. |
| `/forgot-password` | `ForgotPasswordPage.tsx` | Request password reset token via email link. |
| `/reset-password` | `ResetPasswordPage.tsx` | Secure password reset form enforcing complexity requirements. |
| `/verify-email` | `VerifyEmailPage.tsx` | Account activation token verification. |

---

## 🌐 Complete REST API Endpoint Directory (`backend/app/api/v1/`)

### 🔐 Auth & Identity (`/api/v1/auth`)
* `POST /auth/register` - Register a new customer, seller, or staff account.
* `POST /auth/login` - Authenticate credentials and receive JWT Bearer tokens.
* `POST /auth/forgot-password` - Generate password reset token.
* `POST /auth/reset-password` - Reset account password with token.
* `GET  /auth/verify-email` - Verify user email address token.

### 🛍️ Products & Catalog (`/api/v1/products`)
* `GET  /products` - List products with pagination, search, category, and sorting filters.
* `GET  /products/:id` - Fetch single product details with active variants and reviews.
* `POST /products` - Create a new product (Admin / Seller).
* `PUT  /products/:id` - Update product attributes and SKU variants.
* `DELETE /products/:id` - Soft-delete or archive product.
* `POST /products/:id/warmup` - Pre-load database inventory levels into Redis in-memory cache.
* `POST /products/:id/reconcile` - Reconcile Redis in-memory stock against PostgreSQL database.

### 🛒 Cart & Hold Timer (`/api/v1/cart`)
* `GET  /cart` - View active cart contents, vendor groupings, and remaining hold duration.
* `POST /cart/items` - Add item/variant to cart and trigger Redis Lua inventory hold.
* `PUT  /cart/items/:id` - Update quantity in cart.
* `DELETE /cart/items/:id` - Remove item from cart and release Redis stock hold.

### 💳 Orders & Checkout (`/api/v1/orders`)
* `POST /orders/reserve` - Flash sale order placement endpoint (`HTTP 202 Accepted`) with idempotency lock.
* `POST /orders/:id/pay` - Process order payment (Simulated gateway / Cash on Delivery).
* `GET  /orders` - List current user's order history.
* `GET  /orders/:id` - Retrieve order details and sub-order merchant breakdown.
* `POST /orders/:id/cancel` - Cancel pending order and release held stock.

### 🏬 Merchant Vendor Portal (`/api/v1/vendor`)
* `POST /vendor/onboard` - Submit vendor business profile and KYC documentation.
* `GET  /vendor/profile` - Fetch current vendor store status and KYC approval state.
* `GET  /vendor/products` - List seller's catalog items.
* `GET  /vendor/financials` - View double-entry ledger, escrow holds, and available payout balance.
* `POST /vendor/payouts` - Submit payout withdrawal request.

### 🏢 Enterprise Administration (`/api/v1/admin`)
* `GET  /admin/approvals` - List pending onboarding approval requests.
* `POST /admin/approvals/:id/approve` - Approve merchant KYC or staff onboarding application.
* `POST /admin/approvals/:id/reject` - Reject onboarding request with reason.
* `GET  /admin/users` - Directory list of registered platform accounts.
* `DELETE /admin/users/:id` - Delete user account (Super Admin scope).
* `GET  /admin/coupons` - List promotional discount coupons.
* `POST /admin/coupons` - Create new coupon code with usage caps.
* `GET  /admin/telemetry` - System health, database connection pool, and Redis memory metrics.

### 🏷️ Dynamic RBAC Roles (`/api/v1/roles`)
* `GET  /roles` - List registered enterprise roles and assigned permission codes.
* `POST /roles` - Create custom dynamic role with checkbox permission matrix.
* `POST /roles/assign` - Assign role to a staff member or outlet manager.

### 📦 Commerce, Reviews & Logistics (`/api/v1/commerce` & `/api/v1/logistics`)
* `POST /commerce/reviews` - Submit product review (gated by delivered order check).
* `POST /commerce/wishlist/toggle` - Add/remove product from user wishlist.
* `GET  /logistics/shipments/:id` - Fetch shipping status and tracking history.
* `POST /commerce/returns` - Submit order item return request.

### 💬 Customer & Vendor Support Desk (`/api/v1/support`)
* `GET  /support/tickets` - List tickets (filtered by purchaser, assigned agent, or vendor ID).
* `POST /support/tickets` - Open new support ticket (purchaser verification enforced).
* `POST /support/tickets/:id/reply` - Add message to ticket thread.
* `POST /support/tickets/:id/suggest-reply` - Run Vector Cosine RAG engine to generate suggested response draft.

---

## 📁 Repository Structure

```text
flash-sale-engine/
├── backend/                  # Python Flask REST API & Async Workers
│   ├── app/                  # Application core, blueprints, models, services
│   │   ├── api/v1/           # REST endpoints (Auth, Products, Cart, Orders, Admin, Vendor, Support, Logistics, Roles)
│   │   ├── core/             # Database extensions, security, rate limiting, RBAC authorization, DB seeders
│   │   ├── customer_support/ # Vector Cosine RAG engine, ticket models, schemas, and AI workers
│   │   ├── models/           # SQLAlchemy ORM models (User, Product, Order, SubOrder, Seller, LedgerEntry, Coupon, Outbox, etc.)
│   │   ├── schemas/          # Marshmallow validation schemas
│   │   ├── services/         # InventoryService (Lua), OrderService, EscrowEngine, OrderSplitter, PaymentService
│   │   └── workers/          # Celery tasks (Escrow release beat, outbox publisher relay, order expiry)
│   ├── tests/                # Automated pytest suite (34 passing tests)
│   ├── wsgi.py               # WSGI server entry point
│   ├── STUDY_NOTES.md        # Comprehensive distributed systems technical deep dive
│   └── requirements.txt      # Python dependencies
│
└── frontend/                 # React 18 + Vite + TypeScript SPA
    ├── public/screenshots/   # Visual UI showcase screenshots
    ├── src/
    │   ├── api/              # Typed REST client wrappers (Auth, Products, Cart, Orders, Admin, Vendor, Support)
    │   ├── components/       # UI components (ProductCard, VariantPicker, HoldTimer, CouponInput, ReviewForm, Layout)
    │   ├── context/          # AuthContext session management & Bearer token handling
    │   ├── hooks/            # TanStack React Query state management hooks
    │   ├── pages/            # 16 Public & protected views (Products, Cart, Checkout, Admin, Vendor, Support, Orders, etc.)
    │   ├── routes.tsx        # React Router v6 route configuration & role guards
    │   └── types/            # TypeScript domain interfaces & API payload specs
    ├── package.json          # Node dependencies
    └── vite.config.ts        # Vite build & local proxy configuration
```

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

* **Super Admin Account:**
  * **Email:** `admin@flashsale.com`
  * **Password:** `Password123`
* **Vendor Account:**
  * **Email:** `vendor@flashsale.com`
  * **Password:** `Password123`
* **Customer Account:**
  * **Email:** `customer@flashsale.com`
  * **Password:** `Password123`

---

## 🧪 Verification & Automated Test Suite

### Backend Pytest Suite (34/34 Passing)
```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests/
```

### Frontend TypeScript Build Verification (0 Errors)
```powershell
cd frontend
cmd /c npx tsc --noEmit
```

---

## 📄 License
Distributed under the MIT License. Built for high-scale e-commerce, flash sale applications, and multi-seller marketplaces.
