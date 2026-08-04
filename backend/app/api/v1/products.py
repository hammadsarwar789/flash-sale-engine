import json
import logging
from flask import jsonify, request
from flask_smorest import Blueprint
from app.core.extensions import db, redis_client
from app.models.product import Product
from app.models.category import Category
from app.models.product_variant import ProductVariant
from app.models.user import User
from app.schemas.product_schema import (
    ProductCreateSchema,
    ProductUpdateSchema,
    ProductQuerySchema,
    ProductResponseSchema,
    ProductVariantCreateSchema,
    ProductVariantUpdateSchema,
    ProductVariantResponseSchema,
)
from app.schemas.category_schema import (
    CategoryCreateSchema,
    CategoryUpdateSchema,
    CategoryResponseSchema,
)
from app.services.inventory_service import InventoryService
from app.api.decorators import admin_required
from app.core.authorization import require_permission

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


@products_bp.route("/categories/<string:category_id>", methods=["PUT"])
@admin_required
@products_bp.arguments(CategoryUpdateSchema)
@products_bp.response(200, CategoryResponseSchema)
def update_category(category_data, category_id):
    """Update category details (Admin)."""
    category = db.session.query(Category).filter_by(id=category_id).first()
    if not category:
        return jsonify({"message": f"Category '{category_id}' not found"}), 404

    for key, value in category_data.items():
        setattr(category, key, value)

    db.session.commit()
    return category.to_dict(), 200


@products_bp.route("/categories/<string:category_id>", methods=["DELETE"])
@admin_required
def delete_category(category_id):
    """Delete category (Admin)."""
    category = db.session.query(Category).filter_by(id=category_id).first()
    if not category:
        return jsonify({"message": f"Category '{category_id}' not found"}), 404

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": f"Category '{category_id}' deleted successfully"}), 200


# --- Product Endpoints ---

def clear_catalog_cache():
    """Helper to invalidate all cached catalog response keys in Redis."""
    try:
        keys = redis_client.keys("catalog:products:*")
        if keys:
            redis_client.delete(*keys)
    except Exception as e:
        logger.warning(f"Failed to clear Redis catalog cache: {e}")


@products_bp.route("", methods=["GET"])
@products_bp.arguments(ProductQuerySchema, location="query")
@products_bp.response(200, ProductResponseSchema(many=True))
def list_products(query_args):
    """Retrieve active products with search, category filtering, sorting, and pagination (Redis Cache-Aside)."""
    search = query_args.get("search", "")
    category_id = query_args.get("category_id", "")
    sort_by = query_args.get("sort_by", "created_at")
    page = query_args.get("page", 1)
    per_page = query_args.get("per_page", 20)

    cache_key = f"catalog:products:{search}:{category_id}:{sort_by}:{page}:{per_page}"

    # 1. Fast Path: Check Redis Cache (In-Memory ~1-2ms)
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200
    except Exception as e:
        logger.warning(f"Redis catalog read error, falling back to PostgreSQL: {e}")

    try:
        from app.services.order_service import OrderService
        OrderService.check_and_cancel_expired_orders()
    except Exception as exp_err:
        logger.warning(f"Expired order auto-cancellation warning on product list: {exp_err}")

    # 2. Slow Path: Query PostgreSQL DB (On Cache Miss)
    query = db.session.query(Product).filter(Product.is_active == True)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_pattern)) | (Product.description.ilike(search_pattern)) | (Product.sku.ilike(search_pattern))
        )

    if category_id:
        category = db.session.query(Category).filter_by(id=category_id).first()
        if not category:
            category = db.session.query(Category).filter(
                (Category.slug == category_id) | (Category.name.ilike(category_id))
            ).first()
        if category:
            query = query.filter(Product.category_id == category.id)
        else:
            query = query.filter(Product.category_id == category_id)

    if sort_by == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price.desc())
    else:
        query = query.order_by(Product.created_at.desc())

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

    catalog_payload = {
        "items": result,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page,
    }

    # 3. Store in Redis for 10 seconds (Short TTL prevents stale stock data)
    try:
        redis_client.set(cache_key, json.dumps(catalog_payload), ex=10)
    except Exception as e:
        logger.warning(f"Failed to cache catalog payload in Redis: {e}")

    return jsonify(catalog_payload), 200


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
@require_permission("enterprise:products:write")
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

    variants_data = product_data.pop("variants", [])
    vendor_id = product_data.get("vendor_id")
    if vendor_id:
        vendor = db.session.query(User).filter_by(id=vendor_id, role="vendor").first()
        if not vendor:
            return jsonify({"message": f"Vendor '{vendor_id}' not found"}), 404

    product = Product(
        name=product_data["name"],
        sku=product_data["sku"],
        category_id=product_data.get("category_id"),
        vendor_id=vendor_id,
        description=product_data.get("description"),
        images=product_data.get("images", []),
        total_stock=product_data["total_stock"],
        available_stock=product_data["total_stock"],
        price=product_data["price"],
        is_active=True,
    )
    db.session.add(product)
    db.session.flush()

    for var_data in variants_data:
        variant = ProductVariant(
            product_id=product.id,
            sku=var_data["sku"],
            name=var_data["name"],
            size=var_data.get("size"),
            color=var_data.get("color"),
            price=var_data["price"],
            total_stock=var_data.get("total_stock", 0),
            available_stock=var_data.get("available_stock", 0),
        )
        db.session.add(variant)

    db.session.commit()

    try:
        InventoryService.warmup_product_stock(product.id)
    except Exception as e:
        logger.warning(f"Redis stock warmup skipped for new product {product.id}: {e}")

    return product.to_dict(), 201


@products_bp.route("/<string:product_id>", methods=["PUT"])
@require_permission("enterprise:products:write")
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

    variants_data = product_data.pop("variants", None)
    vendor_id = product_data.pop("vendor_id", None)

    if vendor_id:
        vendor = db.session.query(User).filter_by(id=vendor_id, role="vendor").first()
        if not vendor:
            return jsonify({"message": f"Vendor '{vendor_id}' not found"}), 404

    for field, val in product_data.items():
        if field == "vendor_id":
            continue
        setattr(product, field, val)

    if vendor_id is not None:
        product.vendor_id = vendor_id

    if variants_data is not None:
        db.session.query(ProductVariant).filter_by(product_id=product.id).delete()
        for var_data in variants_data:
            variant = ProductVariant(
                product_id=product.id,
                sku=var_data["sku"],
                name=var_data["name"],
                size=var_data.get("size"),
                color=var_data.get("color"),
                price=var_data["price"],
                total_stock=var_data.get("total_stock", 0),
                available_stock=var_data.get("available_stock", 0),
            )
            db.session.add(variant)

    db.session.commit()
    try:
        InventoryService.warmup_product_stock(product.id)
    except Exception as e:
        logger.warning(f"Redis stock update skipped: {e}")

    return product.to_dict(), 200


@products_bp.route("/<string:product_id>", methods=["DELETE"])
@require_permission("enterprise:products:write")
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


# --- Variant Endpoints ---

@products_bp.route("/<string:product_id>/variants", methods=["GET"])
@products_bp.response(200, ProductVariantResponseSchema(many=True))
def list_product_variants(product_id):
    """List variants for a specific product."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"message": f"Product '{product_id}' not found"}), 404
    return [v.to_dict() for v in product.variants], 200


@products_bp.route("/<string:product_id>/variants", methods=["POST"])
@require_permission("enterprise:products:write")
@products_bp.arguments(ProductVariantCreateSchema)
@products_bp.response(201, ProductVariantResponseSchema)
def create_product_variant(variant_data, product_id):
    """Create a new product variant (Admin)."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"message": f"Product '{product_id}' not found"}), 404

    existing = db.session.query(ProductVariant).filter_by(sku=variant_data["sku"]).first()
    if existing:
        return jsonify({"message": f"Variant SKU '{variant_data['sku']}' already exists"}), 409

    variant = ProductVariant(
        product_id=product_id,
        sku=variant_data["sku"],
        name=variant_data["name"],
        size=variant_data.get("size"),
        color=variant_data.get("color"),
        price=variant_data["price"],
        total_stock=variant_data.get("total_stock", 0),
        available_stock=variant_data.get("available_stock", 0),
    )
    db.session.add(variant)
    db.session.commit()
    return variant.to_dict(), 201


@products_bp.route("/<string:product_id>/variants/<string:variant_id>", methods=["PUT"])
@require_permission("enterprise:products:write")
@products_bp.arguments(ProductVariantUpdateSchema)
@products_bp.response(200, ProductVariantResponseSchema)
def update_product_variant(variant_data, product_id, variant_id):
    """Update a product variant (Admin)."""
    variant = db.session.query(ProductVariant).filter_by(id=variant_id, product_id=product_id).first()
    if not variant:
        return jsonify({"message": f"Variant '{variant_id}' not found"}), 404

    for key, value in variant_data.items():
        setattr(variant, key, value)

    db.session.commit()
    return variant.to_dict(), 200


@products_bp.route("/<string:product_id>/variants/<string:variant_id>", methods=["DELETE"])
@require_permission("enterprise:products:write")
def delete_product_variant(product_id, variant_id):
    """Delete a product variant (Admin)."""
    variant = db.session.query(ProductVariant).filter_by(id=variant_id, product_id=product_id).first()
    if not variant:
        return jsonify({"message": f"Variant '{variant_id}' not found"}), 404

    db.session.delete(variant)
    db.session.commit()
    return jsonify({"message": f"Variant '{variant_id}' deleted successfully"}), 200


@products_bp.route("/<string:product_id>/sync-stock", methods=["POST"])
@require_permission("enterprise:products:write")
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
# Temporary load-test endpoint (No @jwt_required)
@products_bp.route('/test-load', methods=['GET'])
def test_load():
    cache_key = "catalog:products:test_load"
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200
    except Exception as e:
        logger.warning(f"Redis lookup error on test-load: {e}")

    products = Product.query.limit(10).all()
    payload = [{"id": p.id, "stock": p.available_stock} for p in products]

    try:
        redis_client.set(cache_key, json.dumps(payload), ex=10)
    except Exception as e:
        logger.warning(f"Failed to cache test-load payload: {e}")

    return jsonify(payload), 200