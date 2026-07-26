# Improvement Roadmap — Flash Sale Engine → Full E-Commerce Backend

This document tracks the gap between the current system (a distributed flash-sale
inventory reservation engine) and a complete, general-purpose e-commerce backend.
Items are grouped by priority. Each item that changes the data model includes a
schema sketch; each item that adds routes includes the endpoints needed.

---

## P0 — Structural Gaps (blocking)

These change core data flow and should be done first — everything else builds on them.

### 1. Shopping Cart & Multi-Item Orders
The current `orders` table stores a single `product_id` + `quantity`. Real checkout
needs a cart and multi-line orders.

```text
cart_items:   id, user_id, product_id, quantity, added_at
order_items:  id, order_id, product_id, quantity, unit_price, subtotal
orders:       id, user_id, status, shipping_address_id,
              subtotal, tax, shipping_fee, total, ...
```

New endpoints:
```text
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/<id>
DELETE /api/v1/cart/items/<id>
POST   /api/v1/orders/checkout      # replaces single-product /orders/reserve
```

Impact: the Redis Lua reservation script and outbox event payload both need to
reserve/release a *set* of SKUs atomically instead of one.

### 2. Real Payment Gateway Integration
`/orders/<id>/pay` currently flips a status field. Replace with:
- Create a PaymentIntent (Stripe, or similar) at checkout
- Handle `payment_intent.succeeded` / `payment_intent.payment_failed` via webhook
- Reconcile order status from the webhook event, not the client call

```text
POST /api/v1/webhooks/stripe        # signature-verified, idempotent
```

### 3. Product Catalog Depth
Currently flat "flash sale products." Needed:
- Categories / subcategories
- Variants (size, color) with per-variant SKU and stock
- Multiple images per product
- Full CRUD — currently only `POST` and `sync-stock` exist for admins

```text
PUT    /api/v1/products/<id>
DELETE /api/v1/products/<id>
GET    /api/v1/categories
POST   /api/v1/categories           # admin
```

Plus search, filtering, sorting, and pagination on `GET /products`.

### 4. Order Lifecycle & Fulfillment
Current statuses: `PENDING, PAID, EXPIRED, CANCELLED`.
Add: `SHIPPED, DELIVERED, REFUNDED, RETURNED`.

Also needed: shipping addresses, a shipping method/cost field, and order tracking
info on the order record.

---

## P1 — Auth & Admin Completeness

### Auth
Login already returns access + refresh tokens, but these are missing:
```text
POST /api/v1/auth/refresh
POST /api/v1/auth/logout            # revoke via existing Redis blacklist
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
```
Also add CSRF protection, since JWTs are stored in HttpOnly cookies.

### Admin
Admin currently only reads stats/logs. Add the ability to act:
```text
GET   /api/v1/admin/orders
PATCH /api/v1/admin/orders/<id>     # update status, issue refund
POST  /api/v1/categories            # covered above
```

---

## P2 — Commerce Features Users Expect

- Coupons / promo codes (percentage or fixed amount, expiry, usage limits)
- Tax calculation (flat rate is a reasonable starting point)
- Product reviews & ratings
- Wishlist / favorites
- Guest checkout (optional, but common)

---

## P3 — Production Polish

- CI pipeline (lint + mypy + pytest on every push)
- Structured logging + error tracking (e.g. Sentry) — `task_logs` gives internal
  visibility but nothing external
- Gunicorn process config for `wsgi.py` (entrypoint exists, no process manager
  setup yet)
- Full-text search — Postgres `tsvector` is enough at this scale

---

## Suggested Order of Attack

1. Cart + `order_items` schema (touches the Lua script, outbox payload, and
   order service — do this first)
2. Category + variant model, full catalog CRUD
3. Payment gateway integration + webhook handling
4. Auth completeness (refresh / logout / reset / verify)
5. Admin order management
6. Coupons, tax, reviews, wishlist (additive — don't touch existing tables)
7. CI, logging/monitoring, search