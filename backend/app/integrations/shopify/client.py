import json
import time
import logging
import requests
from urllib.parse import urlparse
from typing import Dict, Any, Optional
from app.integrations.shopify.auth import ShopifyAuthManager
from app.integrations.shopify.exceptions import ShopifyApiError, ShopifyRateLimitError

logger = logging.getLogger(__name__)


class ShopifyClient:
    """REST Client for Shopify Admin API with rate limit handling and error parsing."""

    def __init__(self, shop_domain: Optional[str] = None, access_token: Optional[str] = None):
        self.shop_domain = shop_domain or ShopifyAuthManager.get_shop_domain()
        self.access_token = access_token or ShopifyAuthManager.get_access_token()
        self.api_version = ShopifyAuthManager.get_api_version()
        self.base_url = f"https://{self.shop_domain}/admin/api/{self.api_version}"

    def _request(self, method: str, path: str, data: Optional[Dict[str, Any]] = None, _retries: int = 3) -> Dict[str, Any]:
        """Execute HTTPS request to Shopify Admin API with automatic rate-limit retry."""
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        parsed = urlparse(url)
        if parsed.scheme != "https":
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}'. Only HTTPS is permitted.")

        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.access_token,
            "User-Agent": "FlashSaleEngine-ShopifySync/1.0",
        }

        for attempt in range(_retries + 1):
            try:
                resp = requests.request(
                    method=method.upper(),
                    url=url,
                    json=data,
                    headers=headers,
                    timeout=15,
                )

                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 2 * (attempt + 1)))
                    if attempt < _retries:
                        logger.warning(f"Shopify rate limit (429). Retry {attempt + 1}/{_retries} after {retry_after}s...")
                        time.sleep(retry_after)
                        continue
                    raise ShopifyRateLimitError(retry_after=retry_after)

                if resp.status_code >= 400:
                    err_data = {}
                    try:
                        err_data = resp.json() if resp.text else {}
                    except Exception:
                        err_data = {"raw": resp.text}

                    msg = err_data.get("errors") or err_data.get("message") or f"HTTP {resp.status_code}"
                    if isinstance(msg, dict):
                        msg = json.dumps(msg)
                    logger.error(f"Shopify API Error [{resp.status_code}] on {method} {url}: {msg}")
                    raise ShopifyApiError(status_code=resp.status_code, message=str(msg), payload=err_data)

                return resp.json() if resp.text else {}
            except requests.RequestException as ex:
                if attempt < _retries:
                    logger.warning(f"Network error calling Shopify API [{method} {url}]: {ex}. Retrying {attempt + 1}/{_retries}...")
                    time.sleep(2 * (attempt + 1))
                    continue
                logger.error(f"Network error calling Shopify API [{method} {url}]: {ex}")
                raise ShopifyApiError(status_code=500, message=str(ex))
            except (ShopifyApiError, ShopifyRateLimitError):
                raise
            except Exception as ex:
                logger.error(f"Unexpected error calling Shopify API [{method} {url}]: {ex}")
                raise ShopifyApiError(status_code=500, message=str(ex))

    def create_product(self, product_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new product in Shopify via POST /admin/api/2024-01/products.json."""
        res = self._request("POST", "/products.json", {"product": product_payload})
        return res.get("product", {})

    def update_product(self, shopify_product_id: str, product_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing product in Shopify via PUT /admin/api/2024-01/products/{id}.json."""
        clean_id = shopify_product_id.replace("gid://shopify/Product/", "")
        res = self._request("PUT", f"/products/{clean_id}.json", {"product": product_payload})
        return res.get("product", {})

    def delete_product(self, shopify_product_id: str) -> bool:
        """Delete a product in Shopify via DELETE /admin/api/2024-01/products/{id}.json."""
        clean_id = shopify_product_id.replace("gid://shopify/Product/", "")
        try:
            self._request("DELETE", f"/products/{clean_id}.json")
            return True
        except ShopifyApiError as err:
            if err.status_code == 404:
                return True # Already deleted
            raise

    def get_locations(self) -> list:
        """Fetch store location list from Shopify API GET /admin/api/2024-01/locations.json."""
        res = self._request("GET", "/locations.json")
        return res.get("locations", [])

    def set_inventory_level(self, inventory_item_id: str, location_id: str, available_qty: int) -> Dict[str, Any]:
        """Set inventory level in Shopify via POST /admin/api/2024-01/inventory_levels/set.json."""
        clean_item_id = inventory_item_id.replace("gid://shopify/InventoryItem/", "")
        clean_loc_id = location_id.replace("gid://shopify/Location/", "")

        if not clean_loc_id or not clean_loc_id.isdigit():
            locs = self.get_locations()
            if locs:
                clean_loc_id = str(locs[0].get("id", clean_loc_id))

        payload = {
            "location_id": int(clean_loc_id) if clean_loc_id.isdigit() else clean_loc_id,
            "inventory_item_id": int(clean_item_id) if clean_item_id.isdigit() else clean_item_id,
            "available": max(0, available_qty),
        }
        res = self._request("POST", "/inventory_levels/set.json", payload)
        return res.get("inventory_level", {})

    def get_product(self, shopify_product_id: str) -> Dict[str, Any]:
        """Fetch single product details from Shopify."""
        clean_id = shopify_product_id.replace("gid://shopify/Product/", "")
        res = self._request("GET", f"/products/{clean_id}.json")
        return res.get("product", {})
