# 🐛 Cold-Start Bug Diagnostic & Troubleshooting Guide (`bug.md`)

This document is a **start-to-finish runbook** enabling any engineer or AI assistant picking up this repository cold to diagnose, reproduce, debug, isolate, and verify bugs without guesswork.

---

## 🧭 Phase 1: Rapid Diagnostic Triage (First 3 Minutes)

When an error or unexpected behavior occurs, **NEVER form hypotheses blindly**. Perform empirical inspection across these 4 layers in order:

### 1. Inspect Application & Worker Logs
* **Celery Background Tasks:** Inspect stdout/stderr logs or check task execution records in PostgreSQL:
  ```sql
  SELECT * FROM task_logs WHERE status = 'FAILURE' ORDER BY created_at DESC LIMIT 10;
  ```
* **Flask Application Log:** Inspect `backend/instance/app.log` or runtime console logs.

### 2. Inspect Redis Hot Stock & Hold State
Check for discrepancy between available stock counters and active holds:
```bash
# Query available stock in Redis
redis-cli GET product:PRODUCT_ID:stock

# Query reserved hold count in Redis
redis-cli GET product:PRODUCT_ID:hold

# Query idempotency lock state
redis-cli KEYS "idempotency:*"
```

### 3. Inspect PostgreSQL Transactional Outbox State
Check if outbox events are stuck in `PENDING` status or failing during Shopify sync:
```sql
SELECT id, aggregate_type, event_type, status, created_at 
FROM outbox_events 
WHERE status = 'PENDING' 
ORDER BY id ASC LIMIT 20;
```

### 4. Inspect DB Integrity & Check Constraints
Check if negative stock updates were rejected by database check constraints:
```sql
SELECT id, sku, available_stock, total_stock, version 
FROM products 
WHERE id = 'TARGET_PRODUCT_ID';
```

---

## 🔍 Phase 2: Failure Scenario Isolation Matrix

| Symptom | Root Cause Category | Inspection Command / SQL | Standard Fix Procedure |
| :--- | :--- | :--- | :--- |
| **User sees "Out of Stock", but DB shows stock > 0** | **Redis-Postgres Drift** | `redis-cli GET product:<id>:stock` vs SQL `available_stock` | Run `InventorySync.adjust_stock(delta=0, reason="MANUAL_RESYNC", source="ADMIN")` to force re-mirroring. |
| **Shopify stock does not update after web sale** | **Outbox Worker Deadlock / Stalled Queue** | `SELECT COUNT(*) FROM outbox_events WHERE status='PENDING'` | Automatic outbox poller thread (`start_outbox_poller`) runs every 30s inside Flask. For manual kick: `python -c "from app.workers.shopify_tasks import drain_outbox_events; drain_outbox_events()"` |
| **Order placement fails with `HTTP 409 Conflict`** | **Idempotency Key Collisions** | `redis-cli GET idempotency:<key>` | Verify if frontend is re-using the same `Idempotency-Key` for different request bodies. |
| **Merchant funds stuck in Escrow after 7 days** | **Celery Beat Scheduler Inactive** | `SELECT * FROM ledger_entries WHERE entry_type='ESCROW_HOLD' AND status='HELD'` | Trigger manual release: `python -c "from app.workers.tasks import release_matured_escrow_task; release_matured_escrow_task.delay()"` |
| **Shopify updates trigger endless stock edit loops** | **Origin Source Suppression Violation** | Check logs for `source="SHOPIFY"` triggering `OutboxEvent` writes | Ensure Shopify webhooks pass `source="SHOPIFY"` to `adjust_stock()` to suppress outbox events. |
| **Support ticket message count is out of sync** | **ORM Direct Write Bypassing `add_message()`** | `SELECT COUNT(*) FROM ticket_messages WHERE ticket_id=X` vs `ticket.message_count` | Re-synchronize denormalized count: `UPDATE tickets SET message_count = (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id=tickets.id)` |

---

## 🛠️ Phase 3: Step-by-Step Debugging & Reproduction Runbook

### Step 3.1: Reproduce Locally with Pytest
Create a minimal reproduction test inside `backend/tests/` using the test client:
```python
def test_reproduce_inventory_race_condition(client, init_database):
    # 1. Setup initial stock
    product = Product(id="test_sku", available_stock=1, total_stock=1, price=10.0)
    db.session.add(product)
    db.session.commit()

    # 2. Trigger simultaneous reserve calls
    res1 = client.post('/api/v1/orders/reserve', json={'product_id': 'test_sku', 'quantity': 1})
    res2 = client.post('/api/v1/orders/reserve', json={'product_id': 'test_sku', 'quantity': 1})

    # 3. Assert correct isolation (First succeeds, second receives HTTP 400 out of stock)
    assert res1.status_code == 201
    assert res2.status_code == 400
```

### Step 3.2: Debug Database Lock Saturation
If requests hang under load, inspect active PostgreSQL locks:
```sql
SELECT pid, query, state, age(clock_timestamp(), query_start) 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY age(clock_timestamp(), query_start) DESC;
```
If queries are blocked on `with_for_update()`, verify that Redis Lua reservations are filtering out of-stock requests *before* reaching the database.

---

## ✅ Phase 4: Post-Fix Verification & Invariant Checklist

Before declaring any bug fixed, execute this strict 4-point verification checklist:

1. **Run Unit & Integration Test Suite:**
   ```bash
   cd backend
   pytest -v tests/
   ```
2. **Verify Stock Invariant (Zero Drift):**
   Ensure Redis available stock equals PostgreSQL `available_stock`:
   $$\text{Redis Stock} == \text{PostgreSQL Available Stock}$$
3. **Verify Zero Negative Stock:**
   Ensure no product or variant has `available_stock < 0` or `total_stock < 0`.
4. **Run Locust Concurrency Verification (Load Test):**
   ```bash
   locust -f locustfile.py --headless -u 100 -r 20 --run-time 1m --host http://localhost:5000
   ```
   Verify 0 oversold items and 0 HTTP 500 server errors under load.
