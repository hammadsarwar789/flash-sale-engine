def test_list_products(client, test_product):
    """Test retrieving active products list."""
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["sku"] == test_product.sku


def test_get_product_detail(client, test_product):
    """Test fetching single product by ID."""
    response = client.get(f"/api/v1/products/{test_product.id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == test_product.id
    assert data["name"] == test_product.name


def test_create_product_admin_success(client, admin_token):
    """Test product creation with admin credentials."""
    response = client.post(
        "/api/v1/products",
        json={
            "name": "PlayStation 5 Pro",
            "sku": "PS5-PRO-FLASH",
            "total_stock": 50,
            "price": 699.99,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["sku"] == "PS5-PRO-FLASH"
    assert data["total_stock"] == 50


def test_create_product_forbidden_for_user(client, user_token):
    """Test product creation fails with 403 Forbidden for non-admin user."""
    response = client.post(
        "/api/v1/products",
        json={
            "name": "Unauthorized Item",
            "sku": "UNAUTH-SKU",
            "total_stock": 10,
            "price": 100.00,
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
