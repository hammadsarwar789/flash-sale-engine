# 🚀 End-to-End Feature Integration Guide (`feature.md`)

This document is a **start-to-finish blueprint** for designing, implementing, testing, and integrating new features into the **Flash Sale Engine** without breaking existing concurrency guarantees, outbox sync, or RBAC security rules.

---

## 📋 Phase 1: Feature Engineering Standard Checklist

Every new feature added to this system must pass through 6 distinct implementation phases:

```text
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ 1. Schema &    │ ──► │ 2. Central     │ ──► │ 3. API & RBAC  │
│    Migrations  │     │    Service     │     │    Decorators  │
└────────────────┘     └────────────────┘     └────────────────┘
        │
        ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ 6. Frontend &  │ ◄── │ 5. Automated   │ ◄── │ 4. Async Worker│
│    Integration │     │    Test Suite  │     │    & Outbox    │
└────────────────┘     └────────────────┘     └────────────────┘
```


---

## 🛠️ Phase 2: Detailed Step-by-Step Feature Implementation Trails

### Trail A: Adding a New Inventory Adjustment Trigger / Channel (e.g. POS / TikTok Shop)

When introducing a new inventory channel, **NEVER mutate `product.available_stock` directly**.

1. **Step 1: Define the Origin Source Tag:**
   Edit [`backend/app/services/inventory_sync.py`](file:///d:/Flash%20Sale%20Engine/backend/app/services/inventory_sync.py) and document the source tag (e.g. `source="TIKTOK_SHOP"` or `source="POS"`).
2. **Step 2: Connect Endpoint / Handler to `adjust_stock()`:**
   ```python
   from app.services.inventory_sync import adjust_stock

   new_stock = adjust_stock(
       product_id=product_id,
       delta=-requested_qty,
       reason="TIKTOK_ORDER_PLACED",
       source="TIKTOK_SHOP",
       reference_id=tiktok_order_id
   )
   ```
3. **Step 3: Verify Outbox Behavior:**
   - If the external system is distinct from Shopify (e.g. TikTok Shop), `source != "SHOPIFY"`, so `adjust_stock()` will automatically write an `OutboxEvent` to sync the new inventory level back to Shopify seamlessly.
   - Redis stock keys and catalog cache will automatically update in real time.

---

### Trail B: Adding a New Celery Background Worker Task & Beat Cron Scheduler

When adding a task that performs periodic maintenance or heavy computation:

1. **Step 1: Define the Celery Task Function:**
   Open [`backend/app/workers/tasks.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/tasks.py) and add the task with retry logic and audit logging:
   ```python
   @celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
   def my_new_background_task(self, payload_id: str):
       try:
           # Perform work
           log_entry = TaskLog(task_name="my_new_background_task", status="SUCCESS")
           db.session.add(log_entry)
           db.session.commit()
       except Exception as exc:
           db.session.rollback()
           logger.error(f"Task failed: {exc}")
           raise self.retry(exc=exc)
   ```
2. **Step 2: Register Periodic Execution (If Recurring):**
   Open [`backend/app/workers/celery_app.py`](file:///d:/Flash%20Sale%20Engine/backend/app/workers/celery_app.py) or configuration setup and add to `beat_schedule`:
   ```python
   celery_app.conf.beat_schedule['nightly_audit_task'] = {
       'task': 'app.workers.tasks.nightly_audit_task',
       'schedule': crontab(hour=3, minute=0), # Daily at 03:00 UTC
   }
   ```

---

### Trail C: Exposing a New REST API Endpoint with Security & Resilience Decorators

When creating a new endpoint in `backend/app/api/v1/`:

1. **Step 1: Apply Authorization Decorators:**
   Protect the endpoint with `@jwt_required` and `@roles_required(RoleEnum.VENDOR)` (or `RoleEnum.ADMIN`):
   ```python
   from app.api.decorators.authorization import roles_required
   from app.api.decorators.idempotent import idempotent
   from app.api.decorators.rate_limit import rate_limit

   @v1_bp.route('/vendor/promotions', methods=['POST'])
   @jwt_required()
   @roles_required('VENDOR')
   @rate_limit(max_requests=30, window_seconds=60)
   @idempotent()
   def create_promotion():
       # Controller implementation
       return jsonify({'status': 'success', 'data': result}), 201
   ```
2. **Step 2: Use Standard Response Envelopes:**
   Always return consistent JSON response envelopes:
   ```json
   {
     "status": "success",
     "message": "Promotion created successfully",
     "data": { ... }
   }
   ```

---

## 🧪 Phase 3: Automated Feature Testing Protocol

Before submitting code for a new feature, run the full validation suite:

1. **Write Unit Tests:** Add test cases in `backend/tests/test_features.py` covering success paths, invalid inputs, and unauthorized role access.
2. **Run Pytest:**
   ```bash
   cd backend
   pytest tests/ -v
   ```
3. **Verify Database Migrations (If Schema Modified):**
   ```bash
   flask db migrate -m "Add new feature tables"
   flask db upgrade
   ```
