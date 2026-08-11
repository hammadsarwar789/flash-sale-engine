import logging
from datetime import datetime, timezone
from app.core.extensions import db
from app.models.product import Product
from app.models.product_variant import ProductVariant
from app.integrations.shopify.client import ShopifyClient
from app.integrations.shopify.mapper import ShopifyMapper
from app.integrations.shopify.auth import ShopifyAuthManager
from app.integrations.shopify.exceptions import ShopifyApiError

logger = logging.getLogger(__name__)


class ShopifySyncService:
    """Outbound synchronization engine handling product, variant, and inventory level synchronization."""

    @staticmethod
    def sync_product(product_id: str) -> bool:
        """Sync a local product to Shopify (Create or Update)."""
        product = db.session.get(Product, product_id)
        if not product:
            logger.error(f"Cannot sync product {product_id}: not found in database.")
            return False

        client = ShopifyClient()
        payload = ShopifyMapper.product_to_shopify_payload(product)

        try:
            if product.shopify_product_id:
                # Update existing Shopify product
                logger.info(f"Updating Shopify product {product.shopify_product_id} for local ID {product.id}...")
                resp = client.update_product(product.shopify_product_id, payload)
            else:
                # Create new Shopify product
                logger.info(f"Creating new Shopify product for local ID {product.id}...")
                resp = client.create_product(payload)

            shopify_id = str(resp.get("id", ""))
            product.shopify_product_id = f"gid://shopify/Product/{shopify_id}" if shopify_id else product.shopify_product_id
            product.sync_status = "SYNCED"
            product.is_listed_on_shopify = True
            product.last_synced_at = datetime.now(timezone.utc)
            product.last_sync_error = None

            # Map created Shopify variants and inventory item IDs
            variants_resp = resp.get("variants") or []
            if len(variants_resp) > 0:
                first_v = variants_resp[0]
                product.shopify_variant_id = str(first_v.get("id", ""))
                product.shopify_inventory_item_id = str(first_v.get("inventory_item_id", ""))
                product.shopify_location_id = ShopifyAuthManager.get_location_id()

                # Sync variant matrix IDs if present
                if product.variants and len(product.variants) > 0:
                    for idx, local_v in enumerate(product.variants):
                        if idx < len(variants_resp):
                            sh_v = variants_resp[idx]
                            local_v.shopify_variant_id = str(sh_v.get("id", ""))
                            local_v.shopify_inventory_item_id = str(sh_v.get("inventory_item_id", ""))

            db.session.commit()
            logger.info(f"Successfully synced product {product.id} to Shopify (ID: {product.shopify_product_id}).")
            return True

        except ShopifyApiError as err:
            db.session.rollback()
            prod_err = db.session.get(Product, product_id)
            if prod_err:
                prod_err.sync_status = "FAILED"
                prod_err.last_sync_error = err.message
                db.session.commit()
            logger.error(f"Failed to sync product {product_id} to Shopify: {err.message}")
            raise

    @staticmethod
    def delete_product(shopify_product_id: str) -> bool:
        """Delete product on Shopify."""
        if not shopify_product_id:
            return True
        client = ShopifyClient()
        return client.delete_product(shopify_product_id)

    @staticmethod
    def sync_inventory(product_id: str, available_stock: int) -> bool:
        """Update inventory level on Shopify for a given product."""
        product = db.session.get(Product, product_id)
        if not product or not product.shopify_inventory_item_id:
            logger.warning(f"Cannot sync inventory for product {product_id}: missing shopify_inventory_item_id.")
            return False

        client = ShopifyClient()
        location_id = product.shopify_location_id or ShopifyAuthManager.get_location_id()

        try:
            client.set_inventory_level(
                inventory_item_id=product.shopify_inventory_item_id,
                location_id=location_id,
                available_qty=available_stock
            )
            product.last_synced_at = datetime.now(timezone.utc)
            db.session.commit()
            logger.info(f"Synced Shopify inventory for product {product_id} to {available_stock}.")
            return True
        except ShopifyApiError as err:
            logger.error(f"Failed to sync inventory to Shopify for product {product_id}: {err.message}")
            raise
