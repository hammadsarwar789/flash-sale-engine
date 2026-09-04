import json
import logging
import os
import uuid
from flask import jsonify, request, current_app, g
from werkzeug.utils import secure_filename
from flask_smorest import Blueprint
from app.core.extensions import db, redis_client
from app.models.product import Product
from app.models.product_image import ProductImage
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
from app.api.decorators import admin_required, jwt_required
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

CACHE_KEY = "catalog:products:all"


def warm_product_cache():
    """Explicitly warm Redis product cache from DB with a 1-hour TTL to prevent Thundering Herd / Cache Stampede."""
    try:
        products = db.session.query(Product).filter(Product.is_active == True).limit(50).all()
        items_payload = [p.to_dict() for p in products]
        full_catalog = {
            "items": items_payload,
            "total": len(items_payload),
            "page": 1,
            "pages": 1,
            "per_page": 20,
        }
        raw_list_payload = [{"id": str(p.id), "name": p.name, "price": float(p.price), "stock": p.available_stock} for p in products]

        # 1. Warm catalog:products:all key (1-hour TTL) with structured dict
        redis_client.set(CACHE_KEY, json.dumps(full_catalog), ex=3600)
        redis_client.set("catalog:products:raw_list", json.dumps(raw_list_payload), ex=3600)

        # 2. Warm list_products default query key & test_load key
        redis_client.set("catalog:products::::1:20", json.dumps(full_catalog), ex=3600)
        redis_client.set("catalog:products:test_load", json.dumps(raw_list_payload), ex=3600)

        logger.info("Redis Product Cache Warmed Successfully!")
        print("[CACHE WARMUP] Redis Product Cache Warmed Successfully!")
        return True
    except Exception as e:
        logger.warning(f"Failed to warm Redis product cache: {e}")
        return False


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
    """Retrieve active products with search, category filtering, sorting, and pagination (Strict Redis Read / Fast Path)."""
    search = query_args.get("search", "")
    category_id = query_args.get("category_id", "")
    sort_by = query_args.get("sort_by", "created_at")
    page = query_args.get("page", 1)
    per_page = query_args.get("per_page", 20)

    is_default_query = not search and not category_id and sort_by == "created_at" and page == 1 and per_page == 20
    cache_key = f"catalog:products:{search}:{category_id}:{sort_by}:{page}:{per_page}"

    # 1. High-Performance Path: Read directly from Redis Connection Pool
    try:
        cached_data = redis_client.get(cache_key)
        if not cached_data and is_default_query:
            cached_data = redis_client.get(CACHE_KEY)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200
    except Exception as e:
        logger.warning(f"Redis read error: {e}")

    # 2. Slow Fallback: Query PostgreSQL only when Redis key is missing
    logger.info("Cache miss / error: Fetching from PostgreSQL DB...")
    try:
        from app.services.order_service import OrderService
        OrderService.check_and_cancel_expired_orders()
    except Exception as exp_err:
        logger.warning(f"Expired order auto-cancellation warning on product list: {exp_err}")

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

    # Set cache for 1 hour to protect database during load testing
    try:
        redis_client.set(cache_key, json.dumps(catalog_payload), ex=3600)
        if is_default_query:
            redis_client.set(CACHE_KEY, json.dumps(catalog_payload), ex=3600)
    except Exception as e:
        logger.warning(f"Redis write error: {e}")

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


ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_IMAGE_MIMETYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def allowed_image_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def save_uploaded_image(file):
    """Save an uploaded image file securely and return its public URL."""
    if not file or not file.filename:
        return None
    if not allowed_image_file(file.filename):
        return None

    upload_dir = os.path.join(current_app.root_path, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    orig_name = secure_filename(file.filename)
    extension = orig_name.rsplit(".", 1)[1].lower() if "." in orig_name else "jpg"
    unique_filename = f"{uuid.uuid4().hex}.{extension}"
    target_path = os.path.join(upload_dir, unique_filename)

    file.save(target_path)
    logger.info(f"Product image uploaded: {unique_filename}")
    return f"/static/uploads/{unique_filename}"


@products_bp.route("/upload-image", methods=["POST", "OPTIONS"])
@products_bp.route("/upload-images", methods=["POST", "OPTIONS"])
@jwt_required
def upload_product_image():
    """Upload one or more product images (JPEG, PNG, WEBP, GIF) and return static URLs."""
    if request.method == "OPTIONS":
        return "", 200

    uploaded_files = []
    for key in ["images", "files", "image", "file"]:
        file_list = request.files.getlist(key)
        for f in file_list:
            if f and f.filename and f not in uploaded_files:
                uploaded_files.append(f)

    if not uploaded_files:
        return jsonify({
            "detail": "No file uploaded (expected form field 'images', 'image', or 'file')",
            "message": "No file uploaded (expected form field 'images', 'image', or 'file')"
        }), 400

    results = []
    for f in uploaded_files:
        if not allowed_image_file(f.filename):
            return jsonify({
                "detail": f"Unsupported file type for '{f.filename}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
                "message": f"Unsupported file type for '{f.filename}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
            }), 400
        if f.mimetype and f.mimetype.lower() not in ALLOWED_IMAGE_MIMETYPES:
            return jsonify({
                "detail": f"Invalid mimetype '{f.mimetype}' for '{f.filename}'. Expected an image.",
                "message": f"Invalid mimetype '{f.mimetype}' for '{f.filename}'. Expected an image."
            }), 400
        public_url = save_uploaded_image(f)
        if public_url:
            unique_name = public_url.split("/")[-1]
            results.append({"url": public_url, "filename": unique_name})

    if not results:
        return jsonify({
            "detail": "Failed to save uploaded image files.",
            "message": "Failed to save uploaded image files."
        }), 500

    primary_url = results[0]["url"]
    return jsonify({
        "url": primary_url,
        "filename": results[0]["filename"],
        "urls": [r["url"] for r in results],
        "images": results,
        "detail": f"Successfully uploaded {len(results)} image(s)",
        "message": f"Successfully uploaded {len(results)} image(s)",
    }), 201


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

    image_url = product_data.get("primary_image_url") or product_data.get("image_url")
    raw_images = product_data.get("images", [])

    product = Product(
        name=product_data["name"],
        sku=product_data["sku"],
        category_id=product_data.get("category_id"),
        vendor_id=vendor_id,
        description=product_data.get("description"),
        image_url=image_url,
        total_stock=product_data["total_stock"],
        available_stock=product_data["total_stock"],
        price=product_data["price"],
        is_active=True,
    )
    db.session.add(product)
    db.session.flush()

    # Create ProductImage records
    created_img_urls = set()
    order_idx = 0
    if image_url:
        pi = ProductImage(
            product_id=product.id,
            image_url=image_url,
            is_primary=True,
            display_order=order_idx,
        )
        db.session.add(pi)
        created_img_urls.add(image_url)
        order_idx += 1

    for img_item in (raw_images or []):
        url = img_item.get("image_url") if isinstance(img_item, dict) else str(img_item)
        if url and url not in created_img_urls:
            is_prim = bool(img_item.get("is_primary")) if isinstance(img_item, dict) else (order_idx == 0)
            pi = ProductImage(
                product_id=product.id,
                image_url=url,
                is_primary=is_prim,
                display_order=img_item.get("display_order", order_idx) if isinstance(img_item, dict) else order_idx,
            )
            db.session.add(pi)
            created_img_urls.add(url)
            order_idx += 1

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
    clear_catalog_cache()

    try:
        InventoryService.warmup_product_stock(product.id)
    except Exception as e:
        logger.warning(f"Redis stock warmup skipped for new product {product.id}: {e}")

    return product.to_dict(), 201


@products_bp.route("/<string:product_id>", methods=["PUT", "PATCH"])
@jwt_required
def update_product(product_id):
    """Update product details (Admin or assigned Vendor). Supports standard JSON and multipart/form-data."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/not-found",
                    "title": "Not Found",
                    "status": 404,
                    "detail": f"Product with ID '{product_id}' not found.",
                    "message": f"Product with ID '{product_id}' not found.",
                }
            ),
            404,
        )

    # Permission check: admin/manager OR product's owner vendor
    user_id = getattr(g, "current_user_id", None)
    user = db.session.query(User).filter_by(id=user_id).first() if user_id else None
    user_role = user.role if user else ""
    if user_role not in ["admin", "super_admin", "manager"]:
        if product.vendor_id != user_id and product.seller_id != getattr(user, "seller_id", None):
            return jsonify({
                "error": "Forbidden",
                "detail": "You do not have permission to modify this product.",
                "message": "You do not have permission to modify this product."
            }), 403

    # Extract product_data from either JSON or multipart/form-data
    if request.is_json:
        product_data = request.get_json() or {}
    elif request.content_type and "multipart/form-data" in request.content_type:
        product_data = dict(request.form)
        for key in ["price", "discount_percentage"]:
            if key in product_data and product_data[key]:
                try:
                    product_data[key] = float(product_data[key])
                except (ValueError, TypeError):
                    pass
        for key in ["total_stock", "available_stock", "stock"]:
            if key in product_data and product_data[key]:
                try:
                    product_data[key] = int(product_data[key])
                except (ValueError, TypeError):
                    pass
        if "stock" in product_data and "total_stock" not in product_data:
            product_data["total_stock"] = product_data["stock"]
            product_data["available_stock"] = product_data["stock"]

        # If image files were attached (Option B multi-file support)
        attached_files = []
        for key in ["images", "files", "image", "file"]:
            for f in request.files.getlist(key):
                if f and f.filename and f not in attached_files:
                    attached_files.append(f)
        if attached_files:
            uploaded_urls = []
            for f in attached_files:
                saved_url = save_uploaded_image(f)
                if saved_url:
                    uploaded_urls.append(saved_url)
            if uploaded_urls:
                product_data["images"] = uploaded_urls
                if not product_data.get("image_url"):
                    product_data["image_url"] = uploaded_urls[0]
    else:
        product_data = request.get_json(silent=True) or dict(request.form) or {}

    variants_data = product_data.pop("variants", None)
    vendor_id = product_data.pop("vendor_id", None)

    if vendor_id:
        vendor = db.session.query(User).filter_by(id=vendor_id, role="vendor").first()
        if not vendor:
            return jsonify({"detail": f"Vendor '{vendor_id}' not found", "message": f"Vendor '{vendor_id}' not found"}), 404

    new_stock = product_data.get("available_stock")
    stock_delta = None
    if new_stock is not None:
        stock_delta = new_stock - (product.available_stock or 0)
        product_data.pop("available_stock", None)

    for field, val in product_data.items():
        if field in ("vendor_id", "image_url", "primary_image_url", "images"):
            continue
        if hasattr(product, field):
            setattr(product, field, val)

    # Multi-Image Synchronization
    if "images" in product_data or "image_url" in product_data or "primary_image_url" in product_data:
        raw_images = product_data.get("images")
        primary_url = product_data.get("primary_image_url") or product_data.get("image_url")

        # Case 1: Explicit deletion (empty images list or None)
        if raw_images == [] or (raw_images is None and primary_url is None and "images" in product_data):
            db.session.query(ProductImage).filter_by(product_id=product.id).delete()
            product.image_url = None
        elif raw_images is not None or primary_url is not None:
            db.session.query(ProductImage).filter_by(product_id=product.id).delete()
            order_idx = 0
            seen_urls = set()

            # Ensure primary URL is set first if specified
            if primary_url and primary_url not in seen_urls:
                pi = ProductImage(
                    product_id=product.id,
                    image_url=primary_url,
                    is_primary=True,
                    display_order=order_idx,
                )
                db.session.add(pi)
                seen_urls.add(primary_url)
                order_idx += 1

            if raw_images and isinstance(raw_images, list):
                for img_item in raw_images:
                    url = img_item.get("image_url") if isinstance(img_item, dict) else str(img_item)
                    if url and url not in seen_urls:
                        is_prim = bool(img_item.get("is_primary")) if isinstance(img_item, dict) else (order_idx == 0)
                        pi = ProductImage(
                            product_id=product.id,
                            image_url=url,
                            is_primary=is_prim,
                            display_order=img_item.get("display_order", order_idx) if isinstance(img_item, dict) else order_idx,
                        )
                        db.session.add(pi)
                        seen_urls.add(url)
                        order_idx += 1

            product.image_url = primary_url or (list(seen_urls)[0] if seen_urls else None)

    if vendor_id is not None:
        product.vendor_id = vendor_id


    if variants_data is not None and isinstance(variants_data, list):
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
    clear_catalog_cache()

    if stock_delta is not None and stock_delta != 0:
        try:
            from app.services.inventory_sync import adjust_stock
            adjust_stock(
                product_id=product.id,
                delta=stock_delta,
                reason="ADMIN_STOCK_EDIT",
                source="ADMIN",
            )
        except Exception as stock_err:
            logger.warning(f"Admin stock edit sync warning: {stock_err}")

    try:
        InventoryService.warmup_product_stock(product.id)
    except Exception as e:
        logger.warning(f"Redis stock update skipped: {e}")

    return product.to_dict(), 200


@products_bp.route("/<string:product_id>/image", methods=["DELETE", "OPTIONS"])
@jwt_required
def delete_product_image(product_id):
    """Remove image from product (Admin, Manager, or owning Vendor)."""
    if request.method == "OPTIONS":
        return "", 200

    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"detail": f"Product '{product_id}' not found", "message": f"Product '{product_id}' not found"}), 404

    user_id = getattr(g, "current_user_id", None)
    user = db.session.query(User).filter_by(id=user_id).first() if user_id else None
    user_role = user.role if user else ""
    if user_role not in ["admin", "super_admin", "manager"]:
        if product.vendor_id != user_id and product.seller_id != getattr(user, "seller_id", None):
            return jsonify({"detail": "Forbidden", "message": "You do not have permission to delete this product's image."}), 403

    product.image_url = None
    product.images = []
    db.session.commit()
    clear_catalog_cache()
    return jsonify({
        "message": "Product image deleted successfully",
        "detail": "Product image deleted successfully",
        "product": product.to_dict()
    }), 200


@products_bp.route("/images/<string:image_id>", methods=["DELETE", "OPTIONS"])
@products_bp.route("/<string:product_id>/images/<string:image_id>", methods=["DELETE", "OPTIONS"])
@jwt_required
def delete_product_image_by_id(image_id, product_id=None):
    """Delete a specific product image by its ID (Admin, Manager, or owning Vendor)."""
    if request.method == "OPTIONS":
        return "", 200

    img = db.session.query(ProductImage).filter_by(id=image_id).first()
    if not img:
        return jsonify({"detail": f"Product image '{image_id}' not found", "message": f"Product image '{image_id}' not found"}), 404

    product = db.session.query(Product).filter_by(id=img.product_id).first()
    if not product:
        return jsonify({"detail": "Product not found", "message": "Product not found"}), 404

    user_id = getattr(g, "current_user_id", None)
    user = db.session.query(User).filter_by(id=user_id).first() if user_id else None
    user_role = user.role if user else ""
    if user_role not in ["admin", "super_admin", "manager"]:
        if product.vendor_id != user_id and product.seller_id != getattr(user, "seller_id", None):
            return jsonify({"detail": "Forbidden", "message": "You do not have permission to delete this product image."}), 403

    was_primary = img.is_primary
    p_id = product.id
    db.session.delete(img)
    db.session.flush()

    # If the deleted image was primary, designate the next available image as primary
    remaining_images = db.session.query(ProductImage).filter_by(product_id=p_id).order_by(ProductImage.display_order.asc()).all()
    if was_primary and remaining_images:
        remaining_images[0].is_primary = True
        product.image_url = remaining_images[0].image_url
    elif not remaining_images:
        product.image_url = None
    elif remaining_images:
        has_primary = any(i.is_primary for i in remaining_images)
        if not has_primary:
            remaining_images[0].is_primary = True
            product.image_url = remaining_images[0].image_url

    db.session.commit()
    clear_catalog_cache()

    return jsonify({
        "message": "Product image deleted successfully",
        "detail": "Product image deleted successfully",
        "deleted_image_id": image_id,
        "product": product.to_dict(),
    }), 200




@products_bp.route("/<string:product_id>", methods=["DELETE"])
@require_permission("enterprise:products:write")
def delete_product(product_id):
    """Deactivate/Delete product from Flash Sale Engine and remove from Shopify if published."""
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

    if product.shopify_product_id:
        from app.integrations.shopify.sync import ShopifySyncService
        try:
            ShopifySyncService.delete_product(product.shopify_product_id)
        except Exception as err:
            logger.warning(f"Error removing product {product.id} from Shopify on delete: {err}")
        product.shopify_product_id = None

    product.is_active = False
    product.is_listed_on_shopify = False
    product.sync_status = "UNPUBLISHED"
    db.session.commit()
    clear_catalog_cache()
    return jsonify({"message": f"Product '{product_id}' deactivated and unlisted from Shopify"}), 200


@products_bp.route("/<string:product_id>/shopify-listing", methods=["PATCH", "PUT"])
@jwt_required
def toggle_product_shopify_listing(product_id):
    """Toggle selective Shopify publishing (is_listed_on_shopify) for a product."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"message": f"Product '{product_id}' not found"}), 404

    data = request.get_json() or {}
    is_listed = bool(data.get("is_listed_on_shopify", data.get("is_listed", False)))

    product.is_listed_on_shopify = is_listed

    if is_listed:
        # Publish / Sync to Shopify immediately
        product.sync_status = "PENDING"
        db.session.commit()

        from app.integrations.shopify.sync import ShopifySyncService
        try:
            ShopifySyncService.sync_product(product.id)
        except Exception as err:
            logger.error(f"Immediate Shopify sync failed for {product.id}: {err}")
            product.sync_status = "FAILED"
            product.last_sync_error = str(err)
            db.session.commit()
    else:
        # Unlist & Delete from Shopify store
        if product.shopify_product_id:
            from app.integrations.shopify.sync import ShopifySyncService
            try:
                ShopifySyncService.delete_product(product.shopify_product_id)
            except Exception as err:
                logger.warning(f"Shopify delete error for {product.shopify_product_id}: {err}")
            product.shopify_product_id = None
            product.shopify_variant_id = None
            product.shopify_inventory_item_id = None

        product.sync_status = "UNPUBLISHED"
        db.session.commit()

    clear_catalog_cache()
    return jsonify(product.to_dict()), 200


@products_bp.route("/<string:product_id>/shopify", methods=["DELETE"])
@jwt_required
def delete_product_from_shopify(product_id):
    """Explicitly delete a product from Shopify store."""
    product = db.session.query(Product).filter_by(id=product_id).first()
    if not product:
        return jsonify({"message": f"Product '{product_id}' not found"}), 404

    if product.shopify_product_id:
        from app.integrations.shopify.sync import ShopifySyncService
        try:
            ShopifySyncService.delete_product(product.shopify_product_id)
        except Exception as err:
            logger.error(f"Failed to delete product from Shopify: {err}")
            return jsonify({"error": "Shopify Error", "message": str(err)}), 400

    product.shopify_product_id = None
    product.shopify_variant_id = None
    product.shopify_inventory_item_id = None
    product.is_listed_on_shopify = False
    product.sync_status = "UNPUBLISHED"
    db.session.commit()
    clear_catalog_cache()

    return jsonify({"message": "Product deleted from Shopify successfully", "product": product.to_dict()}), 200


@products_bp.route("/shopify/sync-all", methods=["POST"])
@jwt_required
def sync_all_products_to_shopify():
    """Bulk synchronize all active Shopify-linked products & stock levels to Shopify Admin API."""
    from app.integrations.shopify.sync import ShopifySyncService
    products = db.session.query(Product).filter(
        (Product.is_listed_on_shopify == True) | (Product.shopify_product_id.isnot(None))
    ).all()

    synced_count = 0
    errors = []
    for prod in products:
        try:
            ShopifySyncService.sync_product(prod.id)
            if prod.shopify_inventory_item_id:
                ShopifySyncService.sync_inventory(prod.id, prod.available_stock)
            synced_count += 1
        except Exception as err:
            errors.append({"product_id": prod.id, "error": str(err)})

    return jsonify({
        "message": f"Successfully synchronized {synced_count} products to Shopify",
        "total_products": len(products),
        "synced_count": synced_count,
        "errors": errors,
    }), 200



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


@products_bp.route("/<string:product_id>/reviews", methods=["GET", "POST"])
def product_reviews_alias(product_id):
    """Retrieve or submit customer reviews for a product (delegates to commerce)."""
    from app.api.v1.commerce import get_product_reviews, add_product_review
    if request.method == "POST":
        return add_product_review(product_id)
    return get_product_reviews(product_id)


@products_bp.route("/<string:product_id>/review-eligibility", methods=["GET"])
def product_review_eligibility_alias(product_id):
    """Check if authenticated user is eligible to review product (delegates to commerce)."""
    from app.api.v1.commerce import check_review_eligibility
    return check_review_eligibility(product_id)