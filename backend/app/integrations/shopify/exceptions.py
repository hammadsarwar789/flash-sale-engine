class ShopifyIntegrationError(Exception):
    """Base exception for Shopify API integration errors."""
    pass


class ShopifyApiError(ShopifyIntegrationError):
    """Raised when Shopify Admin API returns non-2xx status."""
    def __init__(self, status_code: int, message: str, payload: dict = None):
        super().__init__(f"Shopify API Error [{status_code}]: {message}")
        self.status_code = status_code
        self.message = message
        self.payload = payload or {}


class ShopifyWebhookVerificationError(ShopifyIntegrationError):
    """Raised when HMAC-SHA256 signature verification fails."""
    pass


class ShopifyRateLimitError(ShopifyApiError):
    """Raised when Shopify API rate limit (HTTP 429) is exceeded."""
    def __init__(self, retry_after: int = 5):
        super().__init__(429, f"Rate limit exceeded. Retry after {retry_after} seconds.")
        self.retry_after = retry_after
