import logging
from sqlalchemy import text
from app.core.extensions import db

logger = logging.getLogger(__name__)


def sync_database_schema():
    """
    Safely migrates existing PostgreSQL/SQLite database tables by adding missing columns 
    and creating all new tables.
    """
    try:
        engine_name = db.engine.name.lower()
        logger.info(f"Synchronizing database schema for engine '{engine_name}'...")

        with db.engine.begin() as conn:
            if "postgres" in engine_name:
                # 1. Update existing 'users' & 'registration_requests' tables
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(32) NOT NULL DEFAULT 'STAFF';"))
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';"))
                conn.execute(text("ALTER TABLE registration_requests ALTER COLUMN tenant_id DROP NOT NULL;"))

                # 2. Update existing 'products' table
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percentage DOUBLE PRECISION DEFAULT 0.0;"))

                # 3. Update existing 'orders' table
                conn.execute(text("ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;"))
                conn.execute(text("ALTER TABLE orders ALTER COLUMN quantity DROP NOT NULL;"))
                conn.execute(text("ALTER TABLE orders ALTER COLUMN unit_price DROP NOT NULL;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00;"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(128);"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(64);"))
                conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);"))

                # 4. Update 'cart_items' & 'order_items' for variant_id
                conn.execute(text("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id VARCHAR(36);"))

        # Create any new tables
        db.create_all()
        ensure_default_outlets()
        ensure_default_admin()
        ensure_default_products_and_variants()
        logger.info("Database schema synchronized successfully.")

    except Exception as e:
        logger.warning(f"Database schema synchronization warning/fallback: {e}")
        try:
            db.create_all()
            ensure_default_outlets()
            ensure_default_admin()
            ensure_default_products_and_variants()
        except Exception:
            pass


def ensure_default_outlets():
    """Ensure default enterprise tenant and two store branches (Flash Engine FSD & LHR) exist."""
    try:
        from app.models.tenant import Tenant, Outlet
        tenant = db.session.query(Tenant).filter_by(id="ten_default").first()
        if not tenant:
            tenant = Tenant(id="ten_default", name="Central Enterprise Store", domain="central.flashsale.com")
            db.session.add(tenant)
            db.session.commit()

        out_fsd = db.session.query(Outlet).filter_by(id="out_fsd_01").first()
        if not out_fsd:
            out_fsd = Outlet(id="out_fsd_01", tenant_id=tenant.id, code="FSD-01", name="Flash Engine FSD", is_hq=True)
            db.session.add(out_fsd)

        out_lhr = db.session.query(Outlet).filter_by(id="out_lhr_01").first()
        if not out_lhr:
            out_lhr = Outlet(id="out_lhr_01", tenant_id=tenant.id, code="LHR-01", name="Flash Engine LHR", is_hq=False)
            db.session.add(out_lhr)

        db.session.commit()
    except Exception as e:
        logger.warning(f"Default outlets initialization warning: {e}")


def ensure_default_admin():
    """Ensure default enterprise admin account exists with active credentials."""
    try:
        from app.models.user import User
        from app.core.security import hash_password

        admin = db.session.query(User).filter_by(email="admin@flashsale.com").first()
        if not admin:
            admin = User(
                email="admin@flashsale.com",
                password_hash=hash_password("Password123"),
                full_name="System Administrator",
                role="admin",
                user_type="SUPER_ADMIN",
                status="ACTIVE",
                is_active=True,
                is_email_verified=True,
            )
            db.session.add(admin)
            db.session.commit()
        else:
            if admin.role != "admin" or admin.status != "ACTIVE" or not admin.is_active:
                admin.role = "admin"
                admin.user_type = "SUPER_ADMIN"
                admin.status = "ACTIVE"
                admin.is_active = True
                db.session.commit()
    except Exception as e:
        logger.warning(f"Default admin initialization warning: {e}")


def ensure_default_products_and_variants():
    """Ensure sample products and variants (Color & Size) exist for realistic catalog display."""
    try:
        from app.models.product import Product
        from app.models.product_variant import ProductVariant
        
        prod_count = db.session.query(Product).count()
        if prod_count == 0:
            p1 = Product(
                id="prod_demo_01",
                name="Cyberpunk Tactical Headphones",
                sku="SKU-TACTICAL-01",
                description="Studio-grade noise cancelling flash sale headphones with RBG telemetrics.",
                total_stock=100,
                available_stock=100,
                price=199.99,
                discount_percentage=15.0,
                images=[
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80"
                ]
            )
            db.session.add(p1)
            db.session.flush()

            v1 = ProductVariant(product_id=p1.id, sku="SKU-TACTICAL-01-BLK-M", name="Matte Black / Standard", color="Matte Black", size="M", price=199.99, total_stock=50, available_stock=50)
            v2 = ProductVariant(product_id=p1.id, sku="SKU-TACTICAL-01-CYAN-L", name="Cyber Cyan / Large", color="Cyber Cyan", size="L", price=219.99, total_stock=30, available_stock=30)
            v3 = ProductVariant(product_id=p1.id, sku="SKU-TACTICAL-01-RED-S", name="Signal Red / Small", color="Signal Red", size="S", price=189.99, total_stock=20, available_stock=20)
            db.session.add_all([v1, v2, v3])
            db.session.commit()
    except Exception as e:
        logger.warning(f"Default products seed warning: {e}")
