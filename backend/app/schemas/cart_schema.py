from marshmallow import Schema, fields, validate


class AddToCartSchema(Schema):
    """Schema for adding an item to the shopping cart."""

    product_id = fields.String(
        required=True,
        metadata={"description": "UUID of product to add to cart"},
    )
    variant_id = fields.String(
        required=False,
        metadata={"description": "Optional UUID of specific product SKU variant"},
    )
    quantity = fields.Integer(
        required=False,
        load_default=1,
        validate=validate.Range(min=1),
        metadata={"description": "Quantity to add (default: 1)"},
    )


class UpdateCartItemSchema(Schema):
    """Schema for updating cart item quantity."""

    quantity = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
        metadata={"description": "New quantity for cart item"},
    )


class CartItemResponseSchema(Schema):
    """Schema for cart item response."""

    id = fields.String(dump_only=True)
    user_id = fields.String(dump_only=True)
    product_id = fields.String(dump_only=True)
    product_name = fields.String(dump_only=True)
    variant_id = fields.String(dump_only=True)
    variant_name = fields.String(dump_only=True)
    variant_sku = fields.String(dump_only=True)
    quantity = fields.Integer(dump_only=True)
    unit_price = fields.Float(dump_only=True)
    subtotal = fields.Float(dump_only=True)
    created_at = fields.String(dump_only=True)


class CartResponseSchema(Schema):
    """Schema for user cart overview response."""

    items = fields.Nested(CartItemResponseSchema, many=True, dump_only=True)
    subtotal = fields.Float(dump_only=True)
    item_count = fields.Integer(dump_only=True)
    expires_at = fields.String(dump_only=True, allow_none=True, metadata={"description": "ISO 8601 UTC timestamp when active hold expires"})
