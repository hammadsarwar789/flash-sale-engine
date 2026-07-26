import logging
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
        conn = psycopg.connect("postgresql://postgres:Pakistan12@localhost:5432/postgres", autocommit=True)
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = 'flash_sale_db'")
            exists = cur.fetchone()
            if not exists:
                logger.info("Database 'flash_sale_db' does not exist. Creating database...")
                cur.execute("CREATE DATABASE flash_sale_db")
                logger.info("Database 'flash_sale_db' created successfully.")
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

        # 3. Create Sample Flash Sale Products
        sample_products = [
            {
                "name": "Apple iPhone 15 Pro Max 256GB",
                "sku": "IPHONE-15-PRO-MAX",
                "total_stock": 50,
                "available_stock": 50,
                "price": 1199.99,
            },
            {
                "name": "Sony PlayStation 5 Pro Console",
                "sku": "PS5-PRO-CONSOLE",
                "total_stock": 25,
                "available_stock": 25,
                "price": 699.99,
            },
            {
                "name": "Apple MacBook Pro 16-inch M3 Max",
                "sku": "MACBOOK-PRO-M3-MAX",
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
