import uuid
import pytest
from app.models.product import Product
from app.core.extensions import db


@pytest.fixture
def second_product(app):
    """Fixture providing a second product for multi-item cart testing."""
    with app.app_context():
        product = Product(
            name="Test Accessory",
            sku=f"SKU-{uuid.uuid4().hex[:8]}",
            price=25.00,
            available_stock=50,
            total_stock=50,
            is_active=True,
        )
        db.session.add(product)
        db.session.commit()
        yield product
        db.session.delete(product)
        db.session.commit()


def test_cart_full_workflow(client, user_token, test_product, second_product):
    """Test add item, list cart, update quantity, and delete item in cart."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Add first product to cart
    res1 = client.post(
        "/api/v1/cart/items",
        json={"product_id": test_product.id, "quantity": 2},
        headers=headers,
    )
    assert res1.status_code == 201
    item1 = res1.get_json()
    assert item1["product_id"] == test_product.id
    assert item1["quantity"] == 2

    # 2. Add second product to cart
    res2 = client.post(
        "/api/v1/cart/items",
        json={"product_id": second_product.id, "quantity": 1},
        headers=headers,
    )
    assert res2.status_code == 201
    item2 = res2.get_json()
    assert item2["product_id"] == second_product.id

    # 3. Get cart summary
    res_get = client.get("/api/v1/cart", headers=headers)
    assert res_get.status_code == 200
    cart_data = res_get.get_json()
    assert len(cart_data["items"]) == 2
    assert cart_data["item_count"] == 3
    # test_product price is 999.99 * 2 = 1999.98, second_product is 25.00 * 1 = 25.00 -> total = 2024.98
    assert cart_data["subtotal"] == round(999.99 * 2 + 25.00, 2)

    # 4. Update quantity of item2
    res_patch = client.patch(
        f"/api/v1/cart/items/{item2['id']}",
        json={"quantity": 3},
        headers=headers,
    )
    assert res_patch.status_code == 200
    assert res_patch.get_json()["quantity"] == 3

    # 5. Delete item1
    res_del = client.delete(f"/api/v1/cart/items/{item1['id']}", headers=headers)
    assert res_del.status_code == 200

    # 6. Verify cart has only item2 remaining
    res_final = client.get("/api/v1/cart", headers=headers)
    final_cart = res_final.get_json()
    assert len(final_cart["items"]) == 1
    assert final_cart["items"][0]["id"] == item2["id"]


def test_cart_checkout_multi_item(client, user_token, test_product, second_product):
    """Test checking out cart items into a multi-item order."""
    headers = {
        "Authorization": f"Bearer {user_token}",
        "Idempotency-Key": f"checkout-key-{str(uuid.uuid4())}",
    }

    # Add items to cart first
    client.post(
        "/api/v1/cart/items",
        json={"product_id": test_product.id, "quantity": 1},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    client.post(
        "/api/v1/cart/items",
        json={"product_id": second_product.id, "quantity": 2},
        headers={"Authorization": f"Bearer {user_token}"},
    )

    # Checkout cart
    res_checkout = client.post("/api/v1/orders/checkout", headers=headers)
    assert res_checkout.status_code == 202
    checkout_data = res_checkout.get_json()
    order = checkout_data["order"]

    assert order["status"] == "PENDING"
    assert len(order["items"]) == 2
    assert order["subtotal"] == round(999.99 * 1 + 25.00 * 2, 2)

    # Verify cart is cleared after checkout
    res_cart = client.get("/api/v1/cart", headers={"Authorization": f"Bearer {user_token}"})
    assert len(res_cart.get_json()["items"]) == 0
