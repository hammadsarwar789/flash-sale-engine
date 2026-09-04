import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class BaseConfig:
    """Base configuration settings."""

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "default-dev-secret-key-must-be-at-least-32-chars-long-12345",
    )
    DEBUG: bool = False
    TESTING: bool = False

    # Database URI (Defaults to SQLite for instant local execution)
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///" + str(BASE_DIR / "flash_sale.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # SQLAlchemy Connection Pool Configuration
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 30,          # Keeps 30 persistent connections ready
        "max_overflow": 50,       # Allows spikes up to 80 simultaneous connections
        "pool_timeout": 10,       # Fail fast if pool is exhausted
        "pool_recycle": 1800,     # Recycle connections every 30 minutes to prevent stales
        "pool_pre_ping": True,    # Verify connection health before executing queries
    }

    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PROTOCOL: int = int(os.getenv("REDIS_PROTOCOL", "2"))  # Pin RESP2 protocol for legacy compatibility
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")



    # RabbitMQ & Celery Configuration
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//")
    broker_url: str = os.getenv("CELERY_BROKER_URL", RABBITMQ_URL)
    result_backend: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY",
        os.getenv("SECRET_KEY", "default-jwt-secret-key-must-be-at-least-32-chars-long-12345"),
    )
    JWT_ACCESS_TOKEN_EXPIRES_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "60")
    )

    # Initial Admin Seed Credentials
    ADMIN_INITIAL_EMAIL: str = os.getenv("ADMIN_INITIAL_EMAIL", "admin@flashsale.com")
    ADMIN_INITIAL_PASSWORD: str = os.getenv("ADMIN_INITIAL_PASSWORD", "Password123")
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")

    # OpenAPI / Flask-Smorest Documentation Settings
    API_TITLE: str = "Distributed Flash Sale API"
    API_VERSION: str = "v1"
    OPENAPI_VERSION: str = "3.0.3"
    OPENAPI_URL_PREFIX: str = "/"
    OPENAPI_SWAGGER_UI_PATH: str = "/docs"
    OPENAPI_SWAGGER_UI_URL: str = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    DEBUG: bool = True


class ProductionConfig(BaseConfig):
    """Production environment configuration with strict secret validation."""

    DEBUG: bool = False

    @classmethod
    def validate_production_secrets(cls):
        """Enforce that required production secrets are configured and not using default values."""
        insecure_defaults = {
            "default-dev-secret-key-12345",
            "super-secret-key-change-me",
            "change-me",
            "secret",
        }
        secret_key = os.getenv("SECRET_KEY", "")
        if not secret_key or secret_key.strip() in insecure_defaults or len(secret_key) < 16:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY is missing, empty, or using an insecure default in production. "
                "Generate a cryptographically secure 32-byte secret using `python -c 'import secrets; print(secrets.token_hex(32))'` "
                "and set it in the environment."
            )

        jwt_key = os.getenv("JWT_SECRET_KEY", secret_key)
        if not jwt_key or jwt_key.strip() in insecure_defaults:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET_KEY is using an insecure default in production."
            )

        admin_email = os.getenv("ADMIN_INITIAL_EMAIL", "")
        admin_pass = os.getenv("ADMIN_INITIAL_PASSWORD", "")
        insecure_passwords = {"Password123", "AdminPass123!", "admin", "password", "12345678"}

        if not admin_email or not admin_pass:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: Both ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD "
                "must be explicitly set in the environment when FLASK_ENV=production."
            )

        if admin_pass in insecure_passwords or len(admin_pass) < 8:
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: ADMIN_INITIAL_PASSWORD cannot be a weak or default password in production."
            )


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    TESTING: bool = True
    SECRET_KEY: str = "test-secret-key-must-be-at-least-32-chars-long!"
    JWT_SECRET_KEY: str = "test-jwt-secret-key-at-least-32-bytes-long!"
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    REDIS_DB: int = 15


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
