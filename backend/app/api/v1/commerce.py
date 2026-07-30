from datetime import datetime, timezone, timedelta
from flask import jsonify, g, request
from flask_smorest import Blueprint
from app.core.extensions import db
from app.models.coupon import Coupon
from app.models.review import Review
from app.models.wishlist import WishlistItem
from app.models.shipping_address import ShippingAddress
from app.api.decorators import jwt_required, admin_required

commerce_bp = Blueprint("commerce", "commerce", url_prefix="/api/v1", description="Coupons, Reviews, Wishlists & Addresses")


# --- Coupon Endpoints ---

@commerce_bp.route("/coupons", methods=["GET"])
def list_coupons():
    """List all promotional coupons."""
    coupons = db.session.query(Coupon).order_by(Coupon.created_at.desc()).all()
    return jsonify([c.to_dict() for c in coupons]), 200


@commerce_bp.route("/coupons/validate", methods=["POST"])
def validate_coupon():
    """Validate a promo code for discount applicability."""
    data = request.get_json() or {}
    code = data.get("code")
    amount = float(data.get("amount", 0.0))

    if not code:
        return jsonify({"message": "Coupon code is required"}), 400

    coupon = db.session.query(Coupon).filter_by(code=code.upper(), is_active=True).first()
    if not coupon:
        return jsonify({"valid": False, "message": "Invalid or expired coupon code"}), 404

    if coupon.expires_at:
        exp_dt = coupon.expires_at.replace(tzinfo=timezone.utc) if coupon.expires_at.tzinfo is None else coupon.expires_at
        if datetime.now(timezone.utc) > exp_dt:
            return jsonify({"valid": False, "message": "This promo coupon code has expired"}), 400

    if amount < float(coupon.min_order_amount):
        return jsonify({
            "valid": False,
            "message": f"Minimum order amount for this coupon is ${float(coupon.min_order_amount):.2f}"
        }), 400

    discount = 0.0
    if coupon.discount_type == "percentage":
        discount = round(amount * (float(coupon.discount_value) / 100.0), 2)
    else:
        discount = float(coupon.discount_value)

    return jsonify({
        "valid": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "calculated_discount": discount,
    }), 200


@commerce_bp.route("/coupons", methods=["POST"])
@admin_required
def create_coupon():
    """Create a new promotional coupon code with optional expiration (Admin)."""
    data = request.get_json() or {}
    code = data.get("code", "").upper()
    if not code:
        return jsonify({"message": "Coupon code is required"}), 400

    expires_at = None
    valid_days = data.get("valid_days")
    if valid_days is not None and str(valid_days).isdigit() and int(valid_days) > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=int(valid_days))
    elif data.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(str(data["expires_at"]).replace("Z", "+00:00"))
        except Exception:
            pass

    coupon = Coupon(
        code=code,
        discount_type=data.get("discount_type", "percentage"),
        discount_value=data.get("discount_value", 10.0),
        min_order_amount=data.get("min_order_amount", 0.0),
        usage_limit=data.get("usage_limit"),
        expires_at=expires_at,
        is_active=True,
    )
    db.session.add(coupon)
    db.session.commit()
    return jsonify(coupon.to_dict()), 201


@commerce_bp.route("/coupons/<string:coupon_id>/toggle", methods=["PATCH"])
@admin_required
def toggle_coupon(coupon_id: str):
    """Toggle promo coupon active status (Resume / Pause)."""
    coupon = db.session.query(Coupon).filter_by(id=coupon_id).first()
    if not coupon:
        return jsonify({"message": f"Coupon '{coupon_id}' not found"}), 404

    coupon.is_active = not coupon.is_active
    db.session.commit()
    return jsonify({"message": f"Coupon code '{coupon.code}' status updated", "coupon": coupon.to_dict()}), 200


@commerce_bp.route("/coupons/<string:coupon_id>", methods=["DELETE"])
@admin_required
def delete_coupon(coupon_id: str):
    """Delete a promotional coupon code (Admin)."""
    coupon = db.session.query(Coupon).filter_by(id=coupon_id).first()
    if not coupon:
        return jsonify({"message": f"Coupon '{coupon_id}' not found"}), 404

    db.session.delete(coupon)
    db.session.commit()
    return jsonify({"message": f"Coupon '{coupon.code}' deleted successfully"}), 200



# --- Product Review Endpoints ---

def user_has_delivered_order(user_id: str, product_id: str) -> bool:
    """Check if the user has a DELIVERED order for the given product."""
    from app.models.order import Order, OrderStatus
    from app.models.order_item import OrderItem

    # Check direct single-product orders
    direct_order = db.session.query(Order).filter(
        Order.user_id == user_id,
        Order.product_id == product_id,
        Order.status == OrderStatus.DELIVERED
    ).first()
    if direct_order:
        return True

    # Check multi-item order items
    multi_order_item = db.session.query(OrderItem).join(Order).filter(
        Order.user_id == user_id,
        Order.status == OrderStatus.DELIVERED,
        OrderItem.product_id == product_id
    ).first()
    return multi_order_item is not None


@commerce_bp.route("/products/<string:product_id>/review-eligibility", methods=["GET"])
@jwt_required
def check_review_eligibility(product_id: str):
    """Check if authenticated user is eligible to review product (must have delivered order)."""
    user_id = g.current_user_id
    eligible = user_has_delivered_order(user_id, product_id)
    if eligible:
        return jsonify({"eligible": True, "message": "Eligible to write product review", "reason": "Eligible to write product review"}), 200
    else:
        return jsonify({
            "eligible": False,
            "message": "Purchase & receive this product to leave a review.",
            "reason": "Purchase & receive this product to leave a review.",
        }), 200


@commerce_bp.route("/products/<string:product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id):
    """List customer reviews for a product."""
    reviews = db.session.query(Review).filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews]), 200


@commerce_bp.route("/products/<string:product_id>/reviews", methods=["POST"])
@jwt_required
def add_product_review(product_id):
    """Submit a product review and rating (1-5 stars)."""
    user_id = g.current_user_id
    
    # Enforce delivered order verification
    if not user_has_delivered_order(user_id, product_id):
        return jsonify({
            "error": "Forbidden",
            "message": "You can only review products that have been delivered to you."
        }), 403

    data = request.get_json() or {}
    rating = int(data.get("rating", 5))

    if rating < 1 or rating > 5:
        return jsonify({"message": "Rating must be between 1 and 5 stars"}), 400

    review = Review(
        product_id=product_id,
        user_id=user_id,
        rating=rating,
        title=data.get("title"),
        comment=data.get("comment"),
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


# --- Wishlist Endpoints ---

@commerce_bp.route("/wishlist", methods=["GET"])
@jwt_required
def get_wishlist():
    """Get the authenticated user's wishlist/favorites."""
    user_id = g.current_user_id
    items = db.session.query(WishlistItem).filter_by(user_id=user_id).all()
    return jsonify([i.to_dict() for i in items]), 200


@commerce_bp.route("/wishlist/items", methods=["POST"])
@jwt_required
def add_to_wishlist():
    """Add a product to wishlist."""
    user_id = g.current_user_id
    data = request.get_json() or {}
    product_id = data.get("product_id")

    if not product_id:
        return jsonify({"message": "product_id is required"}), 400

    item = db.session.query(WishlistItem).filter_by(user_id=user_id, product_id=product_id).first()
    if not item:
        item = WishlistItem(user_id=user_id, product_id=product_id)
        db.session.add(item)
        db.session.commit()

    return jsonify(item.to_dict()), 201


@commerce_bp.route("/wishlist/items/<string:item_id>", methods=["DELETE"])
@jwt_required
def remove_from_wishlist(item_id):
    """Remove an item from wishlist."""
    user_id = g.current_user_id
    item = db.session.query(WishlistItem).filter_by(id=item_id, user_id=user_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return jsonify({"message": "Removed from wishlist"}), 200


# --- Shipping Address Endpoints ---

@commerce_bp.route("/shipping-addresses", methods=["GET"])
@jwt_required
def list_shipping_addresses():
    """List saved shipping addresses for user."""
    user_id = g.current_user_id
    addresses = db.session.query(ShippingAddress).filter_by(user_id=user_id).all()
    return jsonify([a.to_dict() for a in addresses]), 200


@commerce_bp.route("/shipping-addresses", methods=["POST"])
@jwt_required
def create_shipping_address():
    """Add a new shipping address."""
    user_id = g.current_user_id
    data = request.get_json() or {}

    address = ShippingAddress(
        user_id=user_id,
        recipient_name=data.get("recipient_name", "Recipient"),
        address_line1=data.get("address_line1", "123 Main St"),
        address_line2=data.get("address_line2"),
        city=data.get("city", "City"),
        state=data.get("state", "State"),
        postal_code=data.get("postal_code", "12345"),
        country=data.get("country", "US"),
        phone=data.get("phone"),
    )
    db.session.add(address)
    db.session.commit()
    return jsonify(address.to_dict()), 201
