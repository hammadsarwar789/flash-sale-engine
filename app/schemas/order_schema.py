from marshmallow import Schema, fields, validate


class OrderReserveSchema(Schema):
    """Schema for flash sale reservation request."""

    product_id = fields.String(
        required=True,
        metadata={"description": "UUID of product to reserve"},
    )
    quantity = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
        metadata={"description": "Quantity of stock to reserve"},
    )


class OrderItemResponseSchema(Schema):
    """Schema for individual order line items."""

    id = fields.String(dump_only=True)
    order_id = fields.String(dump_only=True)
    product_id = fields.String(dump_only=True)
    product_name = fields.String(dump_only=True)
    quantity = fields.Integer(dump_only=True)
    unit_price = fields.Float(dump_only=True)
    subtotal = fields.Float(dump_only=True)


class OrderResponseSchema(Schema):
    """Schema for reservation and order status response."""

    id = fields.String(dump_only=True)
    user_id = fields.String(dump_only=True)
    product_id = fields.String(dump_only=True)
    status = fields.String(dump_only=True)
    quantity = fields.Integer(dump_only=True)
    unit_price = fields.Float(dump_only=True)
    subtotal = fields.Float(dump_only=True)
    tax = fields.Float(dump_only=True)
    shipping_fee = fields.Float(dump_only=True)
    total_amount = fields.Float(dump_only=True)
    idempotency_key = fields.String(dump_only=True)
    expires_at = fields.String(dump_only=True)
    created_at = fields.String(dump_only=True)
    items = fields.Nested(OrderItemResponseSchema, many=True, dump_only=True)


class ReservationAcceptedSchema(Schema):
    """Schema for HTTP 202 Accepted flash sale reservation response."""

    message = fields.String(dump_only=True)
    order = fields.Nested(OrderResponseSchema, dump_only=True)
    task_id = fields.String(dump_only=True)
    status_url = fields.String(dump_only=True)
