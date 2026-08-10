import json
import logging
from flask import request, jsonify
from flask_smorest import Blueprint
from app.core.extensions import db, redis_client
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.models.order import Order, OrderStatus
from app.services.order_service import OrderService
from app.services.escrow_engine import release_matured_escrow
from app.services.inventory_service import InventoryService
from app.integrations.shopify.webhooks import ShopifyWebhookVerifier
from app.integrations.shopify.mapper import ShopifyMapper
from app.integrations.shopify.exceptions import ShopifyWebhookVerificationError

logger = logging.getLogger(__name__)

shopify_webhooks_bp = Blueprint(
    "shopify_webhooks",
    __name__,
    url_prefix="/api/v1/webhooks/shopify",
    description="Inbound Shopify Store Webhook Handlers",
)


def _verify_shopify_hmac():
    """Helper to verify incoming Shopify webhook HMAC signature header."""
    raw_data = request.get_data()
    hmac_header = request.headers.get("X-Shopify-Hmac-Sha256", "")
    try:
        ShopifyWebhookVerifier.verify_signature(raw_data, hmac_header)
    except ShopifyWebhookVerificationError as err:
        logger.error(f"Shopify webhook signature verification failed: {err}")
        return False
    return True


@shopify_webhooks_bp.route("/orders", methods=["POST"])
@shopify_webhooks_bp.route("/orders/create", methods=["POST"])
def shopify_order_created_webhook():
    """Inbound webhook triggered when a customer completes an order on Shopify."""
    if not _verify_shopify_hmac():
        return jsonify({"error": "Unauthorized", "message": "Invalid HMAC signature"}), 401

    try:
        payload = request.get_json(force=True) or {}
        dto = ShopifyMapper.shopify_order_to_local_order_dto(payload)
        shopify_order_id = dto["shopify_order_id"]

        # Idempotency Check: Reject duplicate webhook dispatches
        idempotency_key = f"idempotency:shopify:order:{shopify_order_id}"
        if redis_client.get(idempotency_key):
            logger.info(f"Duplicate Shopify order webhook {shopify_order_id} received. Replaying HTTP 200 OK.")
            return jsonify({"status": "ignored", "message": "Duplicate order event"}), 200

        # Mark idempotency key in Redis for 24 hours
        redis_client.set(idempotency_key, "PROCESSING", ex=86400)

        # Check if order already exists in database
        existing = db.session.query(Order).filter_by(shopify_order_id=shopify_order_id).first()
        if existing:
            redis_client.set(idempotency_key, "COMPLETED", ex=86400)
            return jsonify({"status": "success", "order_id": existing.id, "message": "Order already processed"}), 200

        # Resolve and deduct stock for ALL line items in the Shopify order
        processed_items = []
        for line_item in dto["line_items"]:
            sh_variant_id = line_item.get("shopify_variant_id")
            sh_product_id = line_item.get("shopify_product_id")
            sku = line_item.get("sku")
            qty = line_item.get("quantity", 1)

            product = None
            variant = None
            if sh_variant_id:
                variant = db.session.query(ProductVariant).filter_by(shopify_variant_id=str(sh_variant_id)).first()
                if variant:
                    product = variant.product
            if not product and sh_product_id:
                product = db.session.query(Product).filter(
                    (Product.shopify_product_id == str(sh_product_id)) |
                    (Product.shopify_product_id == f"gid://shopify/Product/{sh_product_id}")
                ).first()
            if not product and sku:
                product = db.session.query(Product).filter_by(sku=sku).first()

            if not product:
                logger.warning(f"Could not match local product for Shopify line item SKU={sku}, variant={sh_variant_id}")
                continue

            try:
                from app.services.inventory_sync import adjust_stock
                if variant:
                    adjust_stock(
                        variant_id=variant.id,
                        delta=-qty,
                        reason="SHOPIFY_ORDER_PLACED",
                        source="SHOPIFY",
                        reference_id=shopify_order_id,
                    )
                else:
                    adjust_stock(
                        product_id=product.id,
                        delta=-qty,
                        reason="SHOPIFY_ORDER_PLACED",
                        source="SHOPIFY",
                        reference_id=shopify_order_id,
                    )
                processed_items.append({"product_id": product.id, "qty": qty})
            except Exception as stock_err:
                logger.warning(f"Failed to adjust stock for Shopify order line item: {stock_err}")

        if not processed_items:
            logger.error(f"Could not match any local products for Shopify Order {shopify_order_id}")
            return jsonify({"error": "Product Not Found", "message": "No matching products in local catalog"}), 400

        redis_client.set(idempotency_key, "COMPLETED", ex=86400)

        logger.info(f"Processed Shopify Order Webhook {shopify_order_id} -> {len(processed_items)} items deducted")
        return jsonify({
            "status": "success",
            "shopify_order_id": shopify_order_id,
            "items_processed": len(processed_items),
        }), 200

    except Exception as ex:
        logger.error(f"Error processing Shopify order webhook: {ex}")
        return jsonify({"error": "Internal Server Error", "message": str(ex)}), 500


@shopify_webhooks_bp.route("/orders/cancelled", methods=["POST"])
def shopify_order_cancelled_webhook():
    """Inbound webhook triggered when an order is cancelled in Shopify."""
    if not _verify_shopify_hmac():
        return jsonify({"error": "Unauthorized", "message": "Invalid HMAC signature"}), 401

    try:
        payload = request.get_json(force=True) or {}
        shopify_order_id = str(payload.get("id", ""))

        order = db.session.query(Order).filter_by(shopify_order_id=shopify_order_id).first()
        if order and order.status != OrderStatus.CANCELLED:
            order.status = OrderStatus.CANCELLED
            db.session.commit()
            if order.product_id:
                try:
                    from app.services.inventory_sync import adjust_stock
                    adjust_stock(
                        product_id=order.product_id,
                        delta=+(order.quantity or 1),
                        reason="SHOPIFY_ORDER_CANCELLED",
                        source="SHOPIFY",
                        reference_id=order.id,
                    )
                except Exception as stock_err:
                    logger.warning(f"Could not adjust stock on Shopify order cancellation: {stock_err}")

        return jsonify({"status": "success", "message": "Shopify order cancellation synced"}), 200
    except Exception as ex:
        logger.error(f"Error processing Shopify order cancellation webhook: {ex}")
        return jsonify({"error": "Internal Server Error", "message": str(ex)}), 500


@shopify_webhooks_bp.route("/refunds", methods=["POST"])
@shopify_webhooks_bp.route("/refunds/create", methods=["POST"])
def shopify_refund_created_webhook():
    """Inbound webhook triggered when a refund is issued in Shopify."""
    if not _verify_shopify_hmac():
        return jsonify({"error": "Unauthorized", "message": "Invalid HMAC signature"}), 401

    try:
        payload = request.get_json(force=True) or {}
        shopify_order_id = str(payload.get("order_id") or payload.get("id") or "")

        # Parse refund_line_items from Shopify payload for exact quantities
        refund_line_items = payload.get("refund_line_items") or []
        restored_count = 0

        for rli in refund_line_items:
            restock_qty = int(rli.get("quantity", 0))
            if restock_qty <= 0:
                continue

            line_item = rli.get("line_item") or {}
            sh_variant_id = str(line_item.get("variant_id", ""))
            sh_product_id = str(line_item.get("product_id", ""))
            sku = line_item.get("sku") or ""

            product = None
            variant = None
            if sh_variant_id:
                variant = db.session.query(ProductVariant).filter_by(shopify_variant_id=sh_variant_id).first()
                if variant:
                    product = variant.product
            if not product and sh_product_id:
                product = db.session.query(Product).filter(
                    (Product.shopify_product_id == sh_product_id) |
                    (Product.shopify_product_id == f"gid://shopify/Product/{sh_product_id}")
                ).first()
            if not product and sku:
                product = db.session.query(Product).filter_by(sku=sku).first()

            if not product:
                logger.warning(f"Could not match local product for Shopify refund line item SKU={sku}")
                continue

            try:
                from app.services.inventory_sync import adjust_stock
                if variant:
                    adjust_stock(
                        variant_id=variant.id,
                        delta=+restock_qty,
                        reason="SHOPIFY_ORDER_REFUNDED",
                        source="SHOPIFY",
                        reference_id=shopify_order_id,
                    )
                else:
                    adjust_stock(
                        product_id=product.id,
                        delta=+restock_qty,
                        reason="SHOPIFY_ORDER_REFUNDED",
                        source="SHOPIFY",
                        reference_id=shopify_order_id,
                    )
                restored_count += 1
            except Exception as stock_err:
                logger.warning(f"Could not adjust stock on Shopify refund line item: {stock_err}")

        # Fallback: if no refund_line_items parsed, use legacy order-level restore
        if not refund_line_items:
            order = db.session.query(Order).filter_by(shopify_order_id=shopify_order_id).first()
            if order and order.product_id:
                try:
                    from app.services.inventory_sync import adjust_stock
                    adjust_stock(
                        product_id=order.product_id,
                        delta=+(order.quantity or 1),
                        reason="SHOPIFY_ORDER_REFUNDED",
                        source="SHOPIFY",
                        reference_id=order.id,
                    )
                    restored_count += 1
                except Exception as stock_err:
                    logger.warning(f"Could not adjust stock on Shopify refund: {stock_err}")

        return jsonify({"status": "success", "message": f"Shopify refund synced, {restored_count} items restored"}), 200
    except Exception as ex:
        logger.error(f"Error processing Shopify refund webhook: {ex}")
        return jsonify({"error": "Internal Server Error", "message": str(ex)}), 500


@shopify_webhooks_bp.route("/inventory", methods=["POST"])
@shopify_webhooks_bp.route("/inventory_levels/update", methods=["POST"])
def shopify_inventory_update_webhook():
    """Inbound webhook triggered when stock level is modified inside Shopify."""
    if not _verify_shopify_hmac():
        return jsonify({"error": "Unauthorized", "message": "Invalid HMAC signature"}), 401

    try:
        payload = request.get_json(force=True) or {}
        inventory_item_id = str(payload.get("inventory_item_id", ""))
        available_qty = int(payload.get("available", 0))

        if inventory_item_id:
            product = db.session.query(Product).filter(
                (Product.shopify_inventory_item_id == inventory_item_id) |
                (Product.shopify_inventory_item_id == f"gid://shopify/InventoryItem/{inventory_item_id}")
            ).first()

            if product:
                delta = available_qty - (product.available_stock or 0)
                if delta != 0:
                    try:
                        from app.services.inventory_sync import adjust_stock
                        adjust_stock(
                            product_id=product.id,
                            delta=delta,
                            reason="SHOPIFY_INVENTORY_UPDATE",
                            source="SHOPIFY",
                            reference_id=inventory_item_id,
                        )
                    except Exception as stock_err:
                        logger.warning(f"Could not adjust stock on Shopify inventory update: {stock_err}")

        return jsonify({"status": "success", "message": "Shopify inventory update processed"}), 200
    except Exception as ex:
        logger.error(f"Error processing Shopify inventory webhook: {ex}")
        return jsonify({"error": "Internal Server Error", "message": str(ex)}), 500
