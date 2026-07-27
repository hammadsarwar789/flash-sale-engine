import logging
import os
import psycopg
from app import create_app
from app.core.extensions import db
from app.models.user import User
from app.models.product import Product
from app.core.security import hash_password
from app.services.inventory_service import InventoryService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")


def ensure_postgres_db_exists():
    """Ensure the target PostgreSQL database exists before SQLAlchemy connects."""
    try:
        pg_user = os.getenv("POSTGRES_USER", "postgres")
        pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres")
        pg_host = os.getenv("POSTGRES_HOST", "localhost")
        pg_port = os.getenv("POSTGRES_PORT", "5432")
        pg_db = os.getenv("POSTGRES_DB", "flash_sale_db")
        conn = psycopg.connect(f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/postgres", autocommit=True)
        with conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{pg_db}'")
            exists = cur.fetchone()
            if not exists:
                logger.info(f"Database '{pg_db}' does not exist. Creating database...")
                cur.execute(f"CREATE DATABASE {pg_db}")
                logger.info(f"Database '{pg_db}' created successfully.")
        conn.close()
    except Exception as e:
        logger.warning(f"PostgreSQL database check skipped/handled: {e}")


from app.core.db_init import sync_database_schema


def seed_database():
    """Populate database with sample Flash Sale products and test user/admin accounts."""
    ensure_postgres_db_exists()

    app = create_app()

    with app.app_context():
        logger.info("Synchronizing database schema and tables...")
        sync_database_schema()

        # 1. Create Admin Account
        admin_email = "admin@flashsale.com"
        admin = db.session.query(User).filter_by(email=admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                password_hash=hash_password("AdminPass123!"),
                full_name="System Administrator",
                role="admin",
            )
            db.session.add(admin)
            logger.info(f"Created Admin account: {admin_email} / AdminPass123!")

        # 2. Create Regular User Account
        user_email = "buyer@flashsale.com"
        user = db.session.query(User).filter_by(email=user_email).first()
        if not user:
            user = User(
                email=user_email,
                password_hash=hash_password("BuyerPass123!"),
                full_name="Flash Sale Buyer",
                role="user",
            )
            db.session.add(user)
            logger.info(f"Created User account: {user_email} / BuyerPass123!")

        db.session.commit()

        # 3. Create Sample Categories
        from app.models.category import Category
        categories_data = [
            {"name": "TECH", "slug": "tech", "description": "High-performance tech and devices"},
            {"name": "OUTERWEAR", "slug": "outerwear", "description": "Technical apparel and outerwear"},
            {"name": "FOOTWEAR", "slug": "footwear", "description": "Performance and luxury footwear"},
        ]
        created_categories = {}
        for cat_in in categories_data:
            cat = db.session.query(Category).filter_by(slug=cat_in["slug"]).first()
            if not cat:
                cat = Category(name=cat_in["name"], slug=cat_in["slug"], description=cat_in["description"])
                db.session.add(cat)
                db.session.commit()
                logger.info(f"Created Category: '{cat.name}'")
            created_categories[cat_in["slug"]] = cat.id

        # 4. Create Sample Flash Sale Products
        tech_cat_id = created_categories.get("tech")
        sample_products = [
            {
                "name": "Apple iPhone 15 Pro Max 256GB",
                "sku": "IPHONE-15-PRO-MAX",
                "category_id": tech_cat_id,
                "total_stock": 50,
                "available_stock": 50,
                "price": 1199.99,
            },
            {
                "name": "Sony PlayStation 5 Pro Console",
                "sku": "PS5-PRO-CONSOLE",
                "category_id": tech_cat_id,
                "total_stock": 25,
                "available_stock": 25,
                "price": 699.99,
            },
            {
                "name": "Apple MacBook Pro 16-inch M3 Max",
                "sku": "MACBOOK-PRO-M3-MAX",
                "category_id": tech_cat_id,
                "total_stock": 10,
                "available_stock": 10,
                "price": 3499.99,
            },
        ]

        for p_data in sample_products:
            prod = db.session.query(Product).filter_by(sku=p_data["sku"]).first()
            if not prod:
                prod = Product(
                    name=p_data["name"],
                    sku=p_data["sku"],
                    category_id=p_data.get("category_id"),
                    total_stock=p_data["total_stock"],
                    available_stock=p_data["available_stock"],
                    price=p_data["price"],
                    is_active=True,
                )
                db.session.add(prod)
                db.session.commit()
                logger.info(f"Created Product: '{prod.name}' (ID: {prod.id}, Stock: {prod.available_stock})")

                # Warmup Redis cache if online
                try:
                    InventoryService.warmup_product_stock(prod.id)
                except Exception as e:
                    logger.warning(f"Skipped Redis stock warmup for product {prod.id}: {e}")

        logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    seed_database()
