from marshmallow import Schema, fields, validate


class UserRegisterSchema(Schema):
    """Schema for user registration request."""

    email = fields.Email(required=True, metadata={"description": "User email address"})
    password = fields.String(
        required=True,
        validate=validate.Length(min=8, max=128),
        metadata={"description": "Password (min 8 characters)"},
    )
    full_name = fields.String(required=False, metadata={"description": "Full name"})


class UserLoginSchema(Schema):
    """Schema for user login request."""

    email = fields.Email(required=True, metadata={"description": "User email address"})
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
