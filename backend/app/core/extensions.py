from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_smorest import Api
import redis
from celery import Celery

# SQLAlchemy ORM instance
db: SQLAlchemy = SQLAlchemy()

# Database migration engine
migrate: Migrate = Migrate()

# OpenAPI / REST Documentation Engine (Flask-Smorest)
smorest_api: Api = Api()

# Global Redis client placeholder
redis_client: redis.Redis = redis.Redis()


def init_redis(app) -> redis.Redis:
    """Initialize Redis connection instance with app configuration."""
    global redis_client
    redis_client = redis.Redis(
        host=app.config["REDIS_HOST"],
        port=app.config["REDIS_PORT"],
        db=app.config["REDIS_DB"],
        decode_responses=True,
        protocol=2,  # Force RESP2 for compatibility with legacy Windows Redis builds
    )
    return redis_client


def make_celery(app=None) -> Celery:
    """Create and configure Celery instance bound to Flask context."""
    celery_app = Celery(
        app.import_name if app else "flash_sale_engine",
        broker=app.config["CELERY_BROKER_URL"] if app else "amqp://guest:guest@localhost:5672//",
        backend=app.config["CELERY_RESULT_BACKEND"] if app else "redis://localhost:6379/1",
    )

    if app:
        celery_app.conf.update(app.config)

        class ContextTask(celery_app.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)

        celery_app.Task = ContextTask

    return celery_app


celery_app: Celery = Celery("flash_sale_engine")
