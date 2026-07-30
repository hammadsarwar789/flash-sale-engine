from datetime import datetime, timezone
from flask import request, jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.api.decorators import jwt_required, admin_required
from app.models.dispute import Dispute, SellerRating
from app.models.sub_order import SubOrder

support_bp = Blueprint("support", "support", url_prefix="/api/v1/support", description="Buyer-Seller Disputes & Mediation Desk")


@support_bp.route("/disputes", methods=["POST"])
@jwt_required
def raise_order_dispute():
    """Raise a buyer-seller dispute for a sub-order (e.g. damaged goods, missing items, delivery delay)."""
    data = request.get_json() or {}
    sub_order_id = data.get("sub_order_id")
    reason = data.get("reason", "").strip()

    if not sub_order_id or not reason:
        return jsonify({"error": "Bad Request", "message": "sub_order_id and reason are required."}), 400

    sub_order = db.session.query(SubOrder).filter_by(id=sub_order_id).first()
    if not sub_order:
        return jsonify({"error": "Not Found", "message": f"Sub-order '{sub_order_id}' not found."}), 404

    existing = db.session.query(Dispute).filter_by(sub_order_id=sub_order_id, raised_by=g.current_user_id, status="OPEN").first()
    if existing:
        return jsonify({"error": "Conflict", "message": "An open dispute case already exists for this sub-order.", "dispute": existing.to_dict()}), 409

    dispute = Dispute(
        sub_order_id=sub_order.id,
        raised_by=g.current_user_id,
        reason=reason,
        status="OPEN",
    )
    db.session.add(dispute)
    db.session.commit()

    return jsonify({
        "message": "Dispute case opened successfully! A support mediation officer will review your claim.",
        "dispute": dispute.to_dict(),
    }), 201


@support_bp.route("/disputes", methods=["GET"])
@jwt_required
def list_disputes():
    """List open dispute cases for customer claims or administrative mediation."""
    from app.models.user import User
    user = db.session.query(User).filter_by(id=g.current_user_id).first()
    status_filter = request.args.get("status", "").upper()

    query = db.session.query(Dispute)
    if user and user.role != "admin":
        query = query.filter_by(raised_by=g.current_user_id)

    if status_filter:
        query = query.filter_by(status=status_filter)

    disputes = query.order_by(Dispute.created_at.desc()).all()
    return jsonify([d.to_dict() for d in disputes]), 200


@support_bp.route("/disputes/<string:dispute_id>", methods=["PATCH"])
@admin_required
def resolve_dispute(dispute_id: str):
    """Update dispute status (UNDER_REVIEW, RESOLVED, ESCALATED) and add resolution notes (Admin/Support)."""
    data = request.get_json() or {}
    status = data.get("status", "").upper()
    notes = data.get("resolution_notes")

    dispute = db.session.query(Dispute).filter_by(id=dispute_id).first()
    if not dispute:
        return jsonify({"error": "Not Found", "message": f"Dispute case '{dispute_id}' not found."}), 404

    if status in ["OPEN", "UNDER_REVIEW", "RESOLVED", "ESCALATED"]:
        dispute.status = status
        if status == "RESOLVED":
            dispute.resolved_at = datetime.now(timezone.utc)

    if notes:
        dispute.resolution_notes = notes

    dispute.assigned_to = g.current_user_id
    db.session.commit()

    return jsonify({"message": f"Dispute case set to '{dispute.status}'.", "dispute": dispute.to_dict()}), 200


@support_bp.route("/ratings", methods=["POST"])
@jwt_required
def submit_seller_rating():
    """Submit a star rating and customer review for a merchant seller."""
    data = request.get_json() or {}
    sub_order_id = data.get("sub_order_id")
    rating_val = data.get("rating")
    comment = data.get("comment")

    if not sub_order_id or not rating_val:
        return jsonify({"error": "Bad Request", "message": "sub_order_id and rating are required."}), 400

    try:
        rating_int = int(rating_val)
        if rating_int < 1 or rating_int > 5:
            raise ValueError
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "Rating must be an integer between 1 and 5 stars."}), 400

    sub_order = db.session.query(SubOrder).filter_by(id=sub_order_id).first()
    if not sub_order:
        return jsonify({"error": "Not Found", "message": f"Sub-order '{sub_order_id}' not found."}), 404

    existing_rating = db.session.query(SellerRating).filter_by(sub_order_id=sub_order_id, rated_by=g.current_user_id).first()
    if existing_rating:
        existing_rating.rating = rating_int
        existing_rating.comment = comment
        db.session.commit()
        return jsonify({"message": "Seller review updated successfully!", "rating": existing_rating.to_dict()}), 200

    rating = SellerRating(
        seller_id=sub_order.seller_id,
        sub_order_id=sub_order.id,
        rated_by=g.current_user_id,
        rating=rating_int,
        comment=comment,
    )
    db.session.add(rating)
    db.session.commit()

    return jsonify({"message": "Seller review submitted successfully!", "rating": rating.to_dict()}), 201
