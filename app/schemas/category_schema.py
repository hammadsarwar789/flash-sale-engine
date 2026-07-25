from marshmallow import Schema, fields


class CategoryCreateSchema(Schema):
    """Schema for creating a category."""

    name = fields.String(required=True, metadata={"description": "Category name"})
    slug = fields.String(required=False, metadata={"description": "URL slug"})
    description = fields.String(required=False, metadata={"description": "Category description"})
    parent_id = fields.String(required=False, metadata={"description": "Parent category UUID"})


class CategoryResponseSchema(Schema):
    """Schema for category response."""

    id = fields.String(dump_only=True)
    name = fields.String(dump_only=True)
    slug = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    parent_id = fields.String(dump_only=True)
    created_at = fields.String(dump_only=True)
