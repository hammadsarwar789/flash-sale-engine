# From Flash-Sale Engine to Multi-Vendor Marketplace
### A concrete transformation plan for your Flask / Postgres / Redis / RabbitMQ / Celery backend

---

## 1. Where You Actually Are

Your system today is a **feature-complete single-seller e-commerce backend**:

- Flask + PostgreSQL + Redis + RabbitMQ + Celery
- Atomic Redis-Lua inventory reservation + transactional outbox + idempotency keys (flash-sale core)
- JWT auth with RBAC, refresh/logout/forgot-reset/verify-email flows
- Cart, multi-item checkout, product variants, categories, search/filter
- Coupons, reviews, wishlist, guest checkout, saved addresses
- Stripe payment intents (idempotent) + webhook handling (deduplicated) + admin-triggered refunds
- Admin order lifecycle management (shipped/delivered/refunded)
- CI/CD pipeline, Gunicorn, automatic schema sync

This is a strong foundation — better than most "marketplace MVPs" that skip the hard concurrency/idempotency work you already solved. The gap to Daraz/Alibaba/AliExpress-class is **not** "add more features to what exists." It's a **structural shift**: your data model currently assumes one seller. A marketplace assumes N sellers who don't trust each other, get paid separately, ship separately, and need their own tools.

---

## 2. The Core Shift, In One Sentence

> Every table and every screen that currently says "the store" needs to say "**which seller**" — and every order that currently produces one fulfillment thread needs to produce **one thread per seller in that cart**.

Everything else in this document (escrow, sub-orders, vendor portal, logistics hub) is a consequence of that one sentence.

---

## 3. Gap Analysis — What's Actually Missing

| Capability | Current State | Gap | Why It's Load-Bearing |
|---|---|---|---|
| Seller identity | Single owner/admin account | No `sellers` entity, no tenant boundary | Every other gap depends on this existing first |
| Catalog ownership | Products belong to "the store" | No `seller_id` on products | Can't attribute stock, sales, or payouts to a vendor |
| Order model | 1 order = 1 seller, 1 fulfillment thread | No order-splitting | A cart with 3 vendors needs 3 independent PENDING→DELIVERED lifecycles |
| Payments | Direct Stripe capture to your account | No escrow, no split payouts, no commission calc | You currently have no way to pay a vendor *their* share and keep yours |
| Inventory | Redis-Lua reservation assumes one stock pool | No per-seller / per-warehouse routing | Multi-vendor = multi-location stock with independent owners |
| Logistics | Shipping address only, no carrier concept | No shipment entity, no 3PL/carrier integration, no tracking lifecycle | Can't route, label, or track sub-orders independently |
| RBAC | Presumably admin vs. customer | No `seller_owner`, `seller_staff`, `logistics_manager`, `support_agent`, `compliance_officer` roles | New personas need real permission boundaries, not shared admin access |
| Vendor onboarding | None | No KYC/business-verification workflow | Legal + trust requirement before letting a stranger sell on your platform |
| Reputation | Product reviews only | No seller-level rating/reputation | Buyers in a marketplace trust *sellers*, not just products |
| Disputes | None | No buyer-seller mediation, no case queue | Needed the moment two parties (not you) can disagree about a delivery |
| Notifications | Celery workers, customer-facing | No vendor-facing channel (new order, low stock, payout sent) | Vendors are now a first-class user you must talk to |
| Search at scale | Category + text filter | No seller-aware facets, no relevance ranking for thousands of sellers | Fine at 1 seller, breaks down at 500+ |

Everything below is the concrete fix for each row.

---

## 4. New Data Model

These build directly on your existing `users`, `products`, `categories`, `orders`, `order_items` tables — adjust names if yours differ.

```sql
-- ============================================================
-- SELLER IDENTITY
-- ============================================================

CREATE TABLE sellers (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    store_name VARCHAR(150) NOT NULL,
    store_slug VARCHAR(150) UNIQUE NOT NULL,
    business_registration_no VARCHAR(100),
    tax_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- pending, approved, suspended, rejected
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    payout_method VARCHAR(30),                        -- bank_transfer, stripe_connect, wallet
    payout_account_ref VARCHAR(150),                  -- IBAN / Stripe Connect ID / wallet ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sub-users under a seller (owner, manager, staff)
CREATE TABLE seller_staff (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    role VARCHAR(30) NOT NULL DEFAULT 'staff',        -- owner, manager, staff
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(seller_id, user_id)
);

CREATE TABLE seller_kyc_documents (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,                    -- cnic, business_license, tax_certificate
    file_url VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted',  -- submitted, verified, rejected
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CATALOG OWNERSHIP + WAREHOUSES
-- ============================================================

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES sellers(id),         -- NULL = platform-owned fulfillment center
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE products ADD COLUMN seller_id INTEGER REFERENCES sellers(id);
ALTER TABLE products ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id);

-- ============================================================
-- ORDER SPLITTING
-- ============================================================

CREATE TABLE sub_orders (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',    -- pending, packed, shipped, delivered, returned, cancelled
    subtotal NUMERIC(10,2) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    seller_payout_amount NUMERIC(10,2) NOT NULL,
    shipment_id INTEGER,                              -- FK added after shipments table below
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_items ADD COLUMN sub_order_id INTEGER REFERENCES sub_orders(id);

-- ============================================================
-- FINANCIAL ENGINE (escrow + commission + payouts)
-- ============================================================

CREATE TABLE commission_rules (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    seller_id INTEGER REFERENCES sellers(id),         -- overrides category rule if set
    rate NUMERIC(5,2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only financial ledger, one row per money movement
CREATE TABLE ledger_entries (
    id SERIAL PRIMARY KEY,
    sub_order_id INTEGER NOT NULL REFERENCES sub_orders(id),
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    entry_type VARCHAR(30) NOT NULL,                  -- escrow_hold, escrow_release, commission_deduction, refund, payout
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'held',        -- held, released, paid_out, reversed
    available_at TIMESTAMPTZ,                          -- when escrow unlocks (delivery + return window)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payout_requests (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested',   -- requested, processing, paid, rejected
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- ============================================================
-- LOGISTICS
-- ============================================================

CREATE TABLE carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    api_identifier VARCHAR(50),                        -- e.g. 'leopards', 'tcs', 'dhl'
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE shipments (
    id SERIAL PRIMARY KEY,
    sub_order_id INTEGER NOT NULL REFERENCES sub_orders(id),
    carrier_id INTEGER REFERENCES carriers(id),
    tracking_number VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'label_created', -- label_created, picked_up, in_transit, out_for_delivery, delivered, failed
    proof_of_delivery_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sub_orders ADD CONSTRAINT fk_sub_orders_shipment
    FOREIGN KEY (shipment_id) REFERENCES shipments(id);

-- ============================================================
-- TRUST & SUPPORT
-- ============================================================

CREATE TABLE seller_ratings (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL REFERENCES sellers(id),
    sub_order_id INTEGER NOT NULL REFERENCES sub_orders(id),
    rated_by INTEGER NOT NULL REFERENCES users(id),
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
    id SERIAL PRIMARY KEY,
    sub_order_id INTEGER NOT NULL REFERENCES sub_orders(id),
    raised_by INTEGER NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',        -- open, under_review, resolved, escalated
    resolution_notes TEXT,
    assigned_to INTEGER REFERENCES users(id),          -- support agent
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
```

---

## 5. Backend Service Architecture

```
app/
├── auth/                      (existing — extend JWT claims with seller_id + role)
├── catalog/                   (existing — scope writes to request.seller_id)
├── cart/                      (existing — cart can now hold items from N sellers)
├── orders/                    (existing — extend: trigger order_splitter post-payment)
├── payments/                  (existing Stripe integration — extend with escrow hooks)
│
├── vendor/                    # NEW blueprint → /api/vendor/*
│   ├── onboarding.py          # KYC submission, store setup
│   ├── products.py            # CRUD scoped to seller_id, bulk CSV import
│   ├── fulfillment.py         # sub-order queue, pack/ship actions
│   ├── finance.py             # ledger view, payout requests
│   └── campaigns.py           # flash-sale enrollment
│
├── admin/                     (existing — extend with)
│   ├── seller_management.py   # NEW — approve/suspend sellers, view directory
│   ├── kyc_review.py          # NEW — approve/reject documents
│   ├── commission_rules.py    # NEW — set category/seller commission rates
│   ├── campaign_controller.py # NEW — schedule platform-wide sales
│   └── fraud_monitor.py       # NEW — duplicate listings, price anomalies
│
├── logistics/                 # NEW blueprint → /api/logistics/*
│   ├── warehouse.py           # inbound scan, stock view
│   ├── dispatch.py            # route planning, rider assignment
│   └── tracking.py            # shipment status updates, PoD capture
│
├── support/                   # NEW blueprint → /api/support/*
│   ├── order_search.py        # 360° order/sub-order lookup
│   └── disputes.py            # case queue, resolution actions
│
└── services/
    ├── order_splitter.py       # NEW — splits paid order into sub_orders + ledger holds
    ├── escrow_engine.py         # NEW — Celery beat: releases matured escrow
    └── payout_processor.py      # NEW — batches released funds into payouts
```

### Order splitter (runs synchronously right after payment succeeds)

```python
def split_order_by_seller(order_id):
    order = Order.query.get(order_id)
    items_by_seller = defaultdict(list)
    for item in order.order_items:
        items_by_seller[item.product.seller_id].append(item)

    for seller_id, items in items_by_seller.items():
        subtotal = sum(i.price * i.quantity for i in items)
        rate = get_commission_rate(seller_id, items[0].product.category_id)
        commission = round(subtotal * (rate / 100), 2)

        sub_order = SubOrder(
            order_id=order.id,
            seller_id=seller_id,
            subtotal=subtotal,
            commission_amount=commission,
            seller_payout_amount=subtotal - commission,
            status='pending',
        )
        db.session.add(sub_order)
        db.session.flush()  # get sub_order.id

        for i in items:
            i.sub_order_id = sub_order.id

        db.session.add(LedgerEntry(
            sub_order_id=sub_order.id,
            seller_id=seller_id,
            entry_type='escrow_hold',
            amount=sub_order.seller_payout_amount,
            status='held',
        ))

    db.session.commit()
```

### Escrow release (Celery beat, e.g. daily at 02:00)

```python
@celery.task
def release_matured_escrow():
    cutoff = datetime.utcnow()
    matured = LedgerEntry.query.filter(
        LedgerEntry.entry_type == 'escrow_hold',
        LedgerEntry.status == 'held',
        LedgerEntry.available_at <= cutoff,
    ).all()

    for entry in matured:
        entry.status = 'released'
        db.session.add(LedgerEntry(
            sub_order_id=entry.sub_order_id,
            seller_id=entry.seller_id,
            entry_type='escrow_release',
            amount=entry.amount,
            status='available',
        ))
    db.session.commit()

# celeryconfig.py
CELERYBEAT_SCHEDULE = {
    'release-escrow-daily': {
        'task': 'services.escrow_engine.release_matured_escrow',
        'schedule': crontab(hour=2, minute=0),
    },
}
```

`available_at` on the escrow_hold entry should be set to `delivered_at + return_window_days` when the sub-order's shipment status flips to `delivered` — that's the "hold funds until delivery + return period" rule from your original notes, made concrete.

---

## 6. Financial Flow: Checkout → Escrow → Payout

1. Customer checks out a cart spanning 3 sellers → **one** Stripe PaymentIntent for the full total (your existing idempotent PaymentIntent flow already handles this correctly).
2. Stripe webhook fires `payment_intent.succeeded` → your existing deduplicated handler now also calls `split_order_by_seller(order_id)`.
3. Each `sub_order` gets an `escrow_hold` ledger entry — money is "yours" on the balance sheet but earmarked per seller.
4. Sub-order status moves `pending → packed → shipped → delivered` (driven by vendor + logistics portals below). On `delivered`, set `available_at` on that sub-order's ledger entry.
5. `escrow_engine.release_matured_escrow` (Celery beat) flips matured holds to `released` once the return window passes.
6. Vendor requests a payout from their Finance screen → `payout_processor` batches `released` entries into a `payout_requests` row → admin approves → money moves out.

**One thing worth flagging before you build the payout leg:** Stripe does not currently list Pakistan as an officially supported country for merchant accounts, which matters if your sellers are Pakistan-based and you were planning to use **Stripe Connect** to pay them out directly. Most Pakistani platforms handle this with a manual rail instead: the ledger and `payout_requests` tables above still do all the tracking, but the actual money movement is a bank transfer / JazzCash / Easypaisa payout that an admin marks as `paid` after sending it — Stripe stays purely on the *customer-payment* side, which is unaffected by this restriction. Worth confirming your own Stripe account's country setup before committing to Connect for vendor payouts.

---

## 7. RBAC Expansion

| Role | Scope | Portal |
|---|---|---|
| `customer` | Own cart, orders, reviews | Storefront |
| `seller_owner` | Full control of their own `seller_id` | Vendor Desk |
| `seller_staff` | Limited actions under owner's `seller_id` (e.g. pack orders, no payout access) | Vendor Desk |
| `category_manager` | Catalog taxonomy, attribute schemas | Admin Ops Floor |
| `compliance_officer` | KYC review, seller suspension | Admin Ops Floor |
| `super_admin` | Everything, including commission rules and payout approval | Admin Ops Floor |
| `logistics_manager` | Warehouse + dispatch config | Logistics Hub |
| `warehouse_staff` | Scan/receive, pick lists | Logistics Hub |
| `delivery_rider` | Assigned shipments only, PoD capture | Logistics Hub (mobile view) |
| `support_agent` | Order search, dispute cases | Support Desk |

Add `role` and `seller_id` (nullable — null for platform staff) to your JWT claims, and gate every new blueprint with a decorator that checks both, e.g. `@require_role('seller_owner', 'seller_staff') @require_own_seller`.

---

## 8. Portal-by-Portal Screen Breakdown

### A. Customer Storefront *(extend existing)*
- Cart with **per-seller subtotals** and shipping estimates before checkout
- Order confirmation showing **N sub-orders**, each trackable independently
- Seller storefront page (ratings, other products from same seller)
- Order tracking page reads `shipments.status`, not just `orders.status`

### B. Vendor Desk *(new — `/vendor`)*
- **Dashboard** — today's GMV, pending sub-orders, low-stock alerts, escrow balance
- **Onboarding wizard** — business info + KYC document upload
- **Product Catalog** — list/create/edit, bulk CSV upload, variant management
- **Fulfillment Queue** — kanban by sub-order status, bulk "mark packed", label printing
- **Campaigns** — enroll products into platform flash sales, set discount allocation
- **Finance & Payouts** — ledger (held/released), payout request button, commission history
- **Store Settings** — staff management (invite `seller_staff`), store profile

### C. Admin Ops Floor *(extend existing `/admin`)*
- **Seller Onboarding Queue** — review KYC docs, approve/reject
- **Seller Directory** — suspend, ban, override commission rate
- **Commission Rule Manager** — per-category and per-seller overrides
- **Campaign & Mega-Event Scheduler** — sitewide flash sales, banner slots
- **Fraud & Compliance Monitor** — duplicate listings, price-gouging flags during sales
- **Financial Clearinghouse** — global GMV, platform net revenue, payout approval queue
- **Dispute Escalation Queue** — cases support couldn't resolve

### D. Logistics Hub *(new — `/logistics`)*
- **Inbound Scanner** — receive packages from sellers at sorting hubs
- **Dispatch & Route Planner** — assign shipments to riders/3PL partners
- **Rider View** (mobile-first) — assigned deliveries, OTP + photo proof-of-delivery capture
- **Shipment Tracking Board** — exceptions, failed deliveries, re-attempts
- **Carrier Settings** — enable/disable carriers, API credentials

### E. Support Desk *(new — `/support`)*
- **360° Order Viewer** — search across all sub-orders, one buyer's full history
- **Dispute Case Manager** — open/assign/resolve, trigger refund via existing Stripe refund flow
- **Buyer-Seller Chat Viewer** — read-only mediation context
- **Refund & Return Authorization Tool**

---

## 9. Phased Roadmap

| Phase | Focus | Key Deliverables | Rough Effort |
|---|---|---|---|
| 1 | Foundation | `sellers`, `seller_staff`, KYC tables; `seller_id` on products; RBAC roles; onboarding approval flow | 3–4 weeks |
| 2 | Order Splitting | `sub_orders`, `order_splitter` service, Vendor Desk catalog + fulfillment screens | 4 weeks |
| 3 | Financial Engine | `commission_rules`, `ledger_entries`, escrow beat job, `payout_requests`, Finance screens, resolve Stripe/Pakistan payout question | 4–5 weeks |
| 4 | Logistics | `warehouses`, `carriers`, `shipments`, Logistics Hub, rider PoD flow | 4 weeks |
| 5 | Trust & Scale | `disputes`, `seller_ratings`, fraud monitor, search upgrade for large catalogs, vendor notification channel | 4–6 weeks |

**Total: ~20–24 weeks (5–6 months) to marketplace parity**, building on what you already have — not starting over.

---

## 10. Where to Start

Phase 1 is the right first move: nothing else in this document works until `sellers` exists and every product has a `seller_id`. It's also the lowest-risk phase — it's pure additive schema + one new admin approval screen, and doesn't touch your existing checkout/payment code paths at all.

If you want, the natural next artifact is a working Flask blueprint for `vendor/onboarding.py` + the seller-approval side in `admin/seller_management.py`, wired to the schema above.