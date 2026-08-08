from typing import Dict, Any, List
from app.models.product import Product
from app.models.product_variant import ProductVariant


class ShopifyMapper:
    """Bi-directional DTO mapper between Flash Sale domain models and Shopify REST schemas."""

    @staticmethod
    def product_to_shopify_payload(product: Product) -> Dict[str, Any]:
        """Convert local Product and ProductVariant models into Shopify Product REST JSON."""
        variants_data: List[Dict[str, Any]] = []
        discount_pct = float(getattr(product, 'discount_percentage', 0.0) or 0.0)

        if product.variants and len(product.variants) > 0:
            for v in product.variants:
                regular_price = float(v.price)
                if discount_pct > 0:
                    sale_price = round(regular_price * (1.0 - (discount_pct / 100.0)), 2)
                    final_price = str(sale_price)
                    compare_price = str(regular_price)
                else:
                    final_price = str(regular_price)
                    compare_price = None

                v_dto = {
                    "option1": v.name or v.sku,
                    "sku": v.sku,
                    "price": final_price,
                    "compare_at_price": compare_price,
                    "inventory_management": "shopify",
                    "inventory_quantity": max(0, v.available_stock),
                }
                if v.color:
                    v_dto["option1"] = v.color
                if v.size:
                    v_dto["option2"] = v.size
                if v.shopify_variant_id:
                    clean_vid = v.shopify_variant_id.replace("gid://shopify/ProductVariant/", "")
                    if clean_vid.isdigit():
                        v_dto["id"] = int(clean_vid)
                variants_data.append(v_dto)
        else:
            # Single default variant
            regular_price = float(product.price)
            if discount_pct > 0:
                sale_price = round(regular_price * (1.0 - (discount_pct / 100.0)), 2)
                final_price = str(sale_price)
                compare_price = str(regular_price)
            else:
                final_price = str(regular_price)
                compare_price = None

            variants_data.append({
                "title": "Default Title",
                "sku": product.sku,
                "price": final_price,
                "compare_at_price": compare_price,
                "inventory_management": "shopify",
                "inventory_quantity": max(0, product.available_stock),
            })

        images_data = []
        if product.images and isinstance(product.images, list):
            for img_url in product.images:
                if isinstance(img_url, str) and img_url.startswith("http"):
                    images_data.append({"src": img_url})

        payload = {
            "title": product.name,
            "body_html": product.description or "",
            "vendor": product.seller.store_name if product.seller else "Central Platform Store",
            "product_type": product.category.name if product.category else "General",
            "variants": variants_data,
        }

        if images_data:
            payload["images"] = images_data

        if product.shopify_product_id:
            clean_pid = product.shopify_product_id.replace("gid://shopify/Product/", "")
            if clean_pid.isdigit():
                payload["id"] = int(clean_pid)

        return payload

    @staticmethod
    def shopify_order_to_local_order_dto(shopify_order: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Shopify Order Webhook JSON payload into local OrderService creation format."""
        shopify_order_id = str(shopify_order.get("id", ""))
        order_number = str(shopify_order.get("name") or shopify_order.get("order_number") or f"#{shopify_order_id}")
        customer_info = shopify_order.get("customer") or {}
        customer_email = customer_info.get("email") or shopify_order.get("email") or "guest@shopify.com"
        customer_name = f"{customer_info.get('first_name', '')} {customer_info.get('last_name', '')}".strip() or "Shopify Customer"

        raw_address = shopify_order.get("shipping_address") or shopify_order.get("billing_address") or {}
        shipping_address = {
            "street": raw_address.get("address1") or "1 Shopify Way",
            "city": raw_address.get("city") or "Online City",
            "state": raw_address.get("province") or "ON",
            "postal_code": raw_address.get("zip") or "00000",
            "country": raw_address.get("country_code") or raw_address.get("country") or "US",
        }

        line_items = []
        raw_items = shopify_order.get("line_items") or []
        for item in raw_items:
            line_items.append({
                "shopify_variant_id": str(item.get("variant_id", "")),
                "shopify_product_id": str(item.get("product_id", "")),
                "sku": item.get("sku") or "",
                "quantity": int(item.get("quantity", 1)),
                "unit_price": float(item.get("price", 0.0)),
                "title": item.get("name") or item.get("title") or "Shopify Item",
            })

        total_price = float(shopify_order.get("total_price") or shopify_order.get("subtotal_price") or 0.0)

        return {
            "shopify_order_id": shopify_order_id,
            "shopify_order_number": order_number,
            "customer_email": customer_email,
            "customer_name": customer_name,
            "shipping_address": shipping_address,
            "line_items": line_items,
            "total_amount": total_price,
            "source": "SHOPIFY",
        }
