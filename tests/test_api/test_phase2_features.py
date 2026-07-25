import uuid
import pytest
from app.models.order import Order, OrderStatus
from app.core.extensions import db


def test_payment_stub_in_development(client, user_token, test_user, test_product):
    """Test payment intent endpoint creates PaymentIntent object."""
    from datetime import datetime, timedelta, timezone
    with client.application.app_context():
        order = Order(
            user_id=test_user.id,
            product_id=test_product.id,
            quantity=1,
            unit_price=test_product.price,
            subtotal=test_product.price,
            total_amount=test_product.price,
            idempotency_key=f"pi-stub-key-{str(uuid.uuid4())}",
            status=OrderStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
        db.session.add(order)
        db.session.commit()
        order_id = order.id

    headers = {"Authorization": f"Bearer {user_token}"}
    
    res = client.post("/api/v1/orders/payments/intent", json={"order_id": order_id}, headers=headers)
    assert res.status_code == 201
    data = res.get_json()
    assert "payment_intent_id" in data
    assert "client_secret" in data


def test_category_and_product_filtering(client, admin_token, user_token):
    """Test category creation and filtering products by search/category."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Create Category
    res_cat = client.post(
        "/api/v1/products/categories",
        json={"name": "Electronics", "description": "Gadgets and tech"},
        headers=admin_headers,
    )
    assert res_cat.status_code == 201
    cat_id = res_cat.get_json()["id"]

    # 2. Create product in category
    res_prod = client.post(
        "/api/v1/products",
        json={
            "name": "Wireless Headphones",
            "sku": "HEADPHONE-001",
            "price": 149.99,
            "total_stock": 20,
            "category_id": cat_id,
            "description": "Noise-cancelling wireless headphones",
        },
        headers=admin_headers,
    )
    assert res_prod.status_code == 201
    prod_id = res_prod.get_json()["id"]

    # 3. Filter products by search query
    res_search = client.get("/api/v1/products?search=Noise-cancelling", headers=user_headers)
    assert res_search.status_code == 200
    search_results = res_search.get_json()
    assert len(search_results) == 1
    assert search_results[0]["id"] == prod_id

    # 4. Filter products by category_id
    res_filter = client.get(f"/api/v1/products?category_id={cat_id}", headers=user_headers)
    assert res_filter.status_code == 200
    assert len(res_filter.get_json()) == 1


def test_auth_completeness_workflow(client, test_user, user_token):
    """Test auth refresh, logout, forgot password, reset password, and email verification."""
    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. Refresh token
    res_ref = client.post("/api/v1/auth/refresh", headers=headers)
    assert res_ref.status_code == 200
    assert "access_token" in res_ref.get_json()

    # 2. Logout
    res_out = client.post("/api/v1/auth/logout", headers=headers)
    assert res_out.status_code == 200

    # 3. Forgot password
    res_forgot = client.post("/api/v1/auth/forgot-password", json={"email": test_user.email})
    assert res_forgot.status_code == 200
    reset_token = res_forgot.get_json().get("reset_token")

    # 4. Reset password
    res_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"reset_token": reset_token, "new_password": "NewSecretPass123!"},
    )
    assert res_reset.status_code == 200

    # 5. Email verification
    res_verify = client.post("/api/v1/auth/verify-email", json={"user_id": test_user.id})
    assert res_verify.status_code == 200
    assert res_verify.get_json()["user"]["is_email_verified"] is True


def test_admin_order_management(client, admin_token, test_user, test_product):
    """Test admin order listing and order status/fulfillment update."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create dummy order in DB directly for test
    with client.application.app_context():
        order = Order(
            user_id=test_user.id,
            product_id=test_product.id,
            quantity=1,
            unit_price=test_product.price,
            subtotal=test_product.price,
            total_amount=test_product.price,
            idempotency_key=f"admin-test-key-{str(uuid.uuid4())}",
            status=OrderStatus.PAID,
            expires_at=test_product.created_at,
        )
        db.session.add(order)
        db.session.commit()
        order_id = order.id

    # List orders in admin
    res_list = client.get("/api/v1/admin/orders?status=PAID", headers=admin_headers)
    assert res_list.status_code == 200
    orders = res_list.get_json()
    assert any(o["id"] == order_id for o in orders)

    # Patch order status & tracking info
    res_patch = client.patch(
        f"/api/v1/admin/orders/{order_id}",
        json={"status": OrderStatus.SHIPPED, "tracking_number": "TRK123456", "carrier": "FedEx"},
        headers=admin_headers,
    )
    assert res_patch.status_code == 200
    updated_order = res_patch.get_json()["order"]
    assert updated_order["status"] == "SHIPPED"
    assert updated_order["tracking_number"] == "TRK123456"


def test_commerce_features(client, user_token, admin_token, test_product):
    """Test coupons, reviews, wishlist, and shipping addresses."""
    user_headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create and validate coupon
    client.post(
        "/api/v1/coupons",
        json={"code": "SAVE20", "discount_type": "percentage", "discount_value": 20.0},
        headers=admin_headers,
    )
    res_coupon = client.post(
        "/api/v1/coupons/validate",
        json={"code": "SAVE20", "amount": 100.0},
        headers=user_headers,
    )
    assert res_coupon.status_code == 200
    assert res_coupon.get_json()["calculated_discount"] == 20.0

    # 2. Add product review
    res_rev = client.post(
        f"/api/v1/products/{test_product.id}/reviews",
        json={"rating": 5, "title": "Amazing Product", "comment": "Loved it!"},
        headers=user_headers,
    )
    assert res_rev.status_code == 201

    # 3. Add to wishlist
    res_wish = client.post(
        "/api/v1/wishlist/items",
        json={"product_id": test_product.id},
        headers=user_headers,
    )
    assert res_wish.status_code == 201

    # 4. Add shipping address
    res_addr = client.post(
        "/api/v1/shipping-addresses",
        json={
            "recipient_name": "Jane Doe",
            "address_line1": "456 Market St",
            "city": "San Francisco",
            "state": "CA",
            "postal_code": "94105",
        },
        headers=user_headers,
    )
    assert res_addr.status_code == 201
    assert res_addr.get_json()["city"] == "San Francisco"
