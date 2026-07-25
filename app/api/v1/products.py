import logging
from flask import jsonify, request
from flask_smorest import Blueprint
from app.core.extensions import db, redis_client
from app.models.product import Product
from app.models.category import Category
from app.schemas.product_schema import (
    ProductCreateSchema,
    ProductUpdateSchema,
    ProductQuerySchema,
    ProductResponseSchema,
)
from app.schemas.category_schema import CategoryCreateSchema, CategoryResponseSchema
from app.services.inventory_service import InventoryService
from app.api.decorators import admin_required

logger = logging.getLogger(__name__)

products_bp = Blueprint("products", "products", url_prefix="/api/v1/products", description="Product Catalog & Category operations")


# --- Category Endpoints ---

@products_bp.route("/categories", methods=["GET"])
@products_bp.response(200, CategoryResponseSchema(many=True))
def list_categories():
    """Retrieve list of all product categories."""
    categories = db.session.query(Category).order_by(Category.name.asc()).all()
    return [c.to_dict() for c in categories], 200


@products_bp.route("/categories", methods=["POST"])
@admin_required
@products_bp.arguments(CategoryCreateSchema)
@products_bp.response(201, CategoryResponseSchema)
def create_category(category_data):
    """Create a new product category (Admin)."""
    slug = category_data.get("slug") or category_data["name"].lower().replace(" ", "-")
    existing = db.session.query(Category).filter((Category.name == category_data["name"]) | (Category.slug == slug)).first()
    if existing:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/category-exists",
                    "title": "Conflict",
                    "status": 409,
                    "detail": "Category name or slug already exists.",
                }
            ),
            409,
        )

    category = Category(
        name=category_data["name"],
        slug=slug,
        description=category_data.get("description"),
        parent_id=category_data.get("parent_id"),
    )
    db.session.add(category)
    db.session.commit()
    return category.to_dict(), 201


# --- Product Endpoints ---

@products_bp.route("", methods=["GET"])
@products_bp.arguments(ProductQuerySchema, location="query")
@products_bp.response(200, ProductResponseSchema(many=True))
def list_products(query_args):
    """Retrieve active products with search, category filtering, sorting, and pagination."""
    query = db.session.query(Product).filter(Product.is_active == True)

    search = query_args.get("search")
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_pattern)) | (Product.description.ilike(search_pattern)) | (Product.sku.ilike(search_pattern))
        )

    category_id = query_args.get("category_id")
    if category_id:
        query = query.filter(Product.category_id == category_id)

    sort_by = query_args.get("sort_by", "created_at")
    if sort_by == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    page = query_args.get("page", 1)
    per_page = query_args.get("per_page", 20)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    result = []
    for p in pagination.items:
        p_dict = p.to_dict()
        try:
            stock_key = f"product:{p.id}:stock"
            cached_stock = redis_client.get(stock_key)
            if cached_stock is not None:
                p_dict["available_stock"] = int(cached_stock)
        except Exception as e:
            logger.warning(f"Redis cache lookup bypassed for product {p.id}: {e}")
        result.append(p_dict)

    return result, 200


@products_bp.route("/<string:product_id>", methods=["GET"])
@products_bp.response(200, ProductResponseSchema)
def get_product(product_id):
    """Retrieve detailed product information by ID."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Not Found",
                    "status": 404,
                    "detail": f"Product with ID '{product_id}' not found.",
                }
            ),
            404,
        )

    p_dict = product.to_dict()
    try:
        stock_key = f"product:{product.id}:stock"
        cached_stock = redis_client.get(stock_key)
        if cached_stock is not None:
            p_dict["available_stock"] = int(cached_stock)
    except Exception as e:
        logger.warning(f"Redis cache lookup bypassed for product {product.id}: {e}")

    return p_dict, 200


@products_bp.route("", methods=["POST"])
@admin_required
@products_bp.arguments(ProductCreateSchema)
@products_bp.response(201, ProductResponseSchema)
def create_product(product_data):
    """Create a new product and populate the Redis inventory pool (Admin)."""
    existing_product = db.session.query(Product).filter_by(sku=product_data["sku"]).first()
    if existing_product:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/sku-exists",
                    "title": "Conflict",
                    "status": 409,
                    "detail": f"Product with SKU '{product_data['sku']}' already exists.",
                }
            ),
            409,
        )

    product = Product(
        name=product_data["name"],
        sku=product_data["sku"],
        category_id=product_data.get("category_id"),
        description=product_data.get("description"),
        images=product_data.get("images", []),
        total_stock=product_data["total_stock"],
        available_stock=product_data["total_stock"],
        price=product_data["price"],
        is_active=True,
    )
    db.session.add(product)
    db.session.commit()

    try:
        InventoryService.warmup_product_stock(product.id)
    except Exception as e:
        logger.warning(f"Redis stock warmup skipped for new product {product.id}: {e}")

    return product.to_dict(), 201


@products_bp.route("/<string:product_id>", methods=["PUT"])
@admin_required
@products_bp.arguments(ProductUpdateSchema)
@products_bp.response(200, ProductResponseSchema)
def update_product(product_data, product_id):
    """Update product details (Admin)."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Not Found",
                    "status": 404,
                    "detail": f"Product with ID '{product_id}' not found.",
                }
            ),
            404,
        )

    for field, val in product_data.items():
        setattr(product, field, val)

    db.session.commit()
    try:
        InventoryService.warmup_product_stock(product.id)
    except Exception as e:
        logger.warning(f"Redis stock update skipped: {e}")

    return product.to_dict(), 200


@products_bp.route("/<string:product_id>", methods=["DELETE"])
@admin_required
def delete_product(product_id):
    """Deactivate/Delete product (Admin)."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Not Found",
                    "status": 404,
                    "detail": f"Product with ID '{product_id}' not found.",
                }
            ),
            404,
        )

    product.is_active = False
    db.session.commit()
    return jsonify({"message": f"Product '{product_id}' deactivated successfully"}), 200


@products_bp.route("/<string:product_id>/sync-stock", methods=["POST"])
@admin_required
def sync_product_stock(product_id):
    """Force synchronize Redis inventory cache with PostgreSQL DB state (Admin)."""
    try:
        result = InventoryService.reconcile_product_stock(product_id)
        if "error" in result:
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/not-found",
                        "title": "Not Found",
                        "status": 404,
                        "detail": result["error"],
                    }
                ),
                404,
            )
        return jsonify({"message": "Stock reconciled successfully", "details": result}), 200
    except Exception as e:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/redis-unavailable",
                    "title": "Service Unavailable",
                    "status": 503,
                    "detail": f"Redis cache service is currently offline: {str(e)}",
                }
            ),
            503,
        )
