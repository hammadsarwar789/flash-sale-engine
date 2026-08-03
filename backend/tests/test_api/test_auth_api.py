def test_register_user_success(client):
    """Test successful user registration."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "Password123!",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["email"] == "newuser@example.com"
    assert "id" in data


def test_login_user_success(client, test_user):
    """Test successful user authentication login."""
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": test_user.email,
            "password": "Password123!",
        },
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["token_type"] == "Bearer"


def test_refresh_token_success(client, user_token):
    """Test refreshing JWT access token."""
    response = client.post(
        "/api/v1/auth/refresh",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert data["token_type"] == "Bearer"
