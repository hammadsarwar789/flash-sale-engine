"""
app/services/inventory_sync.py

Central inventory adjustment service.

Every stock change in the system — regardless of where it comes from —
must go through adjust_stock(). This is what stops Postgres, Redis, and
Shopify from silently drifting apart.

RULE: adjust_stock() is the ONLY code path allowed to write to
Product.available_stock / ProductVariant.available_stock, or the Redis
stock keys. Checkout, admin, and webhook handlers call this — they never
touch stock fields directly.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.extensions import db, redis_client
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.outbox import OutboxEvent, OutboxStatus

logger = logging.getLogger(__name__)

# Sources that mean "Shopify is already correct" — never push back for these,
# or you create an infinite update loop between the two systems.
_SHOPIFY_ORIGIN_SOURCES = {"SHOPIFY"}


class InventoryAdjustmentError(Exception):
    pass


def adjust_stock(
    *,
    product_id: Optional[str] = None,
    variant_id: Optional[str] = None,
    delta: int,
    reason: str,
    source: str,
    reference_id: Optional[str] = None,
) -> int:
    """
    Atomically adjust stock for a product or variant in Postgres, mirror it
    to Redis, synchronize parent product aggregate stock, and — if this change
    didn't originate from Shopify — enqueue an outbox event so a background
    worker pushes the new quantity to Shopify's Admin API.

    Args:
        product_id / variant_id: exactly one must be supplied.
        delta: positive to add stock (refund, restock), negative to
            remove (sale). Pass the actual quantity, not a percentage.
        reason: short machine tag for audit/debugging, e.g.
            "WEB_ORDER_PLACED", "SHOPIFY_ORDER_PLACED", "ADMIN_STOCK_EDIT",
            "WEB_ORDER_REFUNDED", "SHOPIFY_ORDER_REFUNDED".
        source: "WEB" | "SHOPIFY" | "ADMIN" — where the change originated.
            Only non-SHOPIFY sources trigger a push back to Shopify.
        reference_id: order id / admin user id / etc, stored on the
            outbox event for traceability.

    Returns:
        The new available_stock value for the targeted product or variant.

    Raises:
        InventoryAdjustmentError if the target doesn't exist or the
        adjustment would take stock negative.
    """
    if bool(product_id) == bool(variant_id):
        raise ValueError("adjust_stock requires exactly one of product_id or variant_id")

    model = ProductVariant if variant_id else Product
    target_id = variant_id or product_id

    # Row-level lock — prevents a lost-update race if two adjustments land on the same SKU.
    row = db.session.query(model).filter_by(id=target_id).with_for_update(of=model).first()
    if row is None:
        raise InventoryAdjustmentError(f"{model.__name__} {target_id} not found")

    current_qty = int(row.available_stock or 0)
    new_qty = current_qty + delta
    if new_qty < 0:
        raise InventoryAdjustmentError(
            f"Adjustment would take {model.__name__} {target_id} negative "
            f"({current_qty} + {delta} = {new_qty})"
        )

    row.available_stock = new_qty
    db.session.add(row)

    # Resolve parent product & synchronize parent Product.available_stock from all variants
    if model is ProductVariant:
        product = db.session.query(Product).filter_by(id=row.product_id).with_for_update(of=Product).first()
        if product:
            all_variants = db.session.query(ProductVariant).filter_by(product_id=product.id).all()
            total_var_stock = sum(
                new_qty if v.id == row.id else int(v.available_stock or 0)
                for v in all_variants
            )
            product.available_stock = total_var_stock
            db.session.add(product)
    else:
        product = row

    should_push_to_shopify = (
        source not in _SHOPIFY_ORIGIN_SOURCES
        and product is not None
        and bool(product.is_listed_on_shopify)
    )

    if should_push_to_shopify:
        sh_inv_item_id = (row.shopify_inventory_item_id if variant_id else product.shopify_inventory_item_id) or product.shopify_inventory_item_id
        sh_variant_id = (row.shopify_variant_id if variant_id else product.shopify_variant_id) or product.shopify_variant_id

        outbox_event = OutboxEvent(
            aggregate_type="PRODUCT",
            aggregate_id=product.id,
            event_type="INVENTORY_ADJUSTED",
            payload={
                "product_id": product.id,
                "variant_id": variant_id,
                "shopify_product_id": product.shopify_product_id,
                "shopify_variant_id": sh_variant_id,
                "shopify_inventory_item_id": sh_inv_item_id,
                "shopify_location_id": product.shopify_location_id,
                "new_available_stock": new_qty,
                "reason": reason,
                "source": source,
                "reference_id": reference_id,
            },
            status=OutboxStatus.PENDING,
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(outbox_event)

    db.session.commit()

    # Mirror new stock to Redis with standardized key formats
    try:
        if variant_id:
            redis_client.set(f"variant:{variant_id}:stock", new_qty)
            if product:
                redis_client.set(f"product:{product.id}:stock", product.available_stock)
        else:
            redis_client.set(f"product:{product.id}:stock", new_qty)

        # Invalidate all catalog cache keys
        redis_client.delete("catalog:default")
        keys = redis_client.keys("catalog:products:*")
        if keys:
            redis_client.delete(*keys)
    except Exception as redis_err:
        logger.warning(f"Redis stock mirror failed for key {target_id}: {redis_err}")

    # Kick immediate outbox drain task
    if should_push_to_shopify:
        try:
            from app.workers.shopify_tasks import process_outbox_events
            process_outbox_events.delay()
        except Exception as task_err:
            logger.debug(f"Immediate outbox drain task dispatch skipped: {task_err}")

    return new_qty
