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


from datetime import datetime, timezone, timedelta

@cart_bp.route("", methods=["GET", "OPTIONS"])
@jwt_required
@cart_bp.response(200, CartResponseSchema)
def get_cart():
    """Get the current authenticated user's shopping cart with server-authoritative hold expiration."""
    user_id = g.current_user_id
    items = db.session.query(CartItem).filter_by(user_id=user_id).all()
    
    now = datetime.now(timezone.utc)
    valid_items = []
    expired_found = False
    
    for item in items:
        if not item.created_at:
            valid_items.append(item)
            continue
        created = item.created_at if item.created_at.tzinfo else item.created_at.replace(tzinfo=timezone.utc)
        if (now - created).total_seconds() > 600:
            db.session.delete(item)
            expired_found = True
        else:
            valid_items.append(item)
            
    if expired_found:
        db.session.commit()

    item_dicts = [item.to_dict() for item in valid_items]
    subtotal = sum(i["subtotal"] for i in item_dicts)
    item_count = sum(i["quantity"] for i in item_dicts)

    expires_at = None
    if valid_items:
        # Hold expires 10 minutes (600s) from oldest valid item in the reservation hold
        valid_dates = [
            (item.created_at if item.created_at.tzinfo else item.created_at.replace(tzinfo=timezone.utc))
            for item in valid_items
            if item.created_at
        ]
        if valid_dates:
            oldest_created = min(valid_dates)
            expires_at = (oldest_created + timedelta(minutes=10)).isoformat()

    return {
        "items": item_dicts,
        "subtotal": round(subtotal, 2),
        "item_count": item_count,
        "expires_at": expires_at,
    }, 200


@cart_bp.route("/items", methods=["POST", "OPTIONS"])
@jwt_required
@rate_limit(limit=30, period=60)
@cart_bp.arguments(AddToCartSchema)
@cart_bp.response(201, CartItemResponseSchema)
def add_to_cart(data):
    """Add a product item or SKU variant to the shopping cart."""
    user_id = g.current_user_id
    product_id = data["product_id"]
    variant_id = data.get("variant_id")
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

    variant = None
    if variant_id:
        from app.models.product_variant import ProductVariant
        variant = db.session.query(ProductVariant).filter_by(id=variant_id, product_id=product_id).first()
        if not variant:
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/not-found",
                        "title": "Variant Not Found",
                        "status": 404,
                        "detail": f"Variant with ID '{variant_id}' not found for product '{product_id}'.",
                    }
                ),
                404,
            )

    # Validate stock availability atomically at the variant/product level
    available_stock = variant.available_stock if variant else product.available_stock
    try:
        from app.core.extensions import redis_client
        if redis_client:
            redis_key = f"stock:variant:{variant_id}" if variant_id else f"stock:product:{product_id}"
            r_stock = redis_client.get(redis_key)
            if r_stock is not None:
                available_stock = int(r_stock)
    except Exception:
        pass

    cart_item = db.session.query(CartItem).filter_by(user_id=user_id, product_id=product_id, variant_id=variant_id).first()
    current_qty = cart_item.quantity if cart_item else 0
    total_requested = current_qty + quantity

    if total_requested > available_stock:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/conflict",
                    "title": "Insufficient Stock",
                    "status": 409,
                    "detail": f"Requested quantity ({total_requested}) exceeds available stock ({available_stock}).",
                    "available_stock": max(0, available_stock),
                }
            ),
            409,
        )

    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(
            user_id=user_id,
            product_id=product_id,
            variant_id=variant_id,
            quantity=quantity,
        )
        db.session.add(cart_item)

    db.session.commit()
    return cart_item.to_dict(), 201


@cart_bp.route("/items/<string:item_id>", methods=["PATCH", "OPTIONS"])
@jwt_required
@cart_bp.arguments(UpdateCartItemSchema)
@cart_bp.response(200, CartItemResponseSchema)
def update_cart_item(data, item_id):
    """Update item quantity in cart with stock validation."""
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

    # Validate stock limit on update
    variant = None
    if cart_item.variant_id:
        from app.models.product_variant import ProductVariant
        variant = db.session.query(ProductVariant).filter_by(id=cart_item.variant_id).first()
    available_stock = variant.available_stock if variant else (cart_item.product.available_stock if cart_item.product else 99)
    try:
        from app.core.extensions import redis_client
        if redis_client:
            redis_key = f"stock:variant:{cart_item.variant_id}" if cart_item.variant_id else f"stock:product:{cart_item.product_id}"
            r_stock = redis_client.get(redis_key)
            if r_stock is not None:
                available_stock = int(r_stock)
    except Exception:
        pass

    if data["quantity"] > available_stock:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/conflict",
                    "title": "Insufficient Stock",
                    "status": 409,
                    "detail": f"Requested quantity ({data['quantity']}) exceeds available stock ({available_stock}).",
                    "available_stock": max(0, available_stock),
                }
            ),
            409,
        )

    cart_item.quantity = data["quantity"]
    db.session.commit()
    return cart_item.to_dict(), 200


@cart_bp.route("/items/<string:item_id>", methods=["DELETE", "OPTIONS"])
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


@cart_bp.route("", methods=["DELETE", "OPTIONS"])
@jwt_required
def clear_cart():
    """Clear all items from user's shopping cart."""
    user_id = g.current_user_id
    db.session.query(CartItem).filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "Cart cleared successfully"}), 200
