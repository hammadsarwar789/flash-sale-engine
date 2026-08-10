import json
import time
import logging
import urllib.request
import urllib.error
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

    def _request(self, method: str, path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute HTTPS request to Shopify Admin API."""
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.access_token,
            "User-Agent": "FlashSaleEngine-ShopifySync/1.0",
        }

        payload_bytes = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=payload_bytes, headers=headers, method=method.upper())

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status_code = resp.getcode()
                body = resp.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as err:
            status_code = err.code
            body = err.read().decode("utf-8") if err.fp else ""
            err_data = {}
            try:
                err_data = json.loads(body) if body else {}
            except Exception:
                err_data = {"raw": body}

            if status_code == 429:
                retry_after = int(err.headers.get("Retry-After", 5))
                logger.warning(f"Shopify rate limit hit (429). Retrying after {retry_after}s...")
                raise ShopifyRateLimitError(retry_after=retry_after)

            msg = err_data.get("errors") or err_data.get("message") or f"HTTP {status_code}"
            if isinstance(msg, dict):
                msg = json.dumps(msg)
            logger.error(f"Shopify API Error [{status_code}] on {method} {url}: {msg}")
            raise ShopifyApiError(status_code=status_code, message=str(msg), payload=err_data)
        except Exception as ex:
            logger.error(f"Network error calling Shopify API [{method} {url}]: {ex}")
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
