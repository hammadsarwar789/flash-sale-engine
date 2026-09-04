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


def test_upload_product_image_and_create_with_image_url(client, admin_token):
    """Test uploading an image file and creating a product with image_url."""
    import io
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Upload valid image
    fake_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    upload_res = client.post(
        "/api/v1/products/upload-image",
        data={"image": (io.BytesIO(fake_png), "sample_product.png")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.get_json()
    assert "url" in upload_data
    assert upload_data["url"].startswith("/static/uploads/")
    image_url = upload_data["url"]

    # 2. Reject unsupported extension
    bad_upload = client.post(
        "/api/v1/products/upload-image",
        data={"image": (io.BytesIO(b"malicious"), "evil.exe")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert bad_upload.status_code == 400

    # 3. Create product using image_url
    create_res = client.post(
        "/api/v1/products",
        json={
            "name": "Mechanical Gaming Keyboard",
            "sku": "KB-RGB-001",
            "total_stock": 25,
            "price": 129.99,
            "image_url": image_url,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    created_product = create_res.get_json()
    assert created_product["image_url"] == image_url
    assert any((img["image_url"] if isinstance(img, dict) else img) == image_url for img in created_product["images"])
    prod_id = created_product["id"]

    # 4. Update product with new image URL via standard JSON (Option A)
    new_fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x02\x00\x00\x00\x02\x08\x06\x00\x00\x00v\xd7\xaa\x86\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    up_res2 = client.post(
        "/api/upload/image",
        data={"file": (io.BytesIO(new_fake_png), "updated_photo.png")},
        content_type="multipart/form-data",
        headers=headers,
    )
    assert up_res2.status_code == 201
    new_image_url = up_res2.get_json()["url"]

    update_res = client.put(
        f"/api/v1/products/{prod_id}",
        json={
            "name": "Mechanical Gaming Keyboard RGB v2",
            "price": 149.99,
            "total_stock": 30,
            "image_url": new_image_url,
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.get_json()
    assert updated_data["name"] == "Mechanical Gaming Keyboard RGB v2"
    assert updated_data["price"] == 149.99
    assert updated_data["image_url"] == new_image_url
    assert any((img["image_url"] if isinstance(img, dict) else img) == new_image_url for img in updated_data["images"])

    # 5. Update product via multipart form-data with attached image (Option B)
    multipart_res = client.put(
        f"/api/v1/products/{prod_id}",
        data={
            "name": "Mechanical Gaming Keyboard RGB Ultimate",
            "price": "169.99",
            "stock": "35",
            "image": (io.BytesIO(new_fake_png), "ultimate_photo.png"),
        },
        content_type="multipart/form-data",
        headers=headers,
    )
    assert multipart_res.status_code == 200
    mp_data = multipart_res.get_json()
    assert mp_data["name"] == "Mechanical Gaming Keyboard RGB Ultimate"
    assert mp_data["price"] == 169.99
    assert mp_data["total_stock"] == 35
    assert mp_data["image_url"].startswith("/static/uploads/")

    # 6. Multi-image upload and update
    multi_up = client.post(
        "/api/upload/images",
        data={
            "images": [
                (io.BytesIO(fake_png), "gallery_1.png"),
                (io.BytesIO(new_fake_png), "gallery_2.png"),
            ]
        },
        content_type="multipart/form-data",
        headers=headers,
    )
    assert multi_up.status_code == 201
    multi_data = multi_up.get_json()
    assert len(multi_data["images"]) == 2
    assert len(multi_data["urls"]) == 2

    # Set multiple images on product with gallery_2 as primary
    g1_url = multi_data["urls"][0]
    g2_url = multi_data["urls"][1]
    gallery_res = client.put(
        f"/api/v1/products/{prod_id}",
        json={
            "primary_image_url": g2_url,
            "images": [
                {"image_url": g2_url, "is_primary": True, "display_order": 0},
                {"image_url": g1_url, "is_primary": False, "display_order": 1},
            ],
        },
        headers=headers,
    )
    assert gallery_res.status_code == 200
    g_prod = gallery_res.get_json()
    assert g_prod["primary_image_url"] == g2_url
    assert len(g_prod["images"]) == 2
    img_to_delete = g_prod["images"][1]["id"]

    # 7. Delete individual image by ID
    del_single = client.delete(
        f"/api/admin/products/images/{img_to_delete}",
        headers=headers,
    )
    assert del_single.status_code == 200
    assert len(del_single.get_json()["product"]["images"]) == 1

    # 8. Delete all images via update with null/empty images
    del_img_res = client.put(
        f"/api/v1/products/{prod_id}",
        json={
            "image_url": None,
            "images": [],
        },
        headers=headers,
    )
    assert del_img_res.status_code == 200
    del_data = del_img_res.get_json()
    assert del_data["image_url"] is None
    assert del_data["images"] == []


