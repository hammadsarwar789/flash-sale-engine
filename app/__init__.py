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
)


from app.core.db_init import sync_database_schema


def create_app(config_name: str = None) -> Flask:
    """Application Factory for Flask API Application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Sentry error tracking initialization
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            sentry_sdk.init(dsn=sentry_dsn, integrations=[FlaskIntegration()], traces_sample_rate=1.0)
        except Exception:
            pass

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    init_redis(app)
    smorest_api.init_app(app)
    make_celery(app)

    # Automatically synchronize schema and create missing tables
    with app.app_context():
        sync_database_schema()

    # Register API Blueprints via Flask-Smorest
    smorest_api.register_blueprint(auth_bp)
    smorest_api.register_blueprint(products_bp)
    smorest_api.register_blueprint(cart_bp)
    smorest_api.register_blueprint(orders_bp)
    smorest_api.register_blueprint(commerce_bp)
    smorest_api.register_blueprint(webhooks_bp)
    smorest_api.register_blueprint(health_bp)
    smorest_api.register_blueprint(admin_bp)

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
