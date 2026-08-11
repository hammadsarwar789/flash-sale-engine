# 🏛️ System Architecture Map & Component Topology (`Architecture.md`)

This document provides a **complete, non-blind system map** of the **Flash Sale Engine**, detailing the multi-tier component architecture, folder/file structure, state distribution between Redis and PostgreSQL, and security topology.

---

## 🗺️ 1. High-Level Multi-Tier Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLIENT / USER INTERFACE LAYER                          │
│                                                                             │
│   ┌────────────────────────┐                   ┌────────────────────────┐   │
│   │ React 18 + Vite SPA    │                   │ Mobile & Third-Party   │   │
│   │ (Tailwind CSS, Pinia)  │                   │ Webhook Callers        │   │
│   └───────────┬────────────┘                   └───────────┬────────────┘   │
└───────────────┼────────────────────────────────────────────┼────────────────┘
                │ HTTP / REST / JSON Headers                 │ HTTP Webhooks
                ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION & GATEWAY LAYER                           │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Flask REST API Container (Gunicorn WSGI / Application Factory)       │   │
│   │                                                                     │   │
│   │ • API Gateway Router (`app/api/v1/`)                                │   │
│   │ • Resilience Guards (`@rate_limit`, `@idempotent`)                  │   │
│   │ • Security / RBAC (`@jwt_required`, `@roles_required`)              │   │
│   │ • Central Sync Gateway (`app/services/inventory_sync.py`)           │   │
│   └───────────────────┬───────────────────────────────┬─────────────────┘   │
└───────────────────────┼───────────────────────────────┼─────────────────────┘
                        │ Sub-ms Memory Ops             │ SQL ACID Transactions
                        ▼                               ▼
┌───────────────────────────────┐     ┌───────────────────────────────────────┐
│     IN-MEMORY REDIS LAYER     │     │      PERSISTENT POSTGRESQL STORE      │
│                               │     │                                       │
│ • Lua Scripts (`LUA_RESERVE`) │     │ • 24+ ORM Domain Models               │
│ • Hot Stock & Hold Counters   │     │ • `products`, `orders`, `sub_orders`  │
│ • ZSET Sliding Rate Limits    │     │ • `outbox_events` Log Table           │
│ • Idempotency Lock Keys       │     │ • Double-Entry `ledger_entries`       │
└───────────────────────────────┘     └───────────────────┬───────────────────┘
                                                          │ Async Outbox Polling
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ASYNC WORKER & SCHEDULER LAYER                        │
│                                                                             │
│   ┌────────────────────────┐                   ┌────────────────────────┐   │
│   │ Outbox Drain Worker    │                   │ Celery Beat Scheduler  │   │
│   │ (`publisher.py` /      │                   │ • Daily Escrow Sweep   │   │
│   │  `shopify_tasks.py`)   │                   │ • Order Expiry Timer   │   │
│   └───────────┬────────────┘                   └───────────┬────────────┘   │
└───────────────┼────────────────────────────────────────────┼────────────────┘
                │ Async HTTPS Push                           │ External Sync
                ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL INTEGRATION GATEWAYS                           │
│                                                                             │
│   ┌────────────────────────┐                   ┌────────────────────────┐   │
│   │ Shopify Admin API      │                   │ Payment Gateways       │   │
│   │ (REST & GraphQL)       │                   │ (Stripe, Paypal, etc) │   │
│   └────────────────────────┘                   └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 2. Complete Codebase Directory & Module Directory Map

### Backend Directory Layout (`backend/app/`)

```text
backend/app/
├── api/                             # REST API Controller Endpoints
│   ├── decorators/                  # Cross-cutting API Decorators
│   │   ├── authorization.py         # Role-Based Access Control (@roles_required)
│   │   ├── idempotent.py            # Redis Header-Based Idempotency Guard (@idempotent)
│   │   └── rate_limit.py            # Redis ZSET Sliding-Window Rate Limiter (@rate_limit)
│   └── v1/                          # Version 1 API Route Blueprints
│       ├── admin.py                 # Platform Admin Management API
│       ├── approvals.py             # Vendor Onboarding Approvals API
│       ├── auth.py                  # JWT Auth (Login, Register, Refresh)
│       ├── cart.py                  # Customer Shopping Cart API
│       ├── commerce.py              # Checkout & Order Placement API
│       ├── orders.py                # Order History & Flash Sale Reserve API
│       ├── products.py              # Catalog Management & Stock Edit API
│       ├── shopify_webhooks.py      # Shopify HMAC Webhook Callbacks
│       ├── support.py               # Customer Support Ticket API
│       └── vendor.py                # Merchant Portal Dashboard API
├── core/                            # Engine Infrastructure & Setup
│   ├── config.py                    # Environment Configuration & App Settings
│   ├── db_init.py                   # DB Initialization, Seed Data & Indexes
│   ├── extensions.py                # SQLAlchemy DB & Redis Client Handles
│   └── security.py                  # Password Hashing & JWT Utilities
├── customer_support/                # Vector RAG AI Support Module
│   ├── models/                      # Ticket & Message Models
│   └── services/                    # Cosine Similarity Vector RAG Engine (`ai_service.py`)
├── models/                          # 24+ Relational ORM Domain Models
│   ├── cart.py                      # Cart & CartItem
│   ├── financials.py                # LedgerEntry (Escrow Double-Entry Accounting)
│   ├── order.py                     # Order Entity (Parent Order)
│   ├── order_item.py                # Line Item Snapshot
│   ├── outbox.py                    # Transactional Outbox Log (`OutboxEvent`)
│   ├── outlet_inventory.py          # Multi-Branch Physical Inventory
│   ├── product.py                   # Product Master (Optimistic Lock Version)
│   ├── product_variant.py           # Variant Stock & SKU Options
│   ├── seller.py                    # Vendor Profile & Balance Balances
│   ├── sub_order.py                 # SubOrder (Vendor Order Splits)
│   └── user.py                      # User Identity Master
├── services/                        # Core Domain Business Logic Services
│   ├── escrow_engine.py             # Merchant Escrow Hold & Maturity Release Logic
│   ├── inventory_service.py         # In-Memory Redis Lua Reservation Engine
│   ├── inventory_sync.py            # Central Inventory Adjustment Sync Gateway (`adjust_stock`)
│   ├── order_service.py             # Order Placement & Compensation Handlers
│   ├── order_splitter.py            # Multi-Vendor Order Splitting Logic
│   └── payment_service.py           # Payment Gateway Integrations
└── workers/                         # Asynchronous Celery Worker & Outbox Tasks
    ├── celery_app.py                # Celery Instance Configuration
    ├── publisher.py                 # Outbox Event Polling & Publisher Daemon
    ├── shopify_tasks.py             # Async Shopify Admin API Synchronization
    └── tasks.py                     # Payment, Escrow Release & Expiry Timer Tasks
```

---

## 📊 3. State Distribution: Hot State vs. Cold State

| Data Domain | Storage Medium | Key / Table Name | Purpose & Lifespan |
| :--- | :--- | :--- | :--- |
| **Hot Available Stock** | Redis | `product:<id>:stock` | Sub-ms check & decrement counter ($< 1\text{ ms}$). |
| **Hot Stock Hold Count** | Redis | `product:<id>:hold` | Temporary reserve count during 10-min payment window. |
| **Sliding Window Rate Limit** | Redis | `rate_limit:<ip_or_user_id>` | Redis `ZSET` keeping request timestamps over 60 seconds. |
| **Idempotency Response Cache**| Redis | `idempotency:<key>` | Redis `String` with 120s TTL preventing duplicate POST execution. |
| **Cold Catalog Data** | PostgreSQL | `products`, `product_variants` | Persistent master catalog record, optimistic versioning (`version`). |
| **Order & Line Items** | PostgreSQL | `orders`, `sub_orders`, `order_items` | Permanent financial records and transaction logs. |
| **Sync Events Log** | PostgreSQL | `outbox_events` | Outbox pattern events waiting for external queue drain (`PENDING`/`PUBLISHED`). |
| **Merchant Balances** | PostgreSQL | `ledger_entries`, `sellers` | Immutable double-entry financial escrow ledger (`HELD`/`RELEASED`). |

---

## 🔒 4. Security & Access Control Topology

The system implements multi-layered security controls across API endpoints:

1. **Authentication:** Bearer JWT Access Tokens issued by [`backend/app/api/v1/auth.py`](file:///d:/Flash%20Sale%20Engine/backend/app/api/v1/auth.py).
2. **Role-Based Access Control (RBAC):** Endpoint gating via `@roles_required`:
   * `CUSTOMER`: Place orders, manage cart, create support tickets.
   * `VENDOR`: View merchant sub-orders, edit owned product catalog, request escrow payouts.
   * `ADMIN`: Manage user roles, approve merchant onboarding applications, review dispute tickets.
   * `SUPER_ADMIN`: Full system permissions and platform config access.
3. **Webhook HMAC Validation:** Shopify webhooks inspect `X-Shopify-Hmac-SHA256` headers using SHA-256 HMAC digest verification against `SHOPIFY_WEBHOOK_SECRET`.
