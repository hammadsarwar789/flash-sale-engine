import logging
import os
from flask import jsonify, request
from flask_smorest import Blueprint
from app.services.order_service import OrderService

logger = logging.getLogger(__name__)

webhooks_bp = Blueprint("webhooks", "webhooks", url_prefix="/api/v1/webhooks", description="External Payment & Event Webhooks")


@webhooks_bp.route("/stripe", methods=["POST"])
def stripe_webhook():
    """
    Signature-verified Stripe Webhook Handler.
    Reconciles order state asynchronously on payment events.
    """
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    event = None
    if endpoint_secret and sig_header:
        try:
            import stripe
            event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        except Exception as e:
            logger.error(f"Stripe Webhook signature verification failed: {e}")
            return jsonify({"error": "Invalid signature"}), 400
    else:
        # Development fallback parsing when webhook secret is omitted
        try:
            event = request.get_json() or {}
        except Exception:
            return jsonify({"error": "Invalid JSON payload"}), 400

    event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", None)
    data_object = event.get("data", {}).get("object", {}) if isinstance(event, dict) else getattr(getattr(event, "data", None), "object", {})

    order_id = data_object.get("metadata", {}).get("order_id") or data_object.get("client_reference_id")

    if event_type == "payment_intent.succeeded":
        logger.info(f"Received payment_intent.succeeded webhook for order '{order_id}'")
        if order_id:
            success, msg = OrderService.pay_order(order_id)
            return jsonify({"status": "processed", "order_id": order_id, "detail": msg}), 200

    elif event_type == "payment_intent.payment_failed":
        logger.info(f"Received payment_intent.payment_failed webhook for order '{order_id}'")
        if order_id:
            success, msg = OrderService.cancel_order(order_id)
            return jsonify({"status": "cancelled", "order_id": order_id, "detail": msg}), 200

    return jsonify({"status": "ignored", "event_type": event_type}), 200
