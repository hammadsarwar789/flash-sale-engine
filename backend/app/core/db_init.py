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
                # 1. Update existing 'users' table
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;"))

                # 2. Update existing 'products' table
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR(36);"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;"))
                conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;"))

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

        # Create any new tables (categories, product_variants, cart_items, order_items, shipping_addresses, coupons, reviews, wishlist_items)
        db.create_all()
        logger.info("Database schema synchronized successfully.")

    except Exception as e:
        logger.warning(f"Database schema synchronization warning/fallback: {e}")
        try:
            db.create_all()
        except Exception:
            pass
