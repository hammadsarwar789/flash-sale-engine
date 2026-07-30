def test_list_products(client, test_product):
    """Test retrieving active products list."""
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.get_json()
    assert "items" in data
    items = data["items"]
    assert isinstance(items, list)
    assert len(items) >= 1
    assert items[0]["sku"] == test_product.sku


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


def test_category_crud_and_variant_crud(client, admin_token, test_product):
    """Test Category PUT/DELETE and Product Variant CRUD endpoints."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Category
    res = client.post("/api/v1/products/categories", json={"name": "Laptops", "description": "High performance laptops"}, headers=headers)
    assert res.status_code == 201
    cat_id = res.get_json()["id"]

    # 2. Update Category
    res = client.put(f"/api/v1/products/categories/{cat_id}", json={"name": "Gaming Laptops"}, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["name"] == "Gaming Laptops"

    # 3. Create Variant for test_product
    res = client.post(
        f"/api/v1/products/{test_product.id}/variants",
        json={"sku": f"VAR-{test_product.sku}-XL", "name": "XL Size", "size": "XL", "price": 1299.99},
        headers=headers,
    )
    assert res.status_code == 201
    var_id = res.get_json()["id"]

    # 4. List Variants
    res = client.get(f"/api/v1/products/{test_product.id}/variants")
    assert res.status_code == 200
    assert len(res.get_json()) >= 1

    # 5. Delete Variant
    res = client.delete(f"/api/v1/products/{test_product.id}/variants/{var_id}", headers=headers)
    assert res.status_code == 200

    # 6. Delete Category
    res = client.delete(f"/api/v1/products/categories/{cat_id}", headers=headers)
    assert res.status_code == 200
