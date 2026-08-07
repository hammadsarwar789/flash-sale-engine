# ⚡ Master Platform Documentation: High-Scale Distributed Flash Sale Engine & Multi-Vendor Marketplace

A comprehensive, production-grade technical manual for the **High-Scale Flash Sale Engine & Multi-Vendor Marketplace Platform**. This document covers end-to-end architecture, backend microservices, distributed systems patterns, database schemas, frontend design tokens, API route specifications, performance optimizations, SEO standards, and deployment procedures.

---

## 📑 Table of Contents
1. [Executive Summary & Architectural Overview](#1-executive-summary--architectural-overview)
2. [Backend Technical Architecture (`/backend`)](#2-backend-technical-architecture-backend)
   - [2.1 Application Factory & Core Configuration](#21-application-factory--core-configuration)
   - [2.2 PostgreSQL Database Schemas & Data Layer](#22-postgresql-database-schemas--data-layer)
   - [2.3 High-Concurrency Distributed Systems Patterns](#23-high-concurrency-distributed-systems-patterns)
   - [2.4 Mid-Level Services & Business Logic Layer](#24-mid-level-services--business-logic-layer)
   - [2.5 Complete REST API Endpoint Directory](#25-complete-rest-api-endpoint-directory)
   - [2.6 Asynchronous Worker Topology & Celery Beat Scheduler](#26-asynchronous-worker-topology--celery-beat-scheduler)
3. [Frontend Technical Architecture (`/frontend`)](#3-frontend-technical-architecture-frontend)
   - [3.1 "Trading Floor Editorial" Design System](#31-trading-floor-editorial-design-system)
   - [3.2 API Client & State Management Infrastructure](#32-api-client--state-management-infrastructure)
   - [3.3 16 Dedicated Views & Interactive Portals](#33-16-dedicated-views--interactive-portals)
4. [Performance, SEO & Accessibility Standards](#4-performance-seo--accessibility-standards)
   - [4.1 Vite Bundle Optimization & Chunking](#41-vite-bundle-optimization--chunking)
   - [4.2 LCP & Responsive Image Optimization](#42-lcp--responsive-image-optimization)
   - [4.3 Search Engine Optimization (SEO: 100)](#43-search-engine-optimization-seo-100)
   - [4.4 Accessibility & Contrast Compliance (Accessibility: 100)](#44-accessibility--contrast-compliance-accessibility-100)
5. [Repository Structure & Local Operations Guide](#5-repository-structure--local-operations-guide)

---

## 1. Executive Summary & Architectural Overview

The **Flash Sale Engine** is designed to handle high-concurrency event-driven flash sales (thousands of requests per second for limited items) while supporting a multi-tenant multi-vendor marketplace.

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

### Technology Stack
- **Frontend Stack:** React 18, Vite 5, TypeScript 5, TanStack React Query v5, React Router DOM v6, Custom CSS ("Trading Floor Editorial" v2 tokens).
- **Backend Stack:** Python 3.10+, Flask REST API, PostgreSQL (SQLAlchemy ORM + Alembic migrations), Redis (In-memory Lua stock locks, rate limiting, idempotency locks, session caching), Celery + RabbitMQ (Async workers, scheduled tasks via Celery Beat, Outbox publisher relay), OpenAPI / Swagger documentation (`/docs`).

---

## 2. Backend Technical Architecture (`/backend`)

### 2.1 Application Factory & Core Configuration
- **Application Factory Pattern (`create_app` in [`app/__init__.py`](file:///d:/Flash%20Sale%20Engine/backend/app/__init__.py)):** Dynamically instantiates Flask applications based on environment configuration (`DevelopmentConfig`, `ProductionConfig`, `TestingConfig` in [`app/core/config.py`](file:///d:/Flash%20Sale%20Engine/backend/app/core/config.py)). Solves circular imports when initializing extensions (`db`, `migrate`, `redis_client`, `celery_app`, `smorest_api`).
- **Database Schema Sync ([`app/core/db_init.py`](file:///d:/Flash%20Sale%20Engine/backend/app/core/db_init.py)):** Automatically migrates tables, enforces high-performance composite indexes (`idx_products_available_stock`, `idx_orders_user_id`), and seeds default admin, outlets, permissions, and sample catalog items.

---

### 2.2 PostgreSQL Database Schemas & Data Layer (`app/models/`)

The platform's relational storage layer consists of 24+ ORM models with check constraints, optimistic version locking, and index optimizations:

| Model | File | Key Columns & Constraints | Description |
| :--- | :--- | :--- | :--- |
| **`User`** | [`user.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/user.py) | `id` (UUID), `email` (Unique), `password_hash`, `role`, `user_type`, `status` | Identity management (`customer`, `admin`, `vendor`, `outlet_manager`, `stock_operator`). Enforces salted PBKDF2 hashing. |
| **`Seller`** | [`seller.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/seller.py) | `id` (UUID), `user_id`, `store_name`, `status`, `available_balance`, `held_escrow_balance` | Merchant store profiles, business registration numbers, tax IDs, KYC approval status, and financial balances. |
| **`Tenant` & `Outlet`** | [`tenant.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/tenant.py) | `id`, `code`, `name`, `is_hq`, `tenant_id` | Multi-tenant organizational hierarchy and physical retail store branch modeling. |
| **`OutletInventory`** | [`outlet_inventory.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outlet_inventory.py) | `outlet_id`, `product_id`, `available_stock`, `reorder_level` | Branch-specific inventory mapping supporting inter-outlet stock transfers. |
| **`Product`** | [`product.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product.py) | `id` (UUID), `sku` (Unique), `seller_id`, `total_stock`, `available_stock`, `version` | Catalog model with **Optimistic Locking** (`version` counter) and DB Check Constraints (`available_stock >= 0`). |
| **`ProductVariant`** | [`product_variant.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product_variant.py) | `id` (UUID), `product_id`, `sku`, `color`, `size`, `available_stock`, `price` | Variant matrix modeling color, size, and material combinations with distinct stock pools. |
| **`Category`** | [`category.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/category.py) | `id` (UUID), `name`, `slug`, `parent_id` | Product taxonomy classification tree. |
| **`Cart` & `CartItem`** | [`cart.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/cart.py) | `user_id`, `product_id`, `variant_id`, `quantity`, `reserved_until` | Multi-seller cart state with hold expiration timer tracking. |
| **`Order`** | [`order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order.py) | `id` (UUID), `user_id`, `status`, `idempotency_key` (Unique), `expires_at` | Order lifecycle records (`PENDING`, `RESERVED`, `PAID`, `CANCELLED`, `EXPIRED`, `REFUNDED`). Unique idempotency key prevents duplicates. |
| **`SubOrder`** | [`sub_order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/sub_order.py) | `id` (UUID), `order_id`, `seller_id`, `subtotal`, `commission_amount`, `status` | Merchant-specific sub-order split records for multi-seller checkouts. |
| **`OrderItem`** | [`order_item.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order_item.py) | `order_id`, `sub_order_id`, `product_id`, `variant_id`, `unit_price`, `quantity` | Itemized line item snapshot at time of purchase. |
| **`LedgerEntry`** | [`financials.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/financials.py) | `id` (UUID), `seller_id`, `entry_type`, `amount`, `status`, `available_at` | Double-entry accounting system (`ESCROW_HOLD`, `RELEASED`, `REFUND`, `PAYOUT`) with maturity timestamp checks. |
| **`OutboxEvent`** | [`outbox.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outbox.py) | `id` (UUID), `aggregate_type`, `aggregate_id`, `event_type`, `payload` (JSON), `status` | Implements the **Transactional Outbox Pattern** (`PENDING`, `PUBLISHED`, `FAILED`). |
| **`Coupon` & `Redemption`** | [`coupon.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/coupon.py) | `code`, `discount_type`, `discount_value`, `max_redemptions`, `redemption_count` | Promotional coupon rules engine with account and global usage limits. |
| **`Review`** | [`review.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/review.py) | `user_id`, `product_id`, `rating`, `comment`, `is_verified_buyer` | Customer reviews gated by verified order delivery checks. |
| **`Wishlist`** | [`wishlist.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/wishlist.py) | `user_id`, `product_id` | User product bookmarks. |
| **`Logistics`** | [`logistics.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/logistics.py) | `order_id`, `tracking_number`, `carrier`, `status` | Shipment dispatch tracking and courier webhook status updates. |
| **`ReturnRequest` & `Dispute`** | [`return_request.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/return_request.py), [`dispute.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/dispute.py) | `order_id`, `reason`, `status`, `resolution_type` | Return request inspection and vendor dispute resolution workflow. |
| **`Approval`** | [`approval.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/approval.py) | `request_type`, `applicant_email`, `status`, `target_outlet_id` | Multi-stage onboarding queue (`VENDOR_REGISTRATION`, `MANAGER_ONBOARDING`, `STAFF_ONBOARDING`). |
| **`TaskLog`** | [`task_log.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/task_log.py) | `task_id`, `task_name`, `status`, `execution_time_ms` | Async Celery background worker execution audit log. |
| **`Ticket` & `TicketMessage`** | [`ticket.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/models/ticket.py) | `id`, `customer_id`, `vendor_id`, `status`, `message_count`, `assigned_agent_id` | Customer support ticket system featuring composite indexes (`idx_tickets_customer_status`, `idx_tickets_agent_status`) and `message_count` cache. |

---

### 2.3 High-Concurrency Distributed Systems Patterns

To handle flash sale spikes without database connection pool crashes or inventory overselling, the engine uses low-level distributed patterns:

1. **Atomic In-Memory Redis Lua Stock Locks ([`app/services/inventory_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_service.py)):**
   - `LUA_RESERVE_STOCK`: Single-threaded atomic script in Redis verifying `product:{id}:stock >= qty`, decrementing stock, and incrementing `product:{id}:hold`. Prevents Time-of-Check to Time-of-Use (TOC-TOU) race conditions and row-lock contention.
   - `LUA_RELEASE_STOCK`: Restores expired or cancelled hold stock back to the available pool.
   - `LUA_RESERVE_MULTI_STOCK`: Reserves stock across multi-item cart checkouts in a single atomic Redis call.
   - **Automatic DB Fallback:** Uses `db.session.query(Product).with_for_update()` pessimistic row locks if Redis connection is unavailable.
2. **Transactional Outbox Pattern ([`app/services/order_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_service.py)):**
   - Solves the dual-write problem by inserting domain entities (`Order`, `SubOrder`, `LedgerEntry`) and an `OutboxEvent` within the exact same PostgreSQL transaction.
   - A background publisher daemon ([`app/workers/publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py)) continuously polls pending outbox records and publishes them reliably to RabbitMQ.
   - Features automatic Redis stock rollback compensation if the database transaction fails.
3. **Distributed Idempotency Layer ([`app/api/decorators/idempotent.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/idempotent.py)):**
   - Locks concurrent incoming API requests using Redis key `idempotency:<key>`. Rejects duplicate active attempts with `409 Conflict` and caches response payloads for instant replay on client retries.
4. **Sliding-Window Rate Limiting ([`app/api/decorators/rate_limit.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/decorators/rate_limit.py)):**
   - Prevents API abuse using Redis Sorted Sets (`ZSET`) to count requests within a rolling time window per user/IP (`limit=10000, period=60`).

---

### 2.4 Mid-Level Services & Business Logic Layer (`app/services/`)

- **`OrderService` & `OrderSplitter` ([`order_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_service.py), [`order_splitter.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/order_splitter.py)):** Partition multi-seller cart checkouts into distinct merchant `SubOrder` records. Compute sub-totals, platform commission deductions, and coupon discounts.
- **`EscrowEngine` ([`escrow_engine.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/escrow_engine.py)):** Writes double-entry ledger records (`ESCROW_HOLD`) upon order delivery. Enforces a 7-day maturity delay window (`available_at = delivered_at + 7 days`). Automated daily Celery Beat task (`release_matured_escrow_task`) sweeps and releases matured holds into vendor payouts. Automatically processes refund reversals.
- **Vector Cosine Similarity RAG AI Support Assistant ([`ai_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/services/ai_service.py)):** Computes term-frequency vector similarity over platform policy documentation:
  $$\text{Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \|D\|}$$
  Automated first-line bot responder (`SYSTEM_AI_BOT`) answers general queries when confidence $\ge 0.85$ and routes product defect tickets directly to the merchant's portal queue.
- **`MultiOutletService` ([`multi_outlet_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/multi_outlet_service.py)):** Manages stock allocations across multiple retail outlets and processes inter-outlet stock transfers.
- **`InspectionService` ([`inspection_service.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inspection_service.py)):** Handles physical inspection of return items before authorizing Path A (Refund) or Path B (Exchange).

---

### 2.5 Complete REST API Endpoint Directory (`app/api/v1/`)

#### 🔐 Auth & Identity (`/api/v1/auth`)
* `POST /auth/register` - Register customer, seller, or staff account.
* `POST /auth/login` - Authenticate credentials and receive JWT Bearer token.
* `POST /auth/forgot-password` - Request password reset token.
* `POST /auth/reset-password` - Reset account password with token.
* `GET  /auth/verify-email` - Verify email address token.

#### 🛍️ Products & Catalog (`/api/v1/products`)
* `GET  /products` - List products with pagination, search, category, and sort filters.
* `GET  /products/:id` - Fetch single product details, variants, and reviews.
* `POST /products` - Create product (Admin / Seller).
* `PUT  /products/:id` - Update product attributes and variants.
* `DELETE /products/:id` - Soft-delete product.
* `POST /products/:id/warmup` - Pre-load database stock into Redis in-memory cache.
* `POST /products/:id/reconcile` - Reconcile Redis in-memory stock against PostgreSQL database.

#### 🛒 Cart & Hold Timer (`/api/v1/cart`)
* `GET  /cart` - View active cart contents, vendor groupings, and remaining hold duration.
* `POST /cart/items` - Add item/variant to cart and trigger Redis Lua stock hold.
* `PUT  /cart/items/:id` - Update item quantity in cart.
* `DELETE /cart/items/:id` - Remove item from cart and release Redis stock hold.

#### 💳 Orders & Checkout (`/api/v1/orders`)
* `POST /orders/reserve` - Flash sale order placement endpoint (`HTTP 202 Accepted`) with idempotency lock.
* `POST /orders/checkout` - Checkout multi-item cart into sub-orders.
* `POST /orders/guest-checkout` - Guest checkout endpoint (no JWT required).
* `GET  /orders` - List current user's order history.
* `GET  /orders/:id` - Retrieve order details and merchant sub-order breakdown.
* `POST /orders/:id/pay` - Process order payment (Simulated gateway / COD).
* `POST /orders/:id/cancel` - Cancel unpaid reservation and immediately release inventory back to pool.

#### 🏬 Merchant Vendor Portal (`/api/v1/vendor`)
* `POST /vendor/onboard` - Submit vendor business profile and KYC documentation.
* `GET  /vendor/profile` - Fetch merchant store status and KYC approval state.
* `GET  /vendor/products` - List seller's catalog items.
* `GET  /vendor/financials` - View double-entry ledger, escrow holds, and available payout balance.
* `POST /vendor/payouts` - Submit payout withdrawal request.

#### 🏢 Enterprise Administration (`/api/v1/admin`)
* `GET  /admin/approvals` - List pending onboarding approval requests.
* `POST /admin/approvals/:id/approve` - Approve merchant KYC or staff onboarding application.
* `POST /admin/approvals/:id/reject` - Reject onboarding request.
* `GET  /admin/users` - User directory list.
* `DELETE /admin/users/:id` - Delete user account (Super Admin scope).
* `GET  /admin/coupons` - List promotional discount coupons.
* `POST /admin/coupons` - Create new promo coupon code.

#### 🏷️ Dynamic RBAC Roles (`/api/v1/roles`)
* `GET  /roles` - List registered enterprise roles and assigned permission codes.
* `POST /roles` - Create custom dynamic role with checkbox permission matrix.
* `POST /roles/assign` - Assign role to a staff member.

#### 📦 Commerce, Reviews & Logistics (`/api/v1/commerce`, `/api/v1/logistics`)
* `POST /commerce/reviews` - Submit product review (gated by delivered order check).
* `POST /commerce/wishlist/toggle` - Add/remove product from user wishlist.
* `GET  /logistics/shipments/:id` - Fetch shipment status and courier tracking history.
* `POST /commerce/returns` - Submit order item return request.

#### 💬 Customer & Vendor Support Desk (`/api/v1/support`)
* `GET  /support/tickets` - List support tickets.
* `POST /support/tickets` - Open new support ticket (purchaser verification enforced).
* `POST /support/tickets/:id/reply` - Add message to ticket thread.
* `POST /support/tickets/:id/suggest-reply` - Run Vector Cosine RAG engine to generate suggested reply draft.

---

### 2.6 Asynchronous Worker Topology & Celery Beat Scheduler

- **Gunicorn WSGI Master Server ([`gunicorn.conf.py`](file:///d:/Flash%20Sale%20Engine/backend/gunicorn.conf.py)):** Manages `gthread` worker pool (CPU cores $\times 2 + 1$ workers, 2 threads per worker).
- **Celery Async Workers ([`app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py)):**
  - `process_payment_task`: Asynchronous payment processing gateway.
  - `schedule_order_expiry_task`: 10-minute order reservation expiration handler.
  - `release_matured_escrow_task`: Automated daily escrow release scheduled via Celery Beat at 02:00 UTC.
  - `process_new_ticket_task`: AI RAG support ticket auto-responder worker.
- **Publisher Relay Daemon ([`app/workers/publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py)):** Polling relay process pushing pending outbox events from `OutboxEvent` table to RabbitMQ exchange.

---

## 3. Frontend Technical Architecture (`/frontend`)

### 3.1 "Trading Floor Editorial" Design System
Built around an editorial aesthetic inspired by modern financial publishing:
- **Design Tokens ([`src/index.css`](file:///d:/Flash%20Sale%20Engine/frontend/src/index.css)):** Flat paper surfaces (`--paper: #FBF9F4`, `--bone: #F4F1EA`, `--paper-sunk: #EDE8DC`), high-contrast ink typography (`--ink: #111111`, `--graphite: #3A3A38`), 1px hairline rules (`--rule: #DCD6C8`), Signal Red (`--signal: #E5321B`) CTAs, and verified contrast ash (`--ash: #59564E`).
- **Tabular Monospace Numerics:** All currency prices, stock counts, timers, and SKU numbers use `font-variant-numeric: tabular-nums` with zero-padded formatting (`$099.99`).

---

### 3.2 API Client & State Management Infrastructure
- **Central API Client Wrapper ([`src/api/client.ts`](file:///d:/Flash%20Sale%20Engine/frontend/src/api/client.ts)):** Handles `apiFetch()`, attaching `Authorization: Bearer <token>`, `Idempotency-Key` headers, and automatic token refresh on `401 Unauthorized` responses.
- **Feature API Modules (`src/api/`):** `auth.ts`, `products.ts`, `cart.ts`, `orders.ts`, `vendor.ts`, `admin.ts`, `support.ts`, `commerce.ts`.
- **Custom React Query Hooks (`src/hooks/`):** `useCatalog`, `useCart`, `useOrders`, `useWishlist`, `AuthContext`.

---

### 3.3 16 Dedicated Views & Interactive Portals (`src/pages/`)

1. **Floor Catalog (`/products` & [`ProductsPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/ProductsPage.tsx)):** High-density 4-column product grid, serial counter badge (`Nº 001`), live signal dot indicator, monospace stock block gauges (`▓▓▓▓▓░░░`), category filter chips, and accessible sort dropdown (`<label htmlFor="sort-select">`).
2. **Product Detail View (`/products/:id` & [`ProductDetailPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/ProductDetailPage.tsx)):** High-res image gallery with LCP priority hints, variant picker matrix, live stock meter, delivery-gated customer reviews, dynamic page title, meta description, and JSON-LD `Product` schema.
3. **Cart & Hold Timer (`/cart` & [`CartPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/CartPage.tsx)):** Active inventory hold countdown timer (10 min with `localStorage` persistence), merchant store line-item grouping, promo coupon code validation, and sticky order subtotal summary.
4. **Worldwide Checkout (`/checkout` & [`CheckoutPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/CheckoutPage.tsx)):** 720px single-column stack, ISO 200+ shipping address picker, multi-seller sub-order breakdown preview, payment method selection (Credit/Debit Card with test card auto-fill, Cash on Delivery / COD), single-click order placement.
5. **Customer Orders (`/orders` & [`OrdersPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/OrdersPage.tsx)):** Order status tracker timeline (`PENDING`, `PAID`, `FULFILLED`, `CANCELLED`).
6. **Order Detail (`/orders/:id` & [`OrderDetailPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/OrderDetailPage.tsx)):** Itemized sub-order view, shipping address details, courier tracking updates, support ticket trigger, and return request creation.
7. **Merchant Store Portal (`/vendor` & [`VendorPortalPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/VendorPortalPage.tsx)):** Seller portal featuring store profile setup, KYC status, sales analytics, financial escrow ledger, payout requests, and full catalog CRUD with variant matrix.
8. **Enterprise Admin Floor (`/admin` & [`AdminPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/AdminPage.tsx)):** Role-gated admin suite with multi-outlet stock telemetry, onboarding approval queue (`VENDOR_REGISTRATION`, `MANAGER_ONBOARDING`, `STAFF_ONBOARDING`), custom RBAC role creator, user directory deletion, and coupon rules engine.
9. **Support Portal (`/support` & [`SupportPortalPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/SupportPortalPage.tsx)):** Ticket thread view, agent assignment, AI RAG suggested reply button with confidence metrics, document citations, and automatic routing.
10. **Wishlist (`/wishlist` & [`WishlistPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/WishlistPage.tsx)):** Bookmarked product gallery with quick add-to-cart actions.
11. **Authentication Views:** [`LoginPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/LoginPage.tsx), [`RegisterPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/RegisterPage.tsx), [`ForgotPasswordPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/ForgotPasswordPage.tsx), [`ResetPasswordPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/ResetPasswordPage.tsx), [`VerifyEmailPage.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/pages/VerifyEmailPage.tsx).

---

## 4. Performance, SEO & Accessibility Standards

### 4.1 Vite Bundle Optimization & Chunking ([`vite.config.ts`](file:///d:/Flash%20Sale%20Engine/frontend/vite.config.ts))
Configured `manualChunks` in `rollupOptions.output` separating vendor libraries into dedicated cached chunks:
- `dist/assets/icons.js` (5.64 kB) – `lucide-react` icons.
- `dist/assets/query.js` (36.77 kB) – `@tanstack/react-query`.
- `dist/assets/vendor.js` (163.02 kB) – `react`, `react-dom`, `react-router-dom`.

---

### 4.2 LCP & Responsive Image Optimization ([`ProductGallery.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/components/product/ProductGallery.tsx), [`ProductCard.tsx`](file:///d:/Flash%20Sale%20Engine/frontend/src/components/product/ProductCard.tsx))
- **Hero Image Priority Hints:** Applied `fetchPriority="high"`, `loading="eager"`, and `decoding="sync"` to the main hero product image on product detail pages.
- **Responsive `srcSet` & `sizes`:** Product cards request optimized `w=400` thumbnails with `srcSet="${img400} 400w, ${img800} 800w"` and `sizes="(max-width: 640px) 100vw, 400px"`, reducing resource download size by ~49 KiB per card.

---

### 4.3 Search Engine Optimization (SEO: 100)
- **Asynchronous Font Loading ([`index.html`](file:///d:/Flash%20Sale%20Engine/frontend/index.html)):** Google Fonts stylesheet loaded asynchronously via `<link rel="preload" as="style">` and `media="print" onload="this.media='all'"`, eliminating 250 ms render-blocking delay.
- **Valid Crawl Control ([`robots.txt`](file:///d:/Flash%20Sale%20Engine/frontend/public/robots.txt)):** Created valid `public/robots.txt` structure allowing `/` and `/products/` while blocking administrative (`/admin/`, `/vendor/`, `/checkout/`, `/cart/`, `/api/`) paths.
- **Dynamic Metadata & JSON-LD Schema:** Dynamically updates `document.title`, `<meta name="description">`, and injects Schema.org `Product` JSON-LD (`application/ld+json`) structured data.

---

### 4.4 Accessibility & Contrast Compliance (Accessibility: 100)
- **Label Associations:** Added explicit `<label htmlFor="...">` with `sr-only` class and `aria-label` attributes to all `<select>` elements (`sort-select`, `account-type-select`, `target-outlet-select`, `status-filter-select`, `priority-filter-select`, `payout-method-select`, `vendor-cat-select`).
- **Sequential Heading Descent:** Enforced clean heading hierarchy (`<h1>` → `<h2>` → `<h3>`) across all pages without skipping levels.
- **AAA/AA Text Contrast:** Verified `--ash` text tokens in light (`#59564E`) and dark (`#B5B2A3`) themes satisfy WCAG AAA/AA minimum 4.5:1 contrast requirements against all paper backgrounds.

---

## 5. Repository Structure & Local Operations Guide

```text
flash-sale-engine/
├── DOCUMENTATION.md          # Master Platform Documentation & Manual
├── README.md                 # System showcase & quickstart
├── locustfile.py             # High-scale load testing benchmark script
│
├── backend/                  # Python Flask REST API & Async Workers
│   ├── app/                  # Application core, blueprints, models, services
│   │   ├── api/v1/           # REST endpoints (Auth, Products, Cart, Orders, Admin, Vendor, Support, Logistics, Roles)
│   │   ├── core/             # Database extensions, security, rate limiting, RBAC authorization, DB seeders
│   │   ├── customer_support/ # Vector Cosine RAG engine, ticket models, schemas, and AI workers
│   │   ├── models/           # SQLAlchemy ORM models (24+ models)
│   │   ├── schemas/          # Marshmallow validation schemas
│   │   ├── services/         # InventoryService (Lua), OrderService, EscrowEngine, OrderSplitter, PaymentService
│   │   └── workers/          # Celery tasks (Escrow release beat, outbox publisher relay, order expiry)
│   ├── tests/                # Automated pytest suite (41 passing tests)
│   ├── wsgi.py               # WSGI server entry point
│   ├── gunicorn.conf.py      # Production Gunicorn master process configuration
│   └── STUDY_NOTES.md        # Technical distributed systems deep dive
│
└── frontend/                 # React 18 + Vite + TypeScript SPA
    ├── public/               # Static assets & robots.txt
    ├── src/
    │   ├── api/              # Typed REST client wrappers
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

### Step 1: Start Backend API & Services

```powershell
# Navigate to backend
cd backend

# Activate Python virtual environment
.\.venv\Scripts\activate

# Run Flask REST API server
python wsgi.py
```
> REST API is available at **[http://localhost:5000](http://localhost:5000)**.
> Swagger UI documentation is available at **[http://localhost:5000/docs](http://localhost:5000/docs)**.

---

### Step 2: Start Frontend Application

```powershell
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
> React SPA is available at **[http://localhost:5173](http://localhost:5173)**.

---

### 🔑 Default Platform Credentials

- **Super Admin Account:** `admin@flashsale.com` / `Password123`
- **Vendor Account:** `vendor@flashsale.com` / `Password123`
- **Customer Account:** `customer@flashsale.com` / `Password123`

---

### 🧪 Automated Verification Suite

```powershell
# Run Backend Pytest Suite (41/41 Passing)
cd backend
.venv\Scripts\python.exe -m pytest tests/

# Run Frontend TypeScript Compilation Check (0 Errors)
cd frontend
cmd /c npx tsc --noEmit
```
