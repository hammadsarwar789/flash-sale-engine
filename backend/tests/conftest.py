import pytest
from app import create_app
from app.core.extensions import db
from app.models import *
from app.core.security import hash_password, create_access_token


@pytest.fixture
def app():
    """Create testing application context."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        try:
            from app.api.v1.products import clear_catalog_cache
            clear_catalog_cache()
        except Exception:
            pass
        yield app
        db.session.remove()
        db.drop_all()
        try:
            from app.api.v1.products import clear_catalog_cache
            clear_catalog_cache()
        except Exception:
            pass


@pytest.fixture
def client(app):
    """Flask HTTP test client."""
    return app.test_client()


@pytest.fixture
def test_user(app):
    """Create test user record."""
    user = User(
        email="testuser@example.com",
        password_hash=hash_password("Password123!"),
        full_name="Test User",
        role="user",
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def test_admin(app):
    """Create test admin record."""
    admin = User(
        email="admin@example.com",
        password_hash=hash_password("AdminPass123!"),
        full_name="Admin User",
        role="admin",
    )
    db.session.add(admin)
    db.session.commit()
    return admin


@pytest.fixture
def user_token(app, test_user):
    """Generate JWT token for test user."""
    return create_access_token(
        user_id=test_user.id,
        role=test_user.role,
        secret_key=app.config["JWT_SECRET_KEY"],
    )


@pytest.fixture
def admin_token(app, test_admin):
    """Generate JWT token for test admin."""
    return create_access_token(
        user_id=test_admin.id,
        role=test_admin.role,
        secret_key=app.config["JWT_SECRET_KEY"],
    )


@pytest.fixture
def test_product(app):
    """Create test product record with stock of 10."""
    try:
        from app.api.v1.products import clear_catalog_cache
        clear_catalog_cache()
    except Exception:
        pass

    existing = db.session.query(Product).filter_by(sku="IPHONE15-FLASH").first()
    if existing:
        return existing

    product = Product(
        name="Flash Sale iPhone 15",
        sku="IPHONE15-FLASH",
        total_stock=10,
        available_stock=10,
        price=999.99,
        is_active=True,
    )
    db.session.add(product)
    db.session.commit()

    try:
        from app.api.v1.products import clear_catalog_cache
        clear_catalog_cache()
    except Exception:
        pass

    return product
