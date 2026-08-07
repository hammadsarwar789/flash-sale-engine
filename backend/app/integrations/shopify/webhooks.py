import hmac
import hashlib
import base64
import logging
from app.integrations.shopify.auth import ShopifyAuthManager
from app.integrations.shopify.exceptions import ShopifyWebhookVerificationError

logger = logging.getLogger(__name__)


class ShopifyWebhookVerifier:
    """Verifies HMAC-SHA256 signatures on inbound Shopify webhooks."""

    @staticmethod
    def verify_signature(raw_body: bytes, hmac_header: str, secret: str = None) -> bool:
        """Verify X-Shopify-Hmac-Sha256 base64 digest header."""
        if not hmac_header:
            logger.warning("Missing X-Shopify-Hmac-Sha256 header on incoming webhook.")
            raise ShopifyWebhookVerificationError("Missing X-Shopify-Hmac-Sha256 header.")

        webhook_secret = secret or ShopifyAuthManager.get_webhook_secret()
        digest = hmac.new(
            webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).digest()
        computed_hmac = base64.b64encode(digest).decode("utf-8")

        if not hmac.compare_digest(computed_hmac.strip(), hmac_header.strip()):
            logger.error(f"HMAC mismatch: computed {computed_hmac} != header {hmac_header}")
            raise ShopifyWebhookVerificationError("Invalid HMAC signature.")

        return True
