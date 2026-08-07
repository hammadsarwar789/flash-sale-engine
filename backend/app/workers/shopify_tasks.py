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
