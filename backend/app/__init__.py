import os
from flask import Flask, jsonify
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
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))
    app.config["JWT_SECRET_KEY"] = app.config["SECRET_KEY"]

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
