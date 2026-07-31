import uuid
import pytest
from app.core.extensions import redis_client


def test_reserve_inventory_missing_idempotency_key(client, user_token, test_product):
    """Test reservation attempt fails if Idempotency-Key header is missing."""
    response = client.post(
        "/api/v1/orders/reserve",
        json={
            "product_id": test_product.id,
            "quantity": 1,
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "Idempotency-Key" in data["detail"]


def test_reserve_inventory_success_and_idempotency_replay(client, user_token, test_product):
    """
    Test successful inventory reservation (202 Accepted)
    and verify that replaying request with identical Idempotency-Key returns cached response.
    """
    try:
        redis_client.ping()
    except Exception:
        pytest.skip("Local Redis server is not running; skipping live Redis idempotency test.")

    # Seed the Redis stock key so the Lua decrement script can find it
    redis_client.set(f"product:{test_product.id}:stock", test_product.available_stock)

    idempotency_key = f"key-{str(uuid.uuid4())}"
    headers = {
        "Authorization": f"Bearer {user_token}",
        "Idempotency-Key": idempotency_key,
    }
    payload = {
        "product_id": test_product.id,
        "quantity": 1,
    }

    # First request -> HTTP 202 Accepted
    response1 = client.post("/api/v1/orders/reserve", json=payload, headers=headers)
    assert response1.status_code == 202
    data1 = response1.get_json()
    assert "order" in data1
    order_id = data1["order"]["id"]

    # Second request with SAME Idempotency-Key -> Replayed response
    response2 = client.post("/api/v1/orders/reserve", json=payload, headers=headers)
    assert response2.status_code in [200, 202]
    assert response2.headers.get("X-Cache-Lookup") == "HIT"
    data2 = response2.get_json()
    assert data2["order"]["id"] == order_id
