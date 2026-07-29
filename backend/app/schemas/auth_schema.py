from marshmallow import Schema, fields, validate, INCLUDE


class UserRegisterSchema(Schema):
    """Schema for user registration request."""

    class Meta:
        unknown = INCLUDE

    email = fields.String(required=True, metadata={"description": "User email address"})
    password = fields.String(
        required=True,
        metadata={"description": "Password"},
    )
    full_name = fields.String(required=False, metadata={"description": "Full name"})
    request_type = fields.String(required=False)
    target_outlet_id = fields.String(required=False)
    company_name = fields.String(required=False)
    tenant_id = fields.String(required=False)
    role = fields.String(required=False)


class UserLoginSchema(Schema):
    """Schema for user login request."""

    class Meta:
        unknown = INCLUDE

    email = fields.String(required=True, metadata={"description": "User email address"})
    password = fields.String(required=True, metadata={"description": "User password"})


class UserResponseSchema(Schema):
    """Schema for user detail response."""

    id = fields.String(dump_only=True)
    email = fields.Email(dump_only=True)
    full_name = fields.String(dump_only=True)
    role = fields.String(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    created_at = fields.String(dump_only=True)


class TokenResponseSchema(Schema):
    """Schema for JWT authentication response."""

    access_token = fields.String(required=True)
    token_type = fields.String(dump_default="Bearer")
    expires_in = fields.Integer(required=True)
    user = fields.Nested(UserResponseSchema, required=True)
