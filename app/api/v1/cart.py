from flask import jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.models.cart import CartItem
from app.models.product import Product
from app.schemas.cart_schema import (
    AddToCartSchema,
    UpdateCartItemSchema,
    CartResponseSchema,
    CartItemResponseSchema,
)
from app.api.decorators import jwt_required, rate_limit

cart_bp = Blueprint("cart", "cart", url_prefix="/api/v1/cart", description="Shopping Cart Operations")


@cart_bp.route("", methods=["GET"])
@jwt_required
@cart_bp.response(200, CartResponseSchema)
def get_cart():
    """Get the current authenticated user's shopping cart."""
    user_id = g.current_user_id
    items = db.session.query(CartItem).filter_by(user_id=user_id).all()
    item_dicts = [item.to_dict() for item in items]
    subtotal = sum(i["subtotal"] for i in item_dicts)
    item_count = sum(i["quantity"] for i in item_dicts)

    return {
        "items": item_dicts,
        "subtotal": round(subtotal, 2),
        "item_count": item_count,
    }, 200


@cart_bp.route("/items", methods=["POST"])
@jwt_required
@rate_limit(limit=30, period=60)
@cart_bp.arguments(AddToCartSchema)
@cart_bp.response(201, CartItemResponseSchema)
def add_to_cart(data):
    """Add a product item to the shopping cart."""
    user_id = g.current_user_id
    product_id = data["product_id"]
    quantity = data.get("quantity", 1)

    product = db.session.query(Product).filter_by(id=product_id, is_active=True).first()
    if not product:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Product Not Found",
                    "status": 404,
                    "detail": f"Product with ID '{product_id}' not found or inactive.",
                }
            ),
            404,
        )

    cart_item = db.session.query(CartItem).filter_by(user_id=user_id, product_id=product_id).first()

    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(
            user_id=user_id,
            product_id=product_id,
            quantity=quantity,
        )
        db.session.add(cart_item)

    db.session.commit()
    return cart_item.to_dict(), 201


@cart_bp.route("/items/<string:item_id>", methods=["PATCH"])
@jwt_required
@cart_bp.arguments(UpdateCartItemSchema)
@cart_bp.response(200, CartItemResponseSchema)
def update_cart_item(data, item_id):
    """Update item quantity in cart."""
    user_id = g.current_user_id
    cart_item = db.session.query(CartItem).filter_by(id=item_id, user_id=user_id).first()

    if not cart_item:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Cart Item Not Found",
                    "status": 404,
                    "detail": f"Cart item with ID '{item_id}' not found.",
                }
            ),
            404,
        )

    cart_item.quantity = data["quantity"]
    db.session.commit()
    return cart_item.to_dict(), 200


@cart_bp.route("/items/<string:item_id>", methods=["DELETE"])
@jwt_required
def delete_cart_item(item_id):
    """Remove a specific item from the cart."""
    user_id = g.current_user_id
    cart_item = db.session.query(CartItem).filter_by(id=item_id, user_id=user_id).first()

    if not cart_item:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Cart Item Not Found",
                    "status": 404,
                    "detail": f"Cart item with ID '{item_id}' not found.",
                }
            ),
            404,
        )

    db.session.delete(cart_item)
    db.session.commit()
    return jsonify({"message": "Item removed from cart", "item_id": item_id}), 200


@cart_bp.route("", methods=["DELETE"])
@jwt_required
def clear_cart():
    """Clear all items from user's shopping cart."""
    user_id = g.current_user_id
    db.session.query(CartItem).filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "Cart cleared successfully"}), 200
