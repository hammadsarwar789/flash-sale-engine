import time
import json
import hmac
import hashlib
import base64
from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import patch, MagicMock
from app.core.extensions import db
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.integrations.shopify.auth import ShopifyAuthManager
from app.integrations.shopify.webhooks import ShopifyWebhookVerifier, ShopifyWebhookVerificationError
from app.integrations.shopify.mapper import ShopifyMapper
from app.integrations.shopify.sync import ShopifySyncService
from app.integrations.shopify.client import ShopifyClient


def test_shopify_hmac_verification_valid_and_invalid():
    """Test HMAC-SHA256 signature verification for Shopify webhooks."""
    secret = "test_webhook_secret_123"
    raw_payload = b'{"id": 871281, "event": "order_created"}'

    # Compute valid signature
    digest = hmac.new(secret.encode("utf-8"), raw_payload, hashlib.sha256).digest()
    valid_hmac = base64.b64encode(digest).decode("utf-8")

    # Verify valid signature passes
    assert ShopifyWebhookVerifier.verify_signature(raw_payload, valid_hmac, secret=secret) is True

    # Verify invalid signature raises error
    with pytest.raises(ShopifyWebhookVerificationError):
        ShopifyWebhookVerifier.verify_signature(raw_payload, "invalid_hmac_signature", secret=secret)


def test_product_to_shopify_mapper(app, test_product):
    """Test mapping local Product model into Shopify REST payload DTO."""
    with app.app_context():
        product = db.session.get(Product, test_product.id) or test_product
        payload = ShopifyMapper.product_to_shopify_payload(product)

        assert payload["title"] == product.name
        assert "variants" in payload
        assert len(payload["variants"]) > 0
        assert payload["variants"][0]["price"] == str(float(product.price))
        assert payload["variants"][0]["inventory_management"] == "shopify"


def test_shopify_order_webhook_creation(client, app, test_product):
    """Test inbound Shopify orders/create webhook processing and inventory deduction."""
    secret = ShopifyAuthManager.get_webhook_secret()
    unique_order_id = int(time.time() * 1000)
    with app.app_context():
        product = db.session.get(Product, test_product.id) or test_product
        initial_stock = product.available_stock
        product.shopify_product_id = "8427812781"
        product.shopify_variant_id = "555"
        db.session.commit()

        webhook_payload = {
            "id": unique_order_id,
            "name": f"#SH-{unique_order_id}",
            "email": "john_shopify@gmail.com",
            "total_price": "199.99",
            "customer": {
                "first_name": "John",
                "last_name": "Shopify",
                "email": "john_shopify@gmail.com"
            },
            "shipping_address": {
                "address1": "100 Shopify Blvd",
                "city": "Austin",
                "province": "TX",
                "zip": "78701",
                "country_code": "US"
            },
            "line_items": [
                {
                    "variant_id": 555,
                    "product_id": 8427812781,
                    "sku": product.sku,
                    "quantity": 2,
                    "price": str(float(product.price)),
                    "name": product.name
                }
            ]
        }

        raw_bytes = json.dumps(webhook_payload).encode("utf-8")
        digest = hmac.new(secret.encode("utf-8"), raw_bytes, hashlib.sha256).digest()
        signature = base64.b64encode(digest).decode("utf-8")

        response = client.post(
            "/api/v1/webhooks/shopify/orders/create",
            data=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Hmac-Sha256": signature
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "success"
        assert "order_id" in data

        # Verify created order attributes
        created_order = db.session.get(Order, data["order_id"])
        assert created_order is not None
        assert created_order.source == "SHOPIFY"
        assert created_order.shopify_order_id == str(unique_order_id)
        assert created_order.status == OrderStatus.PAID

        # Verify stock was deducted by 2 items
        updated_prod = db.session.get(Product, product.id)
        assert updated_prod.available_stock == initial_stock - 2


def test_shopify_order_cancellation_webhook(client, app, test_product):
    """Test inbound Shopify order cancellation webhook restoring stock."""
    secret = ShopifyAuthManager.get_webhook_secret()
    with app.app_context():
        product = db.session.get(Product, test_product.id) or test_product
        initial_stock = product.available_stock

        order = Order(
            user_id="usr_shopify_guest_001",
            product_id=product.id,
            quantity=1,
            unit_price=product.price,
            subtotal=product.price,
            total_amount=product.price,
            idempotency_key="idemp_cancel_test_01",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            status=OrderStatus.PAID,
            source="SHOPIFY",
            shopify_order_id="9910299",
            shopify_order_number="#SH-1002"
        )
        db.session.add(order)
        db.session.commit()

        webhook_payload = {"id": 9910299}
        raw_bytes = json.dumps(webhook_payload).encode("utf-8")
        digest = hmac.new(secret.encode("utf-8"), raw_bytes, hashlib.sha256).digest()
        signature = base64.b64encode(digest).decode("utf-8")

        response = client.post(
            "/api/v1/webhooks/shopify/orders/cancelled",
            data=raw_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Shopify-Hmac-Sha256": signature
            }
        )

        assert response.status_code == 200
        reloaded_order = db.session.get(Order, order.id)
        assert reloaded_order.status == OrderStatus.CANCELLED


def test_outbound_product_sync_service(app, test_product):
    """Test outbound ShopifySyncService sync_product creating a product on Shopify."""
    with app.app_context():
        product = db.session.get(Product, test_product.id) or test_product
        product.shopify_product_id = None
        db.session.commit()

        mock_shopify_response = {
            "id": 8427812781,
            "title": product.name,
            "variants": [
                {
                    "id": 555,
                    "product_id": 8427812781,
                    "inventory_item_id": 999111
                }
            ]
        }

        with patch.object(ShopifyClient, "create_product", return_value=mock_shopify_response):
            success = ShopifySyncService.sync_product(product.id)
            assert success is True

            reloaded_prod = db.session.get(Product, product.id)
            assert reloaded_prod.shopify_product_id == "gid://shopify/Product/8427812781"
            assert reloaded_prod.shopify_variant_id == "555"
            assert reloaded_prod.shopify_inventory_item_id == "999111"
            assert reloaded_prod.sync_status == "SYNCED"
            assert reloaded_prod.last_synced_at is not None
