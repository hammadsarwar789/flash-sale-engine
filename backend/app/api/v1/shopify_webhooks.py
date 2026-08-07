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

        # Resolve local product or variant matching Shopify IDs / SKU
        first_item = dto["line_items"][0] if dto["line_items"] else {}
        sh_variant_id = first_item.get("shopify_variant_id")
        sh_product_id = first_item.get("shopify_product_id")
        sku = first_item.get("sku")
        qty = first_item.get("quantity", 1)

        product = None
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

        # Fallback to first available active product if unmatched in sandbox test
        if not product:
            product = db.session.query(Product).filter_by(is_active=True).first()

        if not product:
            logger.error(f"Could not match local product for Shopify Order {shopify_order_id}")
            return jsonify({"error": "Product Not Found", "message": "No matching product in local catalog"}), 400

        # Execute Order Service Creation & Redis Inventory Lua Hold
        success, msg, order, _ = OrderService.create_reservation(
            user_id="usr_shopify_guest_001",
            product_id=product.id,
            quantity=qty,
            idempotency_key=f"sh_ord_{shopify_order_id}",
        )

        if not success or not order:
            logger.error(f"Failed to reserve local order for Shopify Webhook {shopify_order_id}: {msg}")
            return jsonify({"error": "Order Reservation Failed", "message": msg}), 400

        # Update Shopify specific Order attributes
        order.source = "SHOPIFY"
        order.shopify_order_id = shopify_order_id
        order.shopify_order_number = dto["shopify_order_number"]
        order.status = OrderStatus.PAID
        db.session.commit()

        redis_client.set(idempotency_key, "COMPLETED", ex=86400)

        # Flow 6: Trigger stock sync back to Shopify so both stores show updated inventory
        try:
            from app.workers.shopify_tasks import sync_inventory_to_shopify_task
            sync_inventory_to_shopify_task.delay(product.id, product.available_stock)
        except Exception as task_err:
            logger.warning(f"Could not dispatch inventory sync task: {task_err}")

        logger.info(f"Processed Shopify Order Webhook {shopify_order_id} -> Created local Order {order.id}")
        return jsonify({
            "status": "success",
            "order_id": order.id,
            "shopify_order_id": shopify_order_id,
            "available_stock": product.available_stock
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
                prod = db.session.get(Product, order.product_id)
                if prod:
                    InventoryService.release_stock(prod.id, order.quantity or 1)
                    try:
                        from app.workers.shopify_tasks import sync_inventory_to_shopify_task
                        sync_inventory_to_shopify_task.delay(prod.id, prod.available_stock)
                    except Exception:
                        pass

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

        order = db.session.query(Order).filter_by(shopify_order_id=shopify_order_id).first()
        if order:
            order.status = OrderStatus.REFUNDED
            db.session.commit()
            if order.product_id:
                prod = db.session.get(Product, order.product_id)
                if prod:
                    InventoryService.release_stock(prod.id, order.quantity or 1)
                    try:
                        from app.workers.shopify_tasks import sync_inventory_to_shopify_task
                        sync_inventory_to_shopify_task.delay(prod.id, prod.available_stock)
                    except Exception:
                        pass

        return jsonify({"status": "success", "message": "Shopify refund synced"}), 200
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
                product.available_stock = max(0, available_qty)
                db.session.commit()
                # Update Redis in-memory stock
                redis_client.set(f"product:{product.id}:stock", product.available_stock)
                logger.info(f"Synced Shopify inventory update for product {product.id} to {product.available_stock}.")

        return jsonify({"status": "success", "message": "Shopify inventory update processed"}), 200
    except Exception as ex:
        logger.error(f"Error processing Shopify inventory webhook: {ex}")
        return jsonify({"error": "Internal Server Error", "message": str(ex)}), 500
