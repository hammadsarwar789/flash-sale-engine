# ⛔ System Constraints & Non-Negotiable Invariants (`constraints.md`)

This document spells out the **CRITICAL INVARIANTS, FORBIDDEN MUTATIONS, AND ANTI-PATTERNS** that any developer or AI coding assistant **MUST NEVER TOUCH OR VIOLATE**. Breaking these rules introduces data drift, overselling, race conditions, financial discrepancies, or security vulnerabilities.

---

## 🚫 1. Stock Mutation Invariant: Single Gateway Enforcement

### The Constraint
> **Rule:** NEVER write to `Product.available_stock`, `ProductVariant.available_stock`, or Redis stock keys (`product:*:stock`, `variant:*:stock`) directly in HTTP controllers, background tasks, webhooks, or test helpers.

### Mandatory Compliance
* **ALL stock adjustments MUST route exclusively through [`inventory_sync.py:adjust_stock()`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_sync.py).**
* **Why:** Bypassing `adjust_stock()` breaks parent product stock aggregation, bypasses PostgreSQL `with_for_update()` row locking, misses Redis cache mirroring, and disables outbox sync to Shopify.

---

## 🚫 2. Concurrency Invariant: High-Frequency Flash Reservations

### The Constraint
> **Rule:** NEVER replace Redis Lua script stock reservations (`LUA_RESERVE_STOCK`, `LUA_RESERVE_MULTI_STOCK`) with raw SQL `UPDATE` queries or python-level stock checks during initial checkout HTTP requests.

### Mandatory Compliance
* **High-concurrency stock checks and decrements MUST execute inside atomic single-threaded Redis Lua scripts.**
* **Why:** Executing SQL updates on hot item rows under thousands of requests per second causes database connection pool saturation, thread starvation, TOC-TOU race conditions, and catastrophic `HTTP 504` site crashes.

---

## 🚫 3. Transactional Outbox Invariant: Dual-Write Prevention

### The Constraint
> **Rule:** NEVER invoke external HTTP APIs (e.g. Shopify Admin API, Stripe API, external notification webhooks) directly inside PostgreSQL database transaction blocks.

### Mandatory Compliance
* **State changes requiring external notification MUST write an `OutboxEvent` record to PostgreSQL within the domain SQL transaction.**
* **External HTTP API calls MUST be executed asynchronously by outbox worker processes ([`publisher.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/publisher.py), [`shopify_tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/shopify_tasks.py)).**
* **Why:** Inline HTTP API calls cause network timeouts to block database commits, leading to database lock starvation and severe data inconsistency (the Dual-Write problem).

---

## 🚫 4. Financial Escrow Invariant: Immutable Double-Entry Ledger

### The Constraint
> **Rule:** NEVER mutate `seller.available_balance` or `seller.held_escrow_balance` directly without creating a corresponding `LedgerEntry` record.

### Mandatory Compliance
* **ALL financial fund movements MUST be recorded via [`EscrowEngine`](file:///d:/Flash%20Sale%20Engine/backend/app/services/escrow_engine.py) as double-entry [`LedgerEntry`](file:///d:/Flash%20Sale%20Engine/backend/app/models/financials.py) rows with designated types (`ESCROW_HOLD`, `RELEASED`, `REFUND`).**
* **Funds MUST remain locked in `held_escrow_balance` for the full 7-day maturity delay window before being released to `available_balance` by `release_matured_escrow_task()`.**
* **Why:** Direct balance mutations create un-auditable financial records, expose the platform to chargeback loss, and break accounting balances.

---

## 🚫 5. Webhook Infinite Loop Suppression Invariant

### The Constraint
> **Rule:** NEVER call `adjust_stock()` with `source="WEB"` or `source="ADMIN"` inside a Shopify Webhook handler.

### Mandatory Compliance
* **Shopify Webhook handlers MUST pass `source="SHOPIFY"` when calling `adjust_stock()`.**
* **Why:** Passing non-Shopify sources causes `adjust_stock()` to generate an outbox event that pushes the update back to Shopify, triggering an infinite ping-pong update loop between Flash Sale Engine and Shopify.

---

## 🚫 6. Security & RBAC Access Control Invariant

### The Constraint
> **Rule:** NEVER remove `@jwt_required()` or `@roles_required()` decorators from backend endpoints or expose admin/vendor endpoints without explicit user role and resource ownership checks.

### Mandatory Compliance
* **All protected REST endpoints MUST be annotated with appropriate auth decorators.**
* **Controllers operating on tenant, vendor, or customer resources MUST verify that `current_user.id == resource.owner_id` (or user is `ADMIN`/`SUPER_ADMIN`).**
* **Why:** Omitting ownership verification creates IDOR (Insecure Direct Object Reference) vulnerabilities allowing unauthorized users to modify other merchants' products or orders.

---

## 🛑 Quick Reference Anti-Pattern Summary

```python
# ❌ FORBIDDEN: Direct stock mutation on model
product.available_stock -= 1  # VIOLATES INVARIANT 1!
db.session.commit()

# ✅ CORRECT: Routing through Central Sync Gateway
from app.services.inventory_sync import adjust_stock
adjust_stock(product_id=product.id, delta=-1, reason="WEB_ORDER", source="WEB")

# ❌ FORBIDDEN: Direct balance mutation
seller.available_balance += 100.00  # VIOLATES INVARIANT 4!

# ✅ CORRECT: Routing through Escrow Engine ledger
from app.services.escrow_engine import EscrowEngine
EscrowEngine.hold_funds(sub_order=sub_order)
```
