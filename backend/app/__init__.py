import os
from flask import Flask, jsonify, request
from app.core.config import config_by_name
from app.core.extensions import db, migrate, smorest_api, init_redis, make_celery
from app.api import (
    auth_bp,
    products_bp,
    orders_bp,
    cart_bp,
    commerce_bp,
    webhooks_bp,
    health_bp,
    admin_bp,
    roles_bp,
    approvals_bp,
    outlet_inventory_bp,
    vendor_bp,
    logistics_bp,
    support_bp,
)
from app.customer_support.api.v1.support import support_ticket_bp
from app.api.v1.courier_webhooks import courier_webhook_bp
from app.api.v1.shopify_webhooks import shopify_webhooks_bp
from app.core.db_init import sync_database_schema


def create_app(config_name: str = None) -> Flask:
    """Application Factory for Flask API Application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    config_cls = config_by_name.get(config_name, config_by_name["default"])
    if config_name == "production" and hasattr(config_cls, "validate_production_secrets"):
        config_cls.validate_production_secrets()

    app.config.from_object(config_cls)
    app.config["JWT_SECRET_KEY"] = app.config.get("JWT_SECRET_KEY") or app.config["SECRET_KEY"]

    # Sentry error tracking initialization
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            sentry_sdk.init(dsn=sentry_dsn, integrations=[FlaskIntegration()], traces_sample_rate=1.0)
        except Exception:
            pass

    # CORS cross-origin configuration
    try:
        from flask_cors import CORS
        CORS(
            app,
            resources={r"/*": {"origins": "*"}},
            allow_headers=["Content-Type", "Authorization", "Idempotency-Key", "Accept", "Origin", "X-Requested-With"],
            methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            expose_headers=["Content-Type", "Authorization"],
        )
    except Exception:
        pass

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Idempotency-Key, Accept, Origin, X-Requested-With"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    # Static uploads directory setup and serving
    from flask import send_from_directory
    upload_dir = os.path.join(app.root_path, "static", "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    @app.route("/static/uploads/<path:filename>")
    def serve_uploads(filename):
        return send_from_directory(upload_dir, filename)

    # Image upload endpoints (Option A: separate upload pipeline)
    @app.route("/api/upload/image", methods=["POST", "OPTIONS"])
    @app.route("/api/upload/images", methods=["POST", "OPTIONS"])
    @app.route("/api/v1/upload/image", methods=["POST", "OPTIONS"])
    @app.route("/api/v1/upload/images", methods=["POST", "OPTIONS"])
    def upload_image_direct():
        from app.api.v1.products import upload_product_image
        return upload_product_image()

    # Product update alias routes (for /api/products/:id and /api/admin/products/:id)
    @app.route("/api/products/<string:product_id>", methods=["PUT", "PATCH"])
    @app.route("/api/admin/products/<string:product_id>", methods=["PUT", "PATCH"])
    @app.route("/api/v1/admin/products/<string:product_id>", methods=["PUT", "PATCH"])
    def update_product_direct(product_id):
        from app.api.v1.products import update_product
        return update_product(product_id)

    # Delete product image by ID aliases
    @app.route("/api/admin/products/images/<string:image_id>", methods=["DELETE", "OPTIONS"])
    @app.route("/api/products/images/<string:image_id>", methods=["DELETE", "OPTIONS"])
    @app.route("/api/v1/admin/products/images/<string:image_id>", methods=["DELETE", "OPTIONS"])
    def delete_product_image_direct(image_id):
        from app.api.v1.products import delete_product_image_by_id
        return delete_product_image_by_id(image_id)

    # Commerce aliases (maps /api/v1/coupons, /api/v1/wishlist, /api/v1/shipping-addresses to commerce_bp routes)
    @app.route("/api/v1/coupons", methods=["GET", "POST", "OPTIONS"])
    def coupons_alias():
        from app.api.v1.commerce import list_coupons, create_coupon
        if request.method == "POST":
            return create_coupon()
        return list_coupons()

    @app.route("/api/v1/coupons/validate", methods=["POST", "OPTIONS"])
    def coupon_validate_alias():
        from app.api.v1.commerce import validate_coupon
        return validate_coupon()

    @app.route("/api/v1/wishlist", methods=["GET", "OPTIONS"])
    def wishlist_alias():
        from app.api.v1.commerce import get_wishlist
        return get_wishlist()

    @app.route("/api/v1/wishlist/items", methods=["POST", "OPTIONS"])
    def wishlist_items_alias():
        from app.api.v1.commerce import add_to_wishlist
        return add_to_wishlist()

    @app.route("/api/v1/wishlist/items/<string:item_id>", methods=["DELETE", "OPTIONS"])
    def wishlist_item_delete_alias(item_id):
        from app.api.v1.commerce import remove_from_wishlist
        return remove_from_wishlist(item_id)

    @app.route("/api/v1/shipping-addresses", methods=["GET", "POST", "OPTIONS"])
    def shipping_addresses_alias():
        from app.api.v1.commerce import list_shipping_addresses, create_shipping_address
        if request.method == "POST":
            return create_shipping_address()
        return list_shipping_addresses()

    # Initialize extensions
    from flask_smorest import Api
    db.init_app(app)
    migrate.init_app(app, db)
    init_redis(app)
    smorest_api = Api(app)
    make_celery(app)

    # Automatically synchronize schema and create missing tables (skipped in unit testing)
    if not app.config.get("TESTING"):
        with app.app_context():
            sync_database_schema()

    # Start background outbox poller to drain Shopify inventory sync events
    # Guard against Flask reloader double-start: only the reloaded child process
    # (WERKZEUG_RUN_MAIN == 'true') or non-debug mode should start the poller.
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        try:
            from app.workers.shopify_tasks import start_outbox_poller
            start_outbox_poller(app)
        except Exception as poller_err:
            import logging
            logging.getLogger(__name__).warning(f"Could not start outbox poller: {poller_err}")

    # Register API Blueprints via Flask-Smorest
    smorest_api.register_blueprint(auth_bp)
    smorest_api.register_blueprint(products_bp)
    smorest_api.register_blueprint(cart_bp)
    smorest_api.register_blueprint(orders_bp)
    smorest_api.register_blueprint(commerce_bp)
    smorest_api.register_blueprint(webhooks_bp)
    smorest_api.register_blueprint(health_bp)
    smorest_api.register_blueprint(admin_bp)
    smorest_api.register_blueprint(roles_bp)
    smorest_api.register_blueprint(approvals_bp)
    smorest_api.register_blueprint(outlet_inventory_bp)
    smorest_api.register_blueprint(vendor_bp)
    smorest_api.register_blueprint(logistics_bp)
    smorest_api.register_blueprint(support_bp)
    smorest_api.register_blueprint(support_ticket_bp)
    smorest_api.register_blueprint(shopify_webhooks_bp)
    app.register_blueprint(courier_webhook_bp)

    # Root API Index route
    @app.route("/")
    def index():
        return jsonify(
            {
                "system": "High-Scale E-Commerce & Flash Sale Engine Backend",
                "version": "v1",
                "documentation": "/docs",
                "health_check": "/healthz",
                "readiness_probe": "/api/v1/health/ready",
            }
        ), 200

    # Root health check route
    @app.route("/healthz")
    def healthz():
        return {"status": "healthy", "env": config_name}, 200

    return app
