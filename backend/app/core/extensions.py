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

# Global thread-safe Redis connection pool
redis_pool = redis.ConnectionPool(
    host="localhost",
    port=6379,
    db=0,
    max_connections=200,          # Allows ample sockets for 64 WSGI threads
    socket_timeout=1.0,           # Strict 1s socket timeout
    socket_connect_timeout=1.0,   # Strict 1s connection timeout
    decode_responses=True,        # Automatic string decoding
    protocol=2,                   # Force RESP2 for compatibility with legacy Windows Redis builds
)
redis_client: redis.Redis = redis.Redis(connection_pool=redis_pool)


def init_redis(app) -> redis.Redis:
    """Initialize Redis connection pool instance with app configuration."""
    global redis_pool, redis_client
    redis_pool = redis.ConnectionPool(
        host=app.config.get("REDIS_HOST", "localhost"),
        port=int(app.config.get("REDIS_PORT", 6379)),
        db=int(app.config.get("REDIS_DB", 0)),
        max_connections=200,
        socket_timeout=1.0,
        socket_connect_timeout=1.0,
        decode_responses=True,
        protocol=app.config.get("REDIS_PROTOCOL", 2),
    )
    redis_client = redis.Redis(connection_pool=redis_pool)
    return redis_client


def make_celery(app=None) -> Celery:
    """Create and configure Celery instance bound to Flask context."""
    broker_uri = app.config.get("broker_url") if app else "amqp://guest:guest@localhost:5672//"
    result_uri = app.config.get("result_backend") if app else "redis://localhost:6379/1"
    celery_app = Celery(
        app.import_name if app else "flash_sale_engine",
        broker=broker_uri,
        backend=result_uri,
    )

    if app:
        celery_app.conf.update(app.config)

        # Configure Celery Beat periodic schedules
        from celery.schedules import crontab
        celery_app.conf.beat_schedule = {
            "release-matured-escrow-daily": {
                "task": "app.workers.tasks.release_matured_escrow_task",
                "schedule": crontab(hour=2, minute=0),  # Daily at 02:00 UTC
            },
            "drain-outbox-events": {
                "task": "app.workers.shopify_tasks.process_outbox_events",
                "schedule": 30.0,  # Every 30 seconds
            },
        }

        class ContextTask(celery_app.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)

        celery_app.Task = ContextTask

    return celery_app


celery_app: Celery = Celery("flash_sale_engine")
