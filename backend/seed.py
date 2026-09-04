import logging
import os
import psycopg
from app import create_app
from app.core.extensions import db
from app.models.user import User
from app.models.product import Product
from app.models.product_variant import ProductVariant
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
        conn = psycopg.connect(
            f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/postgres",
            autocommit=True,
            connect_timeout=3,
        )
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

        # 1. Create or Verify Admin Account
        is_production = os.getenv("FLASK_ENV") == "production"
        admin_email = os.getenv("ADMIN_INITIAL_EMAIL") or app.config.get("ADMIN_INITIAL_EMAIL")
        admin_pass = os.getenv("ADMIN_INITIAL_PASSWORD") or app.config.get("ADMIN_INITIAL_PASSWORD")

        if is_production and (not admin_email or not admin_pass):
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: Both ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD "
                "must be explicitly defined in the environment when seeding in production."
            )

        admin_email = admin_email or "admin@flashsale.com"
        admin_pass = admin_pass or "Password123"

        admin = db.session.query(User).filter_by(email=admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                password_hash=hash_password(admin_pass),
                full_name="System Administrator",
                role="admin",
                user_type="SUPER_ADMIN",
                status="ACTIVE",
                is_active=True,
                is_email_verified=True,
            )
            db.session.add(admin)
            db.session.commit()
            logger.info(f"Initialized Admin account: {admin_email}")
        else:
            logger.info(f"Admin account already exists: {admin_email} (safe re-seeding guard)")

        # 2. Create Regular Test User Account (Non-production only)
        if not is_production:
            user_email = os.getenv("TEST_USER_EMAIL", "buyer@flashsale.com")
            user_pass = os.getenv("TEST_USER_PASSWORD", "BuyerPass123!")
            user = db.session.query(User).filter_by(email=user_email).first()
            if not user:
                user = User(
                    email=user_email,
                    password_hash=hash_password(user_pass),
                    full_name="Flash Sale Buyer",
                    role="user",
                    status="ACTIVE",
                    is_active=True,
                    is_email_verified=True,
                )
                db.session.add(user)
                db.session.commit()
                logger.info(f"Initialized Test User account: {user_email}")
            else:
                logger.info(f"Test User account already exists: {user_email}")
        else:
            logger.info("Production mode: skipping dummy test buyer user creation.")

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

                sample_variants = [
                    ("Black", "S", 0),
                    ("Silver", "M", 5),
                    ("Gold", "L", 10),
                ]
                for color, size, price_offset in sample_variants:
                    variant_sku = f"{prod.sku}-{color[:3].upper()}-{size}"
                    if not db.session.query(ProductVariant).filter_by(sku=variant_sku).first():
                        db.session.add(
                            ProductVariant(
                                product_id=prod.id,
                                sku=variant_sku,
                                name=f"{color} / Size {size}",
                                color=color,
                                size=size,
                                price=float(p_data["price"]) + price_offset,
                                total_stock=max(5, p_data["total_stock"] // 3),
                                available_stock=max(5, p_data["available_stock"] // 3),
                            )
                        )
                db.session.commit()

        # 5. Create Sample Coupons
        from app.models.coupon import Coupon
        sample_coupons = [
            {"code": "FLASH20", "discount_type": "percentage", "discount_value": 20.0, "min_order_amount": 0.0},
            {"code": "WELCOME10", "discount_type": "percentage", "discount_value": 10.0, "min_order_amount": 0.0},
            {"code": "SUMMER30", "discount_type": "fixed", "discount_value": 30.0, "min_order_amount": 50.0},
        ]
        for c_data in sample_coupons:
            c = db.session.query(Coupon).filter_by(code=c_data["code"]).first()
            if not c:
                c = Coupon(
                    code=c_data["code"],
                    discount_type=c_data["discount_type"],
                    discount_value=c_data["discount_value"],
                    min_order_amount=c_data["min_order_amount"],
                    is_active=True,
                )
                db.session.add(c)
                logger.info(f"Created Coupon: '{c.code}' ({c.discount_value} {c.discount_type})")

        # 6. Seed Outlet Inventories for Flash Engine FSD and LHR
        from app.models.outlet_inventory import OutletInventory
        from app.services.multi_outlet_service import MultiOutletService
        MultiOutletService.adjust_stock("out_fsd_01", "SKU-1001", 100)
        MultiOutletService.adjust_stock("out_fsd_01", "IPHONE-15-PRO-MAX", 50)
        MultiOutletService.adjust_stock("out_lhr_01", "SKU-1001", 75)
        MultiOutletService.adjust_stock("out_lhr_01", "IPHONE-15-PRO-MAX", 30)


        db.session.commit()
        logger.info("Database seeding & Multi-Outlet branch initialization completed!")


if __name__ == "__main__":
    seed_database()
