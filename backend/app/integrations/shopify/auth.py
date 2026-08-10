import os
import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)


class ShopifyAuthManager:
    """Manages Shopify Admin API credentials and OAuth/HMAC security."""

    @staticmethod
    def get_shop_domain() -> str:
        domain = os.getenv("SHOPIFY_SHOP_DOMAIN", "flash-sale-engine.myshopify.com")
        if not domain.endswith(".myshopify.com") and not domain.startswith("http"):
            domain = f"{domain}.myshopify.com"
        return domain.replace("https://", "").replace("http://", "").strip("/")

    @staticmethod
    def get_access_token() -> str:
        return os.getenv("SHOPIFY_ACCESS_TOKEN", "shpat_test_access_token_secret")

    @staticmethod
    def get_api_version() -> str:
        return os.getenv("SHOPIFY_API_VERSION", "2026-07")

    @staticmethod
    def get_webhook_secret() -> str:
        return os.getenv("SHOPIFY_WEBHOOK_SECRET", os.getenv("SHOPIFY_API_SECRET", "shpss_test_webhook_secret"))

    @staticmethod
    def get_location_id() -> str:
        return os.getenv("SHOPIFY_LOCATION_ID", "80021225539")
