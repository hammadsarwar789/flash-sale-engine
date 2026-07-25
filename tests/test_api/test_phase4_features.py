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
