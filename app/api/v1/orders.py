from flask import jsonify, g, request
from flask_smorest import Blueprint
from app.core.extensions import db
from app.models.order import Order
from app.schemas.order_schema import (
    OrderReserveSchema,
    OrderResponseSchema,
    ReservationAcceptedSchema,
    PaymentIntentRequestSchema,
    PaymentIntentResponseSchema,
)
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.api.decorators import jwt_required, idempotent, rate_limit

orders_bp = Blueprint("orders", "orders", url_prefix="/api/v1/orders", description="Order & Reservation operations")


@orders_bp.route("/reserve", methods=["POST"])
@jwt_required
@rate_limit(limit=10, period=60)
@idempotent(required=True, expire_seconds=86400)
@orders_bp.arguments(OrderReserveSchema)
@orders_bp.response(202, ReservationAcceptedSchema)
def reserve_inventory(reservation_data):
    """
    Core Flash Sale Endpoint.
    Requires Idempotency-Key header. Decrements stock via Lua script, saves order & outbox event.
    """
    user_id = g.current_user_id
    product_id = reservation_data["product_id"]
    quantity = reservation_data["quantity"]
    idempotency_key = request.headers.get("Idempotency-Key")

    success, msg, order, outbox_event = OrderService.create_reservation(
        user_id=user_id,
        product_id=product_id,
        quantity=quantity,
        idempotency_key=idempotency_key,
    )

    if not success:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/reservation-failed",
                    "title": "Reservation Failed",
                    "status": 400,
                    "detail": msg,
                }
            ),
            400,
        )

    return (
        {
            "message": "Order reservation accepted and enqueued for async processing.",
            "order": order.to_dict(),
            "task_id": outbox_event.id if outbox_event else None,
            "status_url": f"/api/v1/orders/{order.id}",
        },
        202,
    )


@orders_bp.route("/checkout", methods=["POST"])
@jwt_required
@rate_limit(limit=10, period=60)
@idempotent(required=True, expire_seconds=86400)
@orders_bp.response(202, ReservationAcceptedSchema)
def checkout_cart():
    """
    Checkout Multi-Item Cart Endpoint.
    Requires Idempotency-Key header. Atomically reserves stock for all cart items, creates order & outbox event, and clears cart.
    """
    user_id = g.current_user_id
    idempotency_key = request.headers.get("Idempotency-Key")

    success, msg, order, outbox_event = OrderService.create_checkout_order(
        user_id=user_id,
        idempotency_key=idempotency_key,
    )

    if not success:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/checkout-failed",
                    "title": "Checkout Failed",
                    "status": 400,
                    "detail": msg,
                }
            ),
            400,
        )

    return (
        {
            "message": "Cart checkout completed and order enqueued.",
            "order": order.to_dict(),
            "task_id": outbox_event.id if outbox_event else None,
            "status_url": f"/api/v1/orders/{order.id}",
        },
        202,
    )


@orders_bp.route("/guest-checkout", methods=["POST"])
@rate_limit(limit=10, period=60)
@idempotent(required=True, expire_seconds=86400)
@orders_bp.response(202, ReservationAcceptedSchema)
def guest_checkout():
    """
    Guest Checkout Endpoint.
    Does not require JWT auth. Accepts email, item list, and idempotency key.
    """
    data = request.get_json() or {}
    guest_email = data.get("email")
    items = data.get("items", [])
    idempotency_key = request.headers.get("Idempotency-Key")

    if not guest_email or not items:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/invalid-guest-checkout",
                    "title": "Bad Request",
                    "status": 400,
                    "detail": "Both 'email' and 'items' list are required for guest checkout.",
                }
            ),
            400,
        )

    success, msg, order, outbox_event = OrderService.create_guest_checkout(
        guest_email=guest_email,
        items_data=items,
        idempotency_key=idempotency_key,
    )

    if not success:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/checkout-failed",
                    "title": "Checkout Failed",
                    "status": 400,
                    "detail": msg,
                }
            ),
            400,
        )

    return (
        {
            "message": "Guest checkout completed and order enqueued.",
            "order": order.to_dict(),
            "task_id": outbox_event.id if outbox_event else None,
            "status_url": f"/api/v1/orders/{order.id}",
        },
        202,
    )


@orders_bp.route("/<string:order_id>", methods=["GET"])
@jwt_required
@orders_bp.response(200, OrderResponseSchema)
def get_order_status(order_id):
    """Retrieve details and status for a specific order."""
    user_id = g.current_user_id
    order = db.session.query(Order).filter_by(id=order_id, user_id=user_id).first()

    if not order:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Not Found",
                    "status": 404,
                    "detail": f"Order with ID '{order_id}' not found.",
                }
            ),
            404,
        )

    return order.to_dict(), 200


@orders_bp.route("", methods=["GET"])
@jwt_required
@orders_bp.response(200, OrderResponseSchema(many=True))
def list_user_orders():
    """Retrieve list of orders for the authenticated user."""
    user_id = g.current_user_id
    orders = (
        db.session.query(Order)
        .filter_by(user_id=user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [o.to_dict() for o in orders], 200


@orders_bp.route("/<string:order_id>/pay", methods=["POST"])
@jwt_required
def pay_order(order_id):
    """Process payment for an active reservation before the 10-minute expiry (Development Progress Stub)."""
    user_id = g.current_user_id
    success, msg = OrderService.pay_order(order_id=order_id, user_id=user_id)

    if not success:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/payment-failed",
                    "title": "Payment Processing Failed",
                    "status": 400,
                    "detail": msg,
                }
            ),
            400,
        )

    return jsonify({
        "status": "in_development",
        "message": "Payment Integration in Development Progress",
        "order_id": order_id,
        "payment_status": "PAID",
    }), 200


@orders_bp.route("/payments/intent", methods=["POST"])
@jwt_required
@orders_bp.arguments(PaymentIntentRequestSchema)
@orders_bp.response(201, PaymentIntentResponseSchema)
def create_payment_intent(intent_data):
    """Create a Stripe PaymentIntent for a pending order."""
    user_id = g.current_user_id
    order_id = intent_data["order_id"]
    currency = intent_data.get("currency", "usd")

    success, msg, data = PaymentService.create_payment_intent(
        order_id=order_id,
        user_id=user_id,
        currency=currency,
    )

    if not success:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/payment-intent-failed",
                    "title": "PaymentIntent Creation Failed",
                    "status": 400,
                    "detail": msg,
                }
            ),
            400,
        )

    return data, 201


@orders_bp.route("/<string:order_id>/cancel", methods=["POST"])
@jwt_required
def cancel_order(order_id):
    """Cancel active reservation and immediately release inventory back to pool."""
    user_id = g.current_user_id
    success, msg = OrderService.cancel_order(order_id=order_id, user_id=user_id)

    if not success:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/cancel-failed",
                    "title": "Cancellation Failed",
                    "status": 400,
                    "detail": msg,
                }
            ),
            400,
        )

    return jsonify({"message": msg, "order_id": order_id, "status": "CANCELLED"}), 200
