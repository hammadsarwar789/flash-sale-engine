import time
import logging
from celery import shared_task
from app.core.extensions import db
from app.models.product import Product
from app.models.task_log import TaskLog
from app.integrations.shopify.sync import ShopifySyncService
from app.integrations.shopify.exceptions import ShopifyRateLimitError, ShopifyApiError

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, default_retry_delay=10)
def sync_product_to_shopify_task(self, product_id: str):
    """Async background worker task to synchronize local product changes to Shopify."""
    start_time = time.time()
    task_id = self.request.id or "local-shopify-task"

    try:
        success = ShopifySyncService.sync_product(product_id)
        exec_time = (time.time() - start_time) * 1000

        task_log = TaskLog(
            task_id=task_id,
            task_name="sync_product_to_shopify_task",
            status="SUCCESS" if success else "FAILURE",
            execution_time_ms=exec_time,
            error_message=None if success else "Failed to sync product to Shopify",
        )
        db.session.add(task_log)
        db.session.commit()
        return {"success": success, "product_id": product_id}

    except ShopifyRateLimitError as rate_err:
        logger.warning(f"Retrying sync_product_to_shopify_task in {rate_err.retry_after}s due to rate limit...")
        raise self.retry(exc=rate_err, countdown=rate_err.retry_after)

    except Exception as exc:
        exec_time = (time.time() - start_time) * 1000
        logger.error(f"Error in sync_product_to_shopify_task for product {product_id}: {exc}")
        if self.request.retries >= self.max_retries:
            task_log = TaskLog(
                task_id=task_id,
                task_name="sync_product_to_shopify_task",
                status="FAILURE",
                execution_time_ms=exec_time,
                error_message=str(exc),
            )
            db.session.add(task_log)
            db.session.commit()
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 5)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def delete_product_from_shopify_task(self, shopify_product_id: str):
    """Async background worker task to delete a product from Shopify."""
    start_time = time.time()
    task_id = self.request.id or "local-shopify-delete-task"

    try:
        success = ShopifySyncService.delete_product(shopify_product_id)
        exec_time = (time.time() - start_time) * 1000

        task_log = TaskLog(
            task_id=task_id,
            task_name="delete_product_from_shopify_task",
            status="SUCCESS" if success else "FAILURE",
            execution_time_ms=exec_time,
        )
        db.session.add(task_log)
        db.session.commit()
        return {"success": success, "shopify_product_id": shopify_product_id}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=5)


@shared_task(bind=True, max_retries=5, default_retry_delay=5)
def sync_inventory_to_shopify_task(self, product_id: str, available_stock: int):
    """Async background worker task to synchronize stock level changes to Shopify."""
    try:
        success = ShopifySyncService.sync_inventory(product_id, available_stock)
        return {"success": success, "product_id": product_id, "available_stock": available_stock}
    except ShopifyRateLimitError as rate_err:
        raise self.retry(exc=rate_err, countdown=rate_err.retry_after)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 5)


@shared_task(bind=True)
def retry_failed_shopify_syncs_task(self):
    """Periodic Celery Beat task to retry failed product syncs."""
    failed_products = Product.query.filter_by(sync_status="FAILED").limit(50).all()
    count = 0
    for prod in failed_products:
        sync_product_to_shopify_task.delay(prod.id)
        count += 1
    logger.info(f"Dispatched retry for {count} failed Shopify product syncs.")
    return {"retried_count": count}


MAX_ATTEMPTS = 5


@shared_task(bind=True, max_retries=MAX_ATTEMPTS, default_retry_delay=30)
def process_outbox_events(self, batch_size: int = 25):
    """Pulls PENDING outbox events (oldest first) and applies each to Shopify."""
    from datetime import datetime, timezone
    from app.models.outbox import OutboxEvent, OutboxStatus
    from app.integrations.shopify.client import ShopifyClient

    events = (
        db.session.query(OutboxEvent)
        .filter(OutboxEvent.status == OutboxStatus.PENDING)
        .order_by(OutboxEvent.created_at.asc())
        .limit(batch_size)
        .with_for_update(skip_locked=True)
        .all()
    )

    if not events:
        return {"processed": 0}

    client = ShopifyClient()
    processed_count = 0

    for event in events:
        try:
            if event.event_type == "INVENTORY_ADJUSTED":
                _apply_inventory_event(client, event)
            elif event.event_type in ("PRODUCT_UPDATED", "product.updated"):
                product_id = event.payload.get("product_id") or event.aggregate_id
                ShopifySyncService.sync_product(product_id)
            elif event.event_type in ("PRODUCT_CREATED", "product.created"):
                product_id = event.payload.get("product_id") or event.aggregate_id
                ShopifySyncService.sync_product(product_id)
            else:
                logger.info(f"Outbox event type '{event.event_type}' marked as processed.")

            event.status = OutboxStatus.PUBLISHED
            event.processed_at = datetime.now(timezone.utc)
            event.error_log = None
            db.session.commit()
            processed_count += 1

        except Exception as err:
            db.session.rollback()
            event.retry_count = (event.retry_count or 0) + 1
            event.error_log = str(err)[:500]
            if event.retry_count >= MAX_ATTEMPTS:
                event.status = OutboxStatus.FAILED
            db.session.add(event)
            db.session.commit()
            logger.warning(
                f"Outbox event {event.id} ({event.event_type}) failed "
                f"(attempt {event.retry_count}/{MAX_ATTEMPTS}): {err}"
            )

    return {"processed": processed_count}


def _apply_inventory_event(client, event):
    payload = event.payload or {}
    inventory_item_id = payload.get("shopify_inventory_item_id")
    location_id = payload.get("shopify_location_id")
    new_qty = payload.get("new_available_stock")

    if not inventory_item_id:
        product_id = payload.get("product_id") or event.aggregate_id
        product = db.session.get(Product, product_id)
        if product:
            inventory_item_id = product.shopify_inventory_item_id
            location_id = location_id or product.shopify_location_id

    if not location_id:
        from app.integrations.shopify.auth import ShopifyAuthManager
        location_id = ShopifyAuthManager.get_location_id()

    if not inventory_item_id or not location_id:
        raise ValueError(
            f"Missing shopify_inventory_item_id/location_id for product "
            f"{payload.get('product_id')} — was it published to Shopify?"
        )

    client.set_inventory_level(
        inventory_item_id=inventory_item_id,
        location_id=location_id,
        available_qty=new_qty,
    )
