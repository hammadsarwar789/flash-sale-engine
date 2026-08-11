import time
import logging
from datetime import datetime, timezone
from celery import shared_task
from app.core.extensions import db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.task_log import TaskLog
from app.services.inventory_service import InventoryService
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_payment_task(self, order_id: str, user_id: str):
    """Asynchronous background payment processing gateway task."""
    start_time = time.time()
    task_id = self.request.id or "local-task"

    try:
        success, msg = OrderService.pay_order(order_id=order_id, user_id=user_id)
        execution_time = (time.time() - start_time) * 1000

        task_log = TaskLog(
            task_id=task_id,
            order_id=order_id,
            task_name="process_payment_task",
            status="SUCCESS" if success else "FAILURE",
            execution_time_ms=execution_time,
            error_message=None if success else msg,
        )
        db.session.add(task_log)
        db.session.commit()

        logger.info(f"Payment task {task_id} completed for order {order_id}: {msg}")
        return {"success": success, "message": msg}

    except Exception as e:
        db.session.rollback()
        execution_time = (time.time() - start_time) * 1000
        task_log = TaskLog(
            task_id=task_id,
            order_id=order_id,
            task_name="process_payment_task",
            status="RETRYING",
            execution_time_ms=execution_time,
            error_message=str(e),
        )
        db.session.add(task_log)
        db.session.commit()

        logger.error(f"Payment task {task_id} failed: {e}. Retrying...")
        raise self.retry(exc=e)


@shared_task(bind=True)
def schedule_order_expiry_task(self, order_id: str):
    """10-Minute payment expiration countdown task; restores stock if unpaid."""
    start_time = time.time()
    task_id = self.request.id or "expiry-task"

    order = db.session.query(Order).filter_by(id=order_id).first()
    if not order:
        logger.warning(f"Expiry check task for order {order_id} failed: Order not found")
        return {"status": "skipped", "reason": "Order not found"}

    if order.status != OrderStatus.PENDING:
        logger.info(f"Expiry task for order {order_id} ignored; order status is {order.status}")
        return {"status": "skipped", "reason": f"Order already in status {order.status}"}

    try:
        order.status = OrderStatus.EXPIRED
        release_items = []

        if order.items:
            for item in order.items:
                try:
                    from app.services.inventory_sync import adjust_stock
                    if item.variant_id:
                        adjust_stock(
                            variant_id=item.variant_id,
                            delta=+item.quantity,
                            reason="WEB_ORDER_EXPIRED",
                            source="WEB",
                            reference_id=order.id,
                        )
                    else:
                        adjust_stock(
                            product_id=item.product_id,
                            delta=+item.quantity,
                            reason="WEB_ORDER_EXPIRED",
                            source="WEB",
                            reference_id=order.id,
                        )
                except Exception as stock_err:
                    logger.warning(f"Failed to adjust stock for expired order item {item.id}: {stock_err}")
                release_items.append((item.product_id, item.quantity))
        elif order.product_id and order.quantity:
            try:
                from app.services.inventory_sync import adjust_stock
                adjust_stock(
                    product_id=order.product_id,
                    delta=+order.quantity,
                    reason="WEB_ORDER_EXPIRED",
                    source="WEB",
                    reference_id=order.id,
                )
            except Exception as stock_err:
                logger.warning(f"Failed to adjust stock for expired order {order.id}: {stock_err}")
            release_items.append((order.product_id, order.quantity))

        db.session.commit()

        # Restore stock in Redis in-memory cache
        InventoryService.release_multi_stock(release_items)

        execution_time = (time.time() - start_time) * 1000
        task_log = TaskLog(
            task_id=task_id,
            order_id=order_id,
            task_name="schedule_order_expiry_task",
            status="SUCCESS",
            execution_time_ms=execution_time,
            error_message=None,
        )
        db.session.add(task_log)
        db.session.commit()

        logger.info(f"Order {order_id} expired. Restored stock for {len(release_items)} line items.")
        return {"status": "expired", "order_id": order_id}

    except Exception as e:
        db.session.rollback()
        logger.error(f"Expiry task for order {order_id} failed: {e}")
        return {"status": "error", "message": str(e)}


@shared_task(bind=True)
def send_notification_task(self, user_id: str, notification_type: str, payload: dict):
    """Asynchronous notification dispatch task (Email / Push)."""
    start_time = time.time()
    task_id = self.request.id or "notify-task"

    logger.info(f"Sending '{notification_type}' notification to user {user_id} with payload {payload}")
    execution_time = (time.time() - start_time) * 1000

    task_log = TaskLog(
        task_id=task_id,
        order_id=payload.get("order_id"),
        task_name="send_notification_task",
        status="SUCCESS",
        execution_time_ms=execution_time,
        error_message=None,
    )
    db.session.add(task_log)
    db.session.commit()

    return {"status": "sent", "user_id": user_id, "type": notification_type}


@shared_task(bind=True)
def release_matured_escrow_task(self):
    """Celery Beat automated periodic task to release matured vendor escrow holds into available balance."""
    start_time = time.time()
    task_id = self.request.id or "escrow-release-task"

    try:
        from app.services.escrow_engine import release_matured_escrow
        released_count = release_matured_escrow()
        execution_time = (time.time() - start_time) * 1000

        task_log = TaskLog(
            task_id=task_id,
            task_name="release_matured_escrow_task",
            status="SUCCESS",
            execution_time_ms=execution_time,
            error_message=None,
        )
        db.session.add(task_log)
        db.session.commit()

        logger.info(f"Escrow release task {task_id} completed. Released {released_count} matured holds.")
        return {"status": "success", "released_count": released_count}

    except Exception as e:
        db.session.rollback()
        execution_time = (time.time() - start_time) * 1000
        task_log = TaskLog(
            task_id=task_id,
            task_name="release_matured_escrow_task",
            status="FAILURE",
            execution_time_ms=execution_time,
            error_message=str(e),
        )
        db.session.add(task_log)
        db.session.commit()

        logger.error(f"Escrow release task {task_id} failed: {e}")
        return {"status": "error", "message": str(e)}


@shared_task(name="tasks.reconcile_returned_escrow")
def reconcile_returned_escrow(sub_order_id: str) -> dict:
    """Cancels pending escrow releases for sub-orders undergoing return."""
    from app.models.financials import LedgerEntry

    escrow_entries = db.session.query(LedgerEntry).filter_by(
        sub_order_id=sub_order_id,
        entry_type="ESCROW_HOLD",
        status="HELD"
    ).all()

    for entry in escrow_entries:
        entry.status = "CANCELLED_DUE_TO_RETURN"

    db.session.commit()
    logger.info(f"[FINANCE-RECONCILE] Cancelled {len(escrow_entries)} escrow hold entries for sub_order '{sub_order_id}'.")
    return {"status": "reconciled", "sub_order_id": sub_order_id, "count": len(escrow_entries)}


@shared_task(name="tasks.enforce_vendor_inspection_sla")
def enforce_vendor_inspection_sla() -> dict:
    """
    Celery Beat scheduled task running hourly.
    Auto-approves returns stuck at 'ARRIVED_AT_WAREHOUSE' past SLA threshold (48 hours).
    """
    from datetime import timedelta
    from app.models.return_request import ReturnRequest
    from app.services.inspection_service import inspection_service

    sla_cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    overdue_returns = db.session.query(ReturnRequest).filter(
        ReturnRequest.status == "ARRIVED_AT_WAREHOUSE",
        ReturnRequest.updated_at <= sla_cutoff
    ).all()

    approved_count = 0
    for req in overdue_returns:
        inspection_service.process_warehouse_inspection(
            return_id=req.id,
            inspection_passed=True,
            inspector_notes="SYSTEM_AUTO_APPROVAL_VENDOR_SLA_BREACH"
        )
        approved_count += 1

    logger.info(f"[VENDOR-SLA-BEAT] Auto-approved {approved_count} overdue warehouse inspection returns.")
    return {"status": "sla_enforced", "approved_count": approved_count}


