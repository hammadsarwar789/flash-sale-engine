from marshmallow import Schema, fields, validate


class ProductVariantCreateSchema(Schema):
    """Schema for creating a product variant."""

    sku = fields.String(required=True, validate=validate.Length(min=1, max=64))
    name = fields.String(required=True, validate=validate.Length(min=1, max=128))
    size = fields.String(required=False)
    color = fields.String(required=False)
    price = fields.Float(required=True, validate=validate.Range(min=0.01))
    total_stock = fields.Integer(required=False, load_default=0, validate=validate.Range(min=0))
    available_stock = fields.Integer(required=False, load_default=0, validate=validate.Range(min=0))


class ProductVariantUpdateSchema(Schema):
    """Schema for updating a product variant."""

    sku = fields.String(required=False, validate=validate.Length(min=1, max=64))
    name = fields.String(required=False, validate=validate.Length(min=1, max=128))
    size = fields.String(required=False)
    color = fields.String(required=False)
    price = fields.Float(required=False, validate=validate.Range(min=0.01))
    total_stock = fields.Integer(required=False, validate=validate.Range(min=0))
    available_stock = fields.Integer(required=False, validate=validate.Range(min=0))


class ProductVariantResponseSchema(Schema):
    """Schema for product variant response."""

    id = fields.String(dump_only=True)
    product_id = fields.String(dump_only=True)
    sku = fields.String(dump_only=True)
    name = fields.String(dump_only=True)
    size = fields.String(dump_only=True)
    color = fields.String(dump_only=True)
    price = fields.Float(dump_only=True)
    total_stock = fields.Integer(dump_only=True)
    available_stock = fields.Integer(dump_only=True)


class ProductCreateSchema(Schema):
    """Schema for product creation request."""

    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255),
        metadata={"description": "Product name"},
    )
    sku = fields.String(
        required=True,
        validate=validate.Length(min=1, max=64),
        metadata={"description": "Unique SKU code"},
    )
    total_stock = fields.Integer(
        required=True,
        validate=validate.Range(min=0),
        metadata={"description": "Initial total stock quantity"},
    )
    price = fields.Float(
        required=True,
        validate=validate.Range(min=0.01),
        metadata={"description": "Unit price"},
    )
    discount_percentage = fields.Float(required=False, validate=validate.Range(min=0.0, max=100.0), load_default=0.0)
    category_id = fields.String(required=False)
    description = fields.String(required=False)
    images = fields.List(fields.String(), required=False)
    variants = fields.List(fields.Nested(ProductVariantCreateSchema), required=False)


class ProductUpdateSchema(Schema):
    """Schema for updating product details."""

    name = fields.String(required=False, validate=validate.Length(min=1, max=255))
    sku = fields.String(required=False, validate=validate.Length(min=1, max=64))
    price = fields.Float(required=False, validate=validate.Range(min=0.01))
    total_stock = fields.Integer(required=False, validate=validate.Range(min=0))
    available_stock = fields.Integer(required=False, validate=validate.Range(min=0))
    discount_percentage = fields.Float(required=False, validate=validate.Range(min=0.0, max=100.0))
    category_id = fields.String(required=False)
    description = fields.String(required=False)
    images = fields.List(fields.String(), required=False)
    is_active = fields.Boolean(required=False)
    variants = fields.List(fields.Nested(ProductVariantCreateSchema), required=False)


class ProductQuerySchema(Schema):
    """Schema for querying and filtering product listings."""

    search = fields.String(required=False, metadata={"description": "Search term in name or description"})
    category_id = fields.String(required=False, metadata={"description": "Filter by category ID"})
    sort_by = fields.String(required=False, validate=validate.OneOf(["price_asc", "price_desc", "created_at"]), load_default="created_at")
    page = fields.Integer(required=False, load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(required=False, load_default=20, validate=validate.Range(min=1, max=100))


class ProductResponseSchema(Schema):
    """Schema for product detail response."""

    id = fields.String(dump_only=True)
    category_id = fields.String(dump_only=True)
    category_name = fields.String(dump_only=True)
    name = fields.String(dump_only=True)
    sku = fields.String(dump_only=True)
    description = fields.String(dump_only=True)
    images = fields.List(fields.String(), dump_only=True)
    total_stock = fields.Integer(dump_only=True)
    available_stock = fields.Integer(dump_only=True)
    price = fields.Float(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    version = fields.Integer(dump_only=True)
    variants = fields.Nested(ProductVariantResponseSchema, many=True, dump_only=True)
    created_at = fields.String(dump_only=True)
