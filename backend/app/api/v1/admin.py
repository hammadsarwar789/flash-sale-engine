from flask import jsonify
from flask_smorest import Blueprint
from app.core.extensions import db
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.outbox import OutboxEvent
from app.models.task_log import TaskLog
from app.api.decorators import admin_required
from app.core.authorization import require_permission

admin_bp = Blueprint("admin", "admin", url_prefix="/api/v1/admin", description="Admin Operations & Telemetry")


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_system_stats():
    """Retrieve high-level system telemetry and aggregate metrics (Admin)."""
    total_products = db.session.query(Product).count()
    total_orders = db.session.query(Order).count()
    pending_orders = db.session.query(Order).filter_by(status=OrderStatus.PENDING).count()
    paid_orders = db.session.query(Order).filter_by(status=OrderStatus.PAID).count()
    expired_orders = db.session.query(Order).filter_by(status=OrderStatus.EXPIRED).count()
    total_users = db.session.query(User).count()
    pending_outbox = db.session.query(OutboxEvent).filter_by(status="PENDING").count()
    published_outbox = db.session.query(OutboxEvent).filter_by(status="PUBLISHED").count()

    return jsonify({
        "total_products": total_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "paid_orders": paid_orders,
        "expired_orders": expired_orders,
        "total_users": total_users,
        "outbox_pending": pending_outbox,
        "outbox_published": published_outbox,
    }), 200


@admin_bp.route("/outbox", methods=["GET"])
@admin_required
def list_outbox_events():
    """Retrieve recent Transactional Outbox events for event stream monitoring (Admin)."""
    events = (
        db.session.query(OutboxEvent)
        .order_by(OutboxEvent.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([e.to_dict() for e in events]), 200


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    """Retrieve user account listing (Admin)."""
    users = db.session.query(User).order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@admin_bp.route("/users/<string:user_id>", methods=["DELETE"])
@require_permission("outlet:staff:approve")
def delete_user(user_id):
    """Delete employee, manager, or vendor account based on hierarchical authority."""
    target_user = db.session.query(User).filter_by(id=user_id).first()
    if not target_user:
        return jsonify({"message": f"User '{user_id}' not found"}), 404

    # Prevent deleting self
    if g.user_id == target_user.id:
        return jsonify({"message": "Cannot delete your own active account."}), 400

    actor_role = getattr(g, "user_role", "user")
    target_role = getattr(target_user, "role", "user")

    # Hierarchical Authority Check: non-enterprise admins cannot delete admins or managers
    if not g.is_enterprise_admin and actor_role != "admin":
        if target_role in ["admin", "manager"]:
            return jsonify({
                "error": "Forbidden",
                "message": f"Higher-level authority required to delete a {target_role.upper()} account."
            }), 403

    db.session.delete(target_user)
    db.session.commit()

    return jsonify({
        "message": f"Account '{target_user.email}' ({target_role.upper()}) deleted successfully."
    }), 200


@admin_bp.route("/orders", methods=["GET"])
@admin_required
def list_admin_orders():
    """Retrieve all orders with optional status filtering (Admin)."""
    from flask import request
    status = request.args.get("status")
    query = db.session.query(Order)
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders]), 200


@admin_bp.route("/orders/<string:order_id>", methods=["PATCH"])
@admin_required
def update_admin_order(order_id):
    """Update order status (e.g., SHIPPED, DELIVERED, REFUNDED) and fulfillment tracking (Admin)."""
    from flask import request
    data = request.get_json() or {}
    order = db.session.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({"message": f"Order '{order_id}' not found"}), 404

    refund_detail = None
    if "status" in data:
        new_status = str(data["status"]).upper()
        if new_status == "REFUNDED" or new_status == OrderStatus.REFUNDED:
            from app.services.payment_service import PaymentService
            from app.services.order_service import OrderService
            success, msg, refund_detail = PaymentService.issue_refund(order_id)
            OrderService.refund_order(order_id)
        else:
            order.status = data["status"]
            if new_status == "SHIPPED" or new_status == OrderStatus.SHIPPED:
                if not order.tracking_number and "tracking_number" not in data:
                    order.tracking_number = f"TRK-{order.id[:8].upper()}-GLOBAL"
                if not order.carrier and "carrier" not in data:
                    order.carrier = "FEDEX EXPRESS"

    if "tracking_number" in data:
        order.tracking_number = data["tracking_number"]
    if "carrier" in data:
        order.carrier = data["carrier"]

    db.session.commit()
    res_payload = {"message": "Order updated successfully", "order": order.to_dict()}
    if refund_detail:
        res_payload["refund"] = refund_detail
    return jsonify(res_payload), 200


@admin_bp.route("/task-logs", methods=["GET"])
@admin_required
def list_task_logs():
    """Retrieve background Celery task execution logs (Admin)."""
    logs = (
        db.session.query(TaskLog)
        .order_by(TaskLog.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([l.to_dict() for l in logs]), 200
