from flask import jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.models.outbox import OutboxEvent
from app.models.task_log import TaskLog
from app.models.rbac import UserRole, UserOutletScope
from app.models.cart import CartItem
from app.models.wishlist import WishlistItem
from app.models.shipping_address import ShippingAddress
from app.models.review import Review
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
@require_permission("enterprise:users:read")
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

    try:
        # Clean up secondary / non-historical dependent records
        user = db.session.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({"error": "Not Found", "message": f"User '{user_id}' not found."}), 404

        # 1. Clear cart items and wishlist
        db.session.query(CartItem).filter_by(user_id=user_id).delete(synchronize_session=False)
        db.session.query(WishlistItem).filter_by(user_id=user_id).delete(synchronize_session=False)

        # 2. Clear reviews & shipping addresses
        db.session.query(Review).filter_by(user_id=user_id).delete(synchronize_session=False)
        db.session.query(ShippingAddress).filter_by(user_id=user_id).delete(synchronize_session=False)

        # 3. Clear RBAC roles & outlet scopes
        db.session.query(UserRole).filter_by(user_id=user_id).delete(synchronize_session=False)
        db.session.query(UserOutletScope).filter_by(user_id=user_id).delete(synchronize_session=False)

        # 4. Delete user account
        db.session.delete(user)
        db.session.commit()

        return jsonify({"message": f"User account '{target_user.email}' ({target_role}) deleted successfully."}), 200


    except Exception:
        db.session.rollback()
        # Fallback: If hard delete fails due to immutable history (e.g. Orders or Audit Logs FK constraint), deactivate user
        try:
            target_user = db.session.query(User).filter_by(id=user_id).first()
            if target_user:
                target_user.is_active = False
                target_user.status = "SUSPENDED"
                db.session.query(UserRole).filter_by(user_id=user_id).delete()
                db.session.query(UserOutletScope).filter_by(user_id=user_id).delete()
                db.session.commit()
                return jsonify({
                    "message": f"Account '{target_user.email}' ({target_role.upper()}) deactivated successfully (retained for order/audit history)."
                }), 200
            return jsonify({"message": f"User '{user_id}' not found"}), 404
        except Exception as inner_e:
            db.session.rollback()
            return jsonify({
                "error": "Deletion Failed",
                "message": f"Could not process user deletion: {str(inner_e)}"
            }), 400


@admin_bp.route("/orders", methods=["GET"])
@require_permission("enterprise:orders:read")
def list_admin_orders():
    """Retrieve all orders with optional status filtering (Admin)."""
    from flask import request
    from sqlalchemy.orm import joinedload
    status = request.args.get("status")
    query = db.session.query(Order).options(
        joinedload(Order.user),
        joinedload(Order.product),
        joinedload(Order.shipping_address),
    )
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders]), 200


@admin_bp.route("/orders/<string:order_id>", methods=["PATCH"])
@require_permission("enterprise:orders:write")
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


# --- Merchant Seller & KYC Management ---

@admin_bp.route("/sellers", methods=["GET"])
@admin_required
def list_sellers():
    """List all merchant sellers for approval, suspension, or compliance audit (Admin)."""
    from app.models.seller import Seller
    from flask import request
    status_filter = request.args.get("status", "").upper()
    query = db.session.query(Seller)
    if status_filter:
        query = query.filter(Seller.status == status_filter)
    sellers = query.order_by(Seller.created_at.desc()).all()
    return jsonify([s.to_dict() for s in sellers]), 200


@admin_bp.route("/sellers/<string:seller_id>/status", methods=["PATCH"])
@admin_required
def update_seller_status(seller_id: str):
    """Approve, suspend, or reject a merchant store (Admin)."""
    from datetime import datetime, timezone
    from app.models.seller import Seller
    from flask import request
    data = request.get_json() or {}
    status = data.get("status", "").upper()

    if status not in ["APPROVED", "SUSPENDED", "REJECTED", "PENDING"]:
        return jsonify({"error": "Bad Request", "message": "Status must be APPROVED, SUSPENDED, REJECTED, or PENDING."}), 400

    seller = db.session.query(Seller).filter_by(id=seller_id).first()
    if not seller:
        return jsonify({"error": "Not Found", "message": f"Seller '{seller_id}' not found."}), 404

    seller.status = status

    # Update seller owner user status
    if seller.owner:
        if status == "APPROVED":
            seller.owner.status = "ACTIVE"
            seller.owner.is_active = True
        elif status in ["SUSPENDED", "REJECTED"]:
            seller.owner.status = status
            seller.owner.is_active = False

    db.session.commit()
    return jsonify({"message": f"Seller '{seller.store_name}' status set to '{status}'.", "seller": seller.to_dict()}), 200


@admin_bp.route("/sellers/<string:seller_id>/kyc/<string:doc_id>", methods=["PATCH"])
@admin_required
def review_seller_kyc_doc(seller_id: str, doc_id: str):
    """Review and verify or reject a seller KYC document (Admin)."""
    from datetime import datetime, timezone
    from app.models.seller import SellerKYCDocument
    from flask import request
    data = request.get_json() or {}
    status = data.get("status", "").upper()

    if status not in ["VERIFIED", "REJECTED"]:
        return jsonify({"error": "Bad Request", "message": "Status must be VERIFIED or REJECTED."}), 400

    doc = db.session.query(SellerKYCDocument).filter_by(id=doc_id, seller_id=seller_id).first()
    if not doc:
        return jsonify({"error": "Not Found", "message": "KYC document not found."}), 404

    doc.status = status
    doc.reviewed_by = getattr(g, "current_user_id", None) or getattr(g, "user_id", None)
    doc.reviewed_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": f"KYC document '{doc.doc_type}' set to '{status}'.", "kyc_document": doc.to_dict()}), 200


# --- Admin Payout Clearinghouse ---

@admin_bp.route("/payouts", methods=["GET"])
@admin_required
def list_admin_payouts():
    """List all merchant payout withdrawal requests (Admin)."""
    from app.models.financials import PayoutRequest
    from flask import request
    status_filter = request.args.get("status", "").upper()
    query = db.session.query(PayoutRequest)
    if status_filter:
        query = query.filter_by(status=status_filter)
    payouts = query.order_by(PayoutRequest.requested_at.desc()).all()
    return jsonify([p.to_dict() for p in payouts]), 200


@admin_bp.route("/payouts/<string:payout_id>", methods=["PATCH"])
@admin_required
def update_admin_payout_status(payout_id: str):
    """Approve, process, or mark a merchant payout request as PAID or REJECTED (Admin)."""
    from datetime import datetime, timezone
    from app.models.financials import PayoutRequest
    from flask import request
    data = request.get_json() or {}
    status = data.get("status", "").upper()

    if status not in ["PROCESSING", "PAID", "REJECTED"]:
        return jsonify({"error": "Bad Request", "message": "Status must be PROCESSING, PAID, or REJECTED."}), 400

    payout = db.session.query(PayoutRequest).filter_by(id=payout_id).first()
    if not payout:
        return jsonify({"error": "Not Found", "message": f"Payout request '{payout_id}' not found."}), 404

    payout.status = status
    payout.processed_by = getattr(g, "current_user_id", None) or getattr(g, "user_id", None)
    payout.processed_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": f"Payout request for ${float(payout.amount):.2f} updated to '{status}'.", "payout": payout.to_dict()}), 200


@admin_bp.route("/ledger", methods=["GET"])
@admin_required
def list_admin_financial_ledger():
    """Retrieve full append-only financial ledger event trail for audit compliance (Admin)."""
    from app.models.financials import LedgerEntry
    entries = db.session.query(LedgerEntry).order_by(LedgerEntry.created_at.desc()).limit(150).all()
    return jsonify([e.to_dict() for e in entries]), 200

