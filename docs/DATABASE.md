# 🗄️ Database Schemas, Indexing Strategies & Data Layer

This document details the relational PostgreSQL storage layer, ORM entity mappings, database check constraints, optimistic locking mechanisms, composite indexes, and counter-cache denormalization strategies implemented in the **Flash Sale Engine**.

---

## 1. ORM Entity Mapping & Table Relationships

The database layer ([`backend/app/models/`](file:///d:/Flash%20Sale%20Engine/backend/app/models/)) comprises 24+ domain models managed via SQLAlchemy ORM and Alembic migrations:

```text
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │     User     │1       *│    Seller    │1       *│   Product    │
  │ (user.py)    ├─────────┤ (seller.py)  ├─────────┤ (product.py) │
  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
         │1                       │1                       │1
         │                        │                        │
        *▼                       *▼                       *▼
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │    Order     │1       *│   SubOrder   │1       *│ProductVariant│
  │  (order.py)  ├─────────┤(sub_order.py)│         │ (variant.py) │
  └──────┬───────┘         └──────┬───────┘         └──────────────┘
         │1                       │1
        *▼                       *▼
  ┌──────────────┐         ┌──────────────┐
  │  OrderItem   │         │ LedgerEntry  │
  │(order_item.py)         │(financials.py)
  └──────────────┘         └──────────────┘
```

### Entity Directory

1. **`User` ([`user.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/user.py)):** Identity master table (`id`, `email`, `password_hash`, `role`, `user_type`, `status`). Enforces unique index on `email`.
2. **`Seller` ([`seller.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/seller.py)):** Vendor store profile (`user_id`, `store_name`, `status`, `available_balance`, `held_escrow_balance`).
3. **`Tenant` & `Outlet` ([`tenant.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/tenant.py)):** Multi-tenant enterprise organization tree (`tenant_id`, `code`, `is_hq`).
4. **`OutletInventory` ([`outlet_inventory.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outlet_inventory.py)):** Physical branch inventory mapping (`outlet_id`, `product_id`, `available_stock`).
5. **`Product` ([`product.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product.py)):** Core catalog model (`seller_id`, `sku`, `price`, `total_stock`, `available_stock`, `version`).
6. **`ProductVariant` ([`product_variant.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/product_variant.py)):** SKU variant options (`product_id`, `color`, `size`, `available_stock`, `price`).
7. **`Category` ([`category.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/category.py)):** Category hierarchy (`parent_id`, `name`, `slug`).
8. **`Cart` & `CartItem` ([`cart.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/cart.py)):** Active shopping carts (`user_id`, `product_id`, `variant_id`, `quantity`, `reserved_until`).
9. **`Order` ([`order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order.py)):** Parent order records (`user_id`, `status`, `idempotency_key`, `expires_at`).
10. **`SubOrder` ([`sub_order.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/sub_order.py)):** Merchant-partitioned order splits (`order_id`, `seller_id`, `subtotal`, `commission_amount`, `status`).
11. **`OrderItem` ([`order_item.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/order_item.py)):** Purchased line item snapshot (`order_id`, `sub_order_id`, `product_id`, `unit_price`, `quantity`).
12. **`LedgerEntry` ([`financials.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/financials.py)):** Double-entry accounting ledger (`seller_id`, `entry_type`, `amount`, `status`, `available_at`).
13. **`OutboxEvent` ([`outbox.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/outbox.py)):** Transactional outbox log (`aggregate_type`, `aggregate_id`, `event_type`, `payload`, `status`).
14. **`Coupon` & `Redemption` ([`coupon.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/coupon.py)):** Discount codes (`code`, `discount_type`, `discount_value`, `max_redemptions`, `redemption_count`).
15. **`Review` ([`review.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/review.py)):** Verified buyer product reviews (`user_id`, `product_id`, `rating`, `comment`, `is_verified_buyer`).
16. **`Wishlist` ([`wishlist.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/wishlist.py)):** Customer bookmarks (`user_id`, `product_id`).
17. **`Logistics` ([`logistics.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/logistics.py)):** Shipping tracking (`order_id`, `tracking_number`, `carrier`, `status`).
18. **`ReturnRequest` & `Dispute` ([`return_request.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/return_request.py), [`dispute.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/dispute.py)):** Item returns and vendor dispute inspection records.
19. **`Approval` ([`approval.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/approval.py)):** Onboarding queue requests (`request_type`, `applicant_email`, `status`).
20. **`TaskLog` ([`task_log.py`](file:///d:/Flash%20Sale%20Engine/backend/app/models/task_log.py)):** Background Celery worker task execution logs.
21. **`Ticket`, `TicketMessage`, `TicketAI` ([`ticket.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/models/ticket.py)):** Support tickets and AI vector response records.

---

## 2. Integrity Protections: Check Constraints & Optimistic Locking

### 2.1 Database Check Constraints
To prevent negative inventory or invalid pricing even if application-level checks fail, PostgreSQL enforces strict check constraints at the table level:
```sql
ALTER TABLE products 
  ADD CONSTRAINT chk_product_available_stock CHECK (available_stock >= 0);

ALTER TABLE products 
  ADD CONSTRAINT chk_product_price CHECK (price > 0);

ALTER TABLE product_variants 
  ADD CONSTRAINT chk_variant_available_stock CHECK (available_stock >= 0);
```

### 2.2 Optimistic Version Locking (`version` Column)
The `Product` model includes an integer `version` column mapped to SQLAlchemy's `version_id_col`:
```python
class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.String(36), primary_key=True)
    available_stock = db.Column(db.Integer, nullable=False)
    version = db.Column(db.Integer, nullable=False, default=1)

    __mapper_args__ = {
        'version_id_col': version
    }
```
When updating a product row, SQLAlchemy automatically appends `WHERE version = :current_version`. If another thread has modified the row in the interim, a `StaleDataError` is raised, preventing lost updates.

---

## 3. High-Performance Indexing Strategies

To ensure sub-10ms response times during database queries and eliminate N+1 bottlenecks, composite indexes are placed on high-cardinality foreign keys and filter columns:

| Index Name | Table | Columns | Optimized Query Pattern |
| :--- | :--- | :--- | :--- |
| `idx_products_available_stock` | `products` | `available_stock`, `is_active` | Fast catalog filtering of in-stock items. |
| `idx_orders_user_id` | `orders` | `user_id`, `created_at` | Customer order history pagination. |
| `idx_orders_idempotency_key` | `orders` | `idempotency_key` (UNIQUE) | O(1) duplicate request detection during reserve. |
| `idx_sub_orders_seller` | `sub_orders` | `seller_id`, `status` | Merchant portal order dashboard queries. |
| `idx_ledger_seller_available` | `ledger_entries` | `seller_id`, `status`, `available_at` | Escrow Beat maturity release sweeping. |
| `idx_tickets_customer_status` | `tickets` | `customer_id`, `status` | Customer support ticket list queries. |
| `idx_tickets_agent_status` | `tickets` | `assigned_agent_id`, `status` | Agent workload queue dispatch. |
| `idx_tickets_status_updated` | `tickets` | `status`, `updated_at` | Global ticket queue sorting. |

---

## 4. Counter-Cache Denormalization (`message_count`)

### The N+1 Query Problem in Message Threads
Standard relational modeling calculates ticket message counts by querying `SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = ...` or lazy-loading `len(ticket.messages)`. In support ticket queue lists rendering 50 tickets per page, this generates 50 individual secondary SQL queries (N+1 query trap), degrading response times by over 800 ms.

### The Solution: Denormalized `message_count` Column
We denormalized the message count into a dedicated integer column directly on the `Ticket` model ([`backend/app/customer_support/models/ticket.py`](file:///d:/Flash%20Sale%20Engine/backend/app/customer_support/models/ticket.py)):
```python
class Ticket(db.Model):
    __tablename__ = 'tickets'
    id = db.Column(db.String(36), primary_key=True)
    message_count = db.Column(db.Integer, nullable=False, default=1)
```
When `TicketService.add_message()` appends a message, it increments `ticket.message_count += 1` within the same transaction. Ticket list queries read `ticket.message_count` directly in O(1) time without triggering secondary `SELECT` statements, completely eliminating the N+1 query trap.
