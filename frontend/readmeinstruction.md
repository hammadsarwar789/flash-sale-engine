# AGENTS.md — E-Commerce Frontend Build Spec

## Role
You are building the frontend for an existing, fully-implemented Flask e-commerce
backend. The backend is done — do not modify it. Your job is a new frontend
project that consumes it over REST.

## Workspace Location
This file lives in `frontend/` inside the existing `flash-sale-engine` repo,
as a sibling to the Flask app — not inside it:
```text
flash-sale-engine/
├── app/              # existing Flask backend — do not touch
├── wsgi.py
├── requirements.txt
└── frontend/         # ← you are building here (this is the workspace root)
    ├── AGENTS.md      # this file
    └── src/
```
Only create or modify files under `frontend/`.

## Project Context
The backend is a distributed flash-sale/e-commerce API (Flask + PostgreSQL +
Redis + RabbitMQ + Celery) exposing REST endpoints under `/api/v1`, with
interactive docs at `http://localhost:5000/docs` and a raw OpenAPI document at
`http://localhost:5000/openapi.json`. It supports: JWT auth (HttpOnly cookies),
multi-item cart, product catalog with categories and size/color variants
(each variant has independent stock), checkout with Stripe PaymentIntents,
guest checkout, coupons, reviews, wishlist, saved shipping addresses, and
order tracking through a full fulfillment lifecycle.

## Step 0 — Before writing any code
Run `npx openapi-typescript http://localhost:5000/openapi.json -o src/types/api.ts`
against the running backend and generate types from the live spec. Do not
hand-write request/response interfaces — the tables below are for routing
and page-planning, not for exact field-level typing. Re-run this whenever the
backend changes.

## Critical Rules (non-negotiable)
1. **Stack:** React 18 + Vite + TypeScript (strict mode). **Do not use
   Next.js** — this API uses cookie-based JWT auth, and splitting requests
   across server/client components adds auth complexity with no payoff here.
2. **Server state:** `@tanstack/react-query` for every API call — no manual
   `useEffect` fetch-and-setState.
3. **Routing:** `react-router-dom` v6+.
4. **Styling:** Tailwind CSS.
5. **Auth storage:** JWTs live in **HttpOnly cookies** set by the backend.
   Never store tokens in `localStorage`/`sessionStorage`. Every API call must
   set `credentials: 'include'`.
6. **Local dev networking — use a Vite proxy, not CORS.** Configure
   `vite.config.ts` to proxy `/api` to the Flask backend:
   ```ts
   // vite.config.ts
   export default defineConfig({
     server: {
       proxy: {
         '/api': { target: 'http://localhost:5000', changeOrigin: true },
       },
     },
   });
   ```
   With this in place, the browser only ever talks to the Vite origin
   (`localhost:5173`), so auth cookies are same-origin in dev — no CORS or
   `SameSite` configuration needed locally. All frontend API calls must use
   **relative paths** (e.g. `/api/v1/products`, not
   `http://localhost:5000/api/v1/products`) so they route through the proxy.
   This doesn't remove the need for CORS/`SameSite=None; Secure` in
   production, where frontend and backend live on different real domains —
   that's a backend config for deploy time, not something to solve now.
7. **Idempotency-Key:** required by the backend on `POST /orders/checkout`
   (and accepted on `guest-checkout`). Generate one UUID v4 per checkout
   *attempt*; reuse the same UUID on automatic retry of that same attempt so
   the backend's idempotency guard works as intended.
8. **Variants:** many products have size/color variants with independent
   stock. The product detail page must resolve a `variant_id` when
   variants exist, and every cart/checkout call must pass it through.
9. **🚫 Blocking dependency — login response must return the user's `role`.**
   The admin/customer split (Rule 10) requires knowing whether the logged-in
   user is `admin` immediately after login, to route them to the right area.
   Check `/docs` now for whether `POST /auth/login` returns a user object
   with a `role` field. If it doesn't, this must be added on the backend
   (either include `role` in the login response, or add
   `GET /api/v1/auth/me`) before the login page can be built correctly —
   don't fake this with a client-side workaround.
10. **Role-based redirect after login.** On successful login, read `role`
    from the response: `admin` → redirect to `/admin`; anything else →
    redirect to `/products`. Every `/admin/*` route must check this on
    mount and redirect non-admins to `/products` (or `/login` if
    unauthenticated). This is a client-side UX guard only — the backend's
    `Admin`-auth-required endpoints remain the actual security boundary.

## Backend API Reference

### Auth — `/api/v1/auth`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | None | |
| POST | `/login` | None | Sets HttpOnly access + refresh cookies |
| POST | `/refresh` | Bearer | Call on 401 from any protected request, then retry once |
| POST | `/logout` | Bearer | Revokes token server-side |
| POST | `/forgot-password` | None | |
| POST | `/reset-password` | None | |
| POST | `/verify-email` | None | |

### Products & Catalog — `/api/v1/products`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/products` | None | Search, category filter, sort, pagination via query params |
| GET | `/products/<id>` | None | Includes cached stock |
| GET | `/products/categories` | None | Hierarchical (has `parent_id`) |
| GET | `/products/<id>/variants` | None | |
| GET | `/products/<id>/reviews` | None | |
| POST | `/products/<id>/reviews` | User | Star rating + text |
| POST | `/products` | Admin | Create product, optional nested variants |
| PUT | `/products/<id>` | Admin | Update product + variants |
| DELETE | `/products/<id>` | Admin | Deactivate/delete product |
| POST | `/products/<id>/sync-stock` | Admin | Force-sync Redis stock cache with DB |
| POST | `/products/categories` | Admin | Create category |
| PUT | `/products/categories/<id>` | Admin | Update category |
| DELETE | `/products/categories/<id>` | Admin | Delete category |
| POST | `/products/<id>/variants` | Admin | Add SKU variant |
| PUT | `/products/<id>/variants/<vid>` | Admin | Update variant |
| DELETE | `/products/<id>/variants/<vid>` | Admin | Delete variant |

*(These admin rows power the `/admin` area described in Pages & Routes —
build real forms against them, not just Swagger.)*

### Cart — `/api/v1/cart`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/cart` | User | |
| POST | `/cart/items` | User | Body includes `product_id`, optional `variant_id`, `quantity` |
| PATCH | `/cart/items/<id>` | User | Update quantity |
| DELETE | `/cart/items/<id>` | User | |
| DELETE | `/cart` | User | Clear cart |

### Orders & Payment — `/api/v1/orders`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders/checkout` | User | **Requires `Idempotency-Key` header.** Computes tax automatically. |
| POST | `/orders/guest-checkout` | None | Email + item list, optional `variant_id` per item |
| POST | `/orders/payments/intent` | User | Creates Stripe PaymentIntent (idempotent per order) — use with Stripe Elements |
| GET | `/orders` | User | Order history |
| GET | `/orders/<id>` | User | Line items + fulfillment status |
| POST | `/orders/<id>/cancel` | User | Only valid while `PENDING` |

### Commerce — coupons, wishlist, addresses
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/coupons/validate` | User | Returns discount for a promo code |
| POST | `/coupons` | Admin | Create promo coupon |
| GET | `/wishlist` | User | |
| POST | `/wishlist` | User | |
| DELETE | `/wishlist/<id>` | User | |
| GET | `/shipping-addresses` | User | |
| POST | `/shipping-addresses` | User | |

### Admin — `/api/v1/admin`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Products, orders, revenue, users — powers `/admin` dashboard |
| GET | `/admin/orders` | Admin | All orders, filterable by status |
| PATCH | `/admin/orders/<id>` | Admin | Update status/tracking; setting `REFUNDED` auto-triggers the Stripe refund |
| GET | `/admin/outbox` | Admin | Outbox event stream — low priority, internal/debug view |
| GET | `/admin/users` | Admin | User directory — read-only |
| GET | `/admin/task-logs` | Admin | Celery task logs — low priority, internal/debug view |

Order status values: `PENDING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED, RETURNED`.

## Pages & Routes

| Route | Purpose |
|---|---|
| `/login`, `/register` | Auth forms |
| `/verify-email`, `/forgot-password`, `/reset-password` | Token-based flows (token read from URL query param) |
| `/products` | Catalog grid — search bar, category filter, sort, pagination |
| `/products/:id` | Detail page — image gallery, variant picker, add-to-cart, reviews list + submit form |
| `/cart` | Line items, quantity edit, coupon code input, proceed to checkout |
| `/checkout` | Shipping address select/add, order summary (subtotal/tax/total), guest-checkout toggle, Stripe Elements card form |
| `/orders` | Order history list |
| `/orders/:id` | Order detail — status, tracking, cancel button (only if `PENDING`) |
| `/wishlist` | Saved items |
| `*` | 404 |

Protected routes (`/cart`, `/checkout`, `/orders*`, `/wishlist`): redirect to
`/login` if the auth check fails.

### Admin Area (role: `admin` only) — same app, not a separate project
Gated by the `role` check in Rule 10 — reuses the existing login page and
React app.

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — `GET /admin/stats` |
| `/admin/products` | List/search products; create/edit/delete; manage variants inline |
| `/admin/categories` | List/create/edit/delete categories |
| `/admin/coupons` | Create promo coupons |
| `/admin/orders` | List all orders with status filter; update status/tracking; refund trigger |
| `/admin/users` | Read-only user directory — lowest priority |

## Suggested Folder Structure
```text
src/
├── api/
│   ├── client.ts        # fetch wrapper: relative '/api' base (proxied), credentials:'include', 401→refresh→retry
│   ├── auth.ts
│   ├── products.ts
│   ├── cart.ts
│   ├── orders.ts
│   └── commerce.ts       # coupons, reviews, wishlist, shipping addresses
├── types/
│   └── api.ts             # generated — do not hand-edit
├── hooks/                 # TanStack Query hooks wrapping api/
├── context/
│   └── AuthContext.tsx
├── components/
│   ├── layout/
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   └── ui/
├── pages/
│   └── admin/             # admin-only pages: products, categories, coupons, orders, users
├── routes.tsx
├── App.tsx
└── main.tsx
```

## Environment
Local dev uses the Vite proxy (Critical Rule 6) — no base URL needed, just
call relative `/api/...` paths. Only set an absolute URL for production,
once frontend and backend are deployed to separate domains:
```text
# .env.production (not used locally)
VITE_API_BASE_URL=https://api.yourdomain.com
```

## Definition of Done
- [ ] Auth flow works end-to-end, including silent refresh on 401
- [ ] Catalog: search, category filter, sort, pagination all functional
- [ ] Variant selection on PDP correctly flows into cart and order payloads
- [ ] Cart CRUD fully wired
- [ ] Checkout: Idempotency-Key sent, Stripe Elements confirms payment, guest checkout works
- [ ] Order history + detail + cancel (while `PENDING`) working
- [ ] Wishlist CRUD
- [ ] Reviews: list + submit with star rating
- [ ] Coupon code validates and reflects discount in order summary
- [ ] Login redirects `admin` role to `/admin`, everyone else to `/products`
- [ ] Non-admin users cannot reach `/admin/*` routes (client-side guard)
- [ ] Admin: product create/edit/delete + variant management working
- [ ] Admin: category create/edit/delete working
- [ ] Admin: coupon creation working
- [ ] Admin: order list, status update, and refund trigger working
- [ ] Responsive down to mobile width
- [ ] Vite proxy correctly forwards `/api/*` requests to the backend in dev
- [ ] (At deploy time) cross-origin cookie config verified against real production domains