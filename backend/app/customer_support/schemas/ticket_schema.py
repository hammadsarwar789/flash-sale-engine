from marshmallow import Schema, fields, validate, ValidationError


class CreateTicketSchema(Schema):
    """Marshmallow validation schema for customer ticket creation."""

    subject = fields.Str(
        required=True,
        validate=validate.Length(min=5, max=255, error="Subject must be between 5 and 255 characters.")
    )
    message = fields.Str(
        required=True,
        validate=validate.Length(min=10, max=5000, error="Message description must be between 10 and 5000 characters.")
    )
    category = fields.Str(
        dump_default="GENERAL",
        validate=validate.OneOf(["RETURNS", "SHIPPING", "PAYMENT", "WARRANTY", "GENERAL"], error="Invalid ticket category.")
    )
    priority = fields.Str(
        dump_default="MEDIUM",
        validate=validate.OneOf(["LOW", "MEDIUM", "HIGH", "CRITICAL"], error="Invalid priority level.")
    )
    order_id = fields.Str(allow_none=True)
    vendor_id = fields.Str(allow_none=True)
    attachments = fields.List(fields.Str(), validate=validate.Length(max=5, error="Maximum 5 attachments allowed."))


class UpdateStatusSchema(Schema):
    """Marshmallow validation schema for ticket status updates."""

    status = fields.Str(
        required=True,
        validate=validate.OneOf(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"], error="Invalid ticket status.")
    )


class ReplyTicketSchema(Schema):
    """Marshmallow validation schema for message replies."""

    message = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=5000, error="Reply content must be between 1 and 5000 characters.")
    )
    attachments = fields.List(fields.Str(), validate=validate.Length(max=5))
