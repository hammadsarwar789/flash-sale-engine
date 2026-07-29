import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class BaseConfig:
    """Base configuration settings."""

    SECRET_KEY: str = os.getenv("SECRET_KEY", "default-dev-secret-key-12345")
    DEBUG: bool = False
    TESTING: bool = False

    # Database URI (Defaults to SQLite for instant local execution)
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        "sqlite:///" + str(BASE_DIR / "flash_sale.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # Redis Configuration
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # RabbitMQ & Celery Configuration
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", RABBITMQ_URL)
    CELERY_RESULT_BACKEND: str = os.getenv(
        "CELERY_RESULT_BACKEND", "redis://localhost:6379/1"
    )

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "default-dev-secret-key-12345"))
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
    """Production environment configuration."""

    DEBUG: bool = False


class TestingConfig(BaseConfig):
    """Testing environment configuration using file SQLite for test persistence."""

    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///" + str(BASE_DIR / "test_temp.db")
    REDIS_DB: int = 15


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
