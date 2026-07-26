import uuid
from datetime import datetime, timedelta, timezone
from app.models.order import Order, OrderStatus
from app.core.extensions import db


def test_stripe_webhook_succeeded(client, test_user, test_product):
    """Test Stripe payment_intent.succeeded webhook marks order as PAID."""
    with client.application.app_context():
        order = Order(
            user_id=test_user.id,
            product_id=test_product.id,
            quantity=1,
            unit_price=test_product.price,
            subtotal=test_product.price,
            total_amount=test_product.price,
            idempotency_key=f"webhook-test-key-{str(uuid.uuid4())}",
            status=OrderStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db.session.add(order)
        db.session.commit()
        order_id = order.id

    webhook_payload = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123456",
                "metadata": {"order_id": order_id},
            }
        },
    }

    res = client.post("/api/v1/webhooks/stripe", json=webhook_payload)
    assert res.status_code == 200
    assert res.get_json()["status"] == "processed"

    with client.application.app_context():
        updated_order = db.session.query(Order).filter_by(id=order_id).first()
        assert updated_order.status == OrderStatus.PAID


def test_stripe_webhook_failed(client, test_user, test_product):
    """Test Stripe payment_intent.payment_failed webhook cancels order."""
    with client.application.app_context():
        order = Order(
            user_id=test_user.id,
            product_id=test_product.id,
            quantity=1,
            unit_price=test_product.price,
            subtotal=test_product.price,
            total_amount=test_product.price,
            idempotency_key=f"webhook-fail-key-{str(uuid.uuid4())}",
            status=OrderStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db.session.add(order)
        db.session.commit()
        order_id = order.id

    webhook_payload = {
        "type": "payment_intent.payment_failed",
        "data": {
            "object": {
                "id": "pi_test_789012",
                "metadata": {"order_id": order_id},
            }
        },
    }

    res = client.post("/api/v1/webhooks/stripe", json=webhook_payload)
    assert res.status_code == 200
    assert res.get_json()["status"] == "cancelled"

    with client.application.app_context():
        updated_order = db.session.query(Order).filter_by(id=order_id).first()
        assert updated_order.status == OrderStatus.CANCELLED


def test_guest_checkout_workflow(client, test_product):
    """Test non-authenticated guest checkout endpoint."""
    headers = {
        "Idempotency-Key": f"guest-chk-{str(uuid.uuid4())}",
    }

    payload = {
        "email": "guest.buyer@example.com",
        "items": [
            {"product_id": test_product.id, "quantity": 1}
        ]
    }

    res = client.post("/api/v1/orders/guest-checkout", json=payload, headers=headers)
    assert res.status_code == 202
    data = res.get_json()
    assert "order" in data
    assert data["order"]["status"] == "PENDING"


def test_create_payment_intent(client, user_token, test_user, test_product):
    """Test creating Stripe payment intent for pending order."""
    with client.application.app_context():
        order = Order(
            user_id=test_user.id,
            product_id=test_product.id,
            quantity=1,
            unit_price=test_product.price,
            subtotal=test_product.price,
            total_amount=test_product.price,
            idempotency_key=f"pi-intent-key-{str(uuid.uuid4())}",
            status=OrderStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db.session.add(order)
        db.session.commit()
        order_id = order.id

    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"order_id": order_id, "currency": "usd"}

    res = client.post("/api/v1/orders/payments/intent", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert "payment_intent_id" in data
    assert "client_secret" in data
    assert data["amount"] == float(test_product.price)


def test_variant_cart_checkout_and_admin_refund(client, user_token, admin_token, test_product):
    """Test variant purchasing, per-variant stock deduction, dynamic tax calculation, and admin refund."""
    from app.models.product_variant import ProductVariant
    headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create two distinct variants for test_product
    with client.application.app_context():
        v1 = ProductVariant(product_id=test_product.id, sku=f"VAR-{test_product.sku}-RED-L", name="Red Large", size="L", color="Red", price=50.00, total_stock=10, available_stock=10)
        v2 = ProductVariant(product_id=test_product.id, sku=f"VAR-{test_product.sku}-RED-S", name="Red Small", size="S", color="Red", price=45.00, total_stock=5, available_stock=5)
        db.session.add_all([v1, v2])
        db.session.commit()
        v1_id, v2_id = v1.id, v2.id

    # 2. Add Red Large variant to cart
    res = client.post("/api/v1/cart/items", json={"product_id": test_product.id, "variant_id": v1_id, "quantity": 2}, headers=headers)
    assert res.status_code == 201
    assert res.get_json()["variant_id"] == v1_id

    # 3. Checkout Cart
    checkout_headers = {"Authorization": f"Bearer {user_token}", "Idempotency-Key": f"var-chk-{str(uuid.uuid4())}"}
    res = client.post("/api/v1/orders/checkout", headers=checkout_headers)
    assert res.status_code == 202
    order_data = res.get_json()["order"]
    order_id = order_data["id"]

    # Verify subtotal (50 * 2 = 100), tax (100 * 0.08 = 8.00), total (108.00)
    assert order_data["subtotal"] == 100.00
    assert order_data["tax"] == 8.00
    assert order_data["total_amount"] == 108.00
    assert order_data["items"][0]["variant_id"] == v1_id

    # Verify Red Large stock decremented (10 -> 8) while Red Small remains 5
    with client.application.app_context():
        v1_db = db.session.query(ProductVariant).filter_by(id=v1_id).first()
        v2_db = db.session.query(ProductVariant).filter_by(id=v2_id).first()
        assert v1_db.available_stock == 8
        assert v2_db.available_stock == 5

    # 4. Admin updates status to REFUNDED -> triggers Stripe refund integration
    res = client.patch(f"/api/v1/admin/orders/{order_id}", json={"status": "REFUNDED"}, headers=admin_headers)
    assert res.status_code == 200
    res_data = res.get_json()
    assert res_data["order"]["status"] == "REFUNDED"
    assert "refund" in res_data
    assert res_data["refund"]["amount"] == 108.00
