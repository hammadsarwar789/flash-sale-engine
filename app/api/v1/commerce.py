from flask import jsonify, g, request
from flask_smorest import Blueprint
from app.core.extensions import db
from app.models.coupon import Coupon
from app.models.review import Review
from app.models.wishlist import WishlistItem
from app.models.shipping_address import ShippingAddress
from app.models.product import Product
from app.api.decorators import jwt_required, admin_required

commerce_bp = Blueprint("commerce", "commerce", url_prefix="/api/v1", description="Coupons, Reviews, Wishlists & Addresses")


# --- Coupon Endpoints ---

@commerce_bp.route("/coupons/validate", methods=["POST"])
@jwt_required
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
    """Create a new promotional coupon code (Admin)."""
    data = request.get_json() or {}
    code = data.get("code", "").upper()
    if not code:
        return jsonify({"message": "Coupon code is required"}), 400

    coupon = Coupon(
        code=code,
        discount_type=data.get("discount_type", "percentage"),
        discount_value=data.get("discount_value", 10.0),
        min_order_amount=data.get("min_order_amount", 0.0),
        usage_limit=data.get("usage_limit"),
        is_active=True,
    )
    db.session.add(coupon)
    db.session.commit()
    return jsonify(coupon.to_dict()), 201


# --- Product Review Endpoints ---

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
