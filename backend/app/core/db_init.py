import logging
from sqlalchemy import text
from app.core.extensions import db
from app.models.return_request import ReturnRequest

logger = logging.getLogger(__name__)


def sync_database_schema():
    """
    Safely migrates existing PostgreSQL/SQLite database tables by adding missing columns 
    and creating all new tables without blocking application startup.
    """
    try:
        engine_name = db.engine.name.lower()
        logger.info(f"Synchronizing database schema for engine '{engine_name}'...")

        schema_already_updated = False
        try:
            with db.engine.connect() as check_conn:
                check_conn.execute(text("SET statement_timeout = '2000ms';"))
                check_res = check_conn.execute(
                    text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='is_email_verified';")
                ).fetchone()
                if check_res:
                    schema_already_updated = True
        except Exception as check_err:
            logger.debug(f"Schema status check deferred: {check_err}")

        if schema_already_updated:
            logger.info("Database schema already up to date. Executing seeds...")
            _run_initial_seeds()
            return

        if "postgres" in engine_name:
            statements = [
                # 1. Update existing 'users' & 'registration_requests' tables
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(32) NOT NULL DEFAULT 'STAFF';",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE';",
                "ALTER TABLE registration_requests ALTER COLUMN tenant_id DROP NOT NULL;",

                # 2. Update existing 'products' table
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id VARCHAR(36);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(36);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id VARCHAR(36);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(36);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_listed_on_shopify BOOLEAN NOT NULL DEFAULT FALSE;",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_product_id VARCHAR(64);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(64);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_inventory_item_id VARCHAR(64);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_location_id VARCHAR(64);",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) NOT NULL DEFAULT 'UNPUBLISHED';",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE products ADD COLUMN IF NOT EXISTS last_sync_error TEXT;",

                # 3. Update existing 'product_variants' table
                "ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS shopify_variant_id VARCHAR(64);",
                "ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS shopify_inventory_item_id VARCHAR(64);",

                # 4. Update existing 'orders' table
                "ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;",
                "ALTER TABLE orders ALTER COLUMN quantity DROP NOT NULL;",
                "ALTER TABLE orders ALTER COLUMN unit_price DROP NOT NULL;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00;",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id VARCHAR(36);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(128);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(64);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'WEB';",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_id VARCHAR(64);",
                "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_number VARCHAR(32);",

                # 5. Update 'cart_items' & 'order_items' for variant_id and sub_order_id
                "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id VARCHAR(36);",
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id VARCHAR(36);",
                "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sub_order_id VARCHAR(36);",

                # 6. Update 'tickets' & 'ticket_ai' for customer support module
                "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 1;",
                "ALTER TABLE ticket_ai ADD COLUMN IF NOT EXISTS ai_suggested_priority VARCHAR(20);",

                # 7. Ensure high-performance indexes
                "CREATE INDEX IF NOT EXISTS idx_products_available_stock ON products (available_stock);",
                "CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);",
                "CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products (shopify_product_id);",
                "CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);",
                "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);",
                "CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source);",
                "CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders (shopify_order_id);",
                "CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events (status, created_at);",
                "CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items (user_id);",
            ]

            with db.engine.connect() as conn:
                try:
                    conn.execute(text("SET lock_timeout = '2s';"))
                except Exception:
                    pass
                for stmt in statements:
                    try:
                        conn.execute(text(stmt))
                        conn.commit()
                    except Exception as err:
                        conn.rollback()
                        logger.debug(f"[DB SYNC DEFERRED] {stmt[:40]}... ({err})")

        _run_initial_seeds()
        logger.info("Database schema synchronized successfully.")

    except Exception as e:
        logger.warning(f"Database schema synchronization warning/fallback: {e}")
        _run_initial_seeds()


def _run_initial_seeds():
    """Executes database table creation and initial domain seed routines safely."""
    try:
        if "postgres" in db.engine.name.lower():
            try:
                db.session.execute(text("SET statement_timeout = '3000ms';"))
                db.session.execute(text("SET lock_timeout = '2000ms';"))
            except Exception:
                pass
        db.create_all()
        ensure_default_outlets()
        ensure_default_permissions_and_roles()
        ensure_default_admin()
        ensure_default_products_and_variants()
    except Exception as err:
        logger.warning(f"Seed routine fallback warning: {err}")
    finally:
        db.session.remove()


def ensure_default_permissions_and_roles():
    """Ensure standard system permissions and default roles exist in database."""
    try:
        from app.models.rbac import Permission, Role

        system_permissions = [
            ("outlet:stock:read", "inventory", "Read outlet inventory stock levels"),
            ("outlet:stock:write", "inventory", "Adjust and transfer outlet stock"),
            ("outlet:staff:approve", "approvals", "Approve or reject staff onboarding requests"),
            ("enterprise:roles:read", "rbac", "Read dynamic roles and permission matrix"),
            ("enterprise:roles:write", "rbac", "Create and modify dynamic custom roles"),
            ("enterprise:roles:assign", "rbac", "Assign roles to user accounts"),
            ("enterprise:orders:manage", "orders", "Fulfill orders, update status, and process refunds"),
            ("enterprise:products:manage", "catalog", "Create, edit, and delete catalog products"),
            ("enterprise:coupons:manage", "coupons", "Generate and manage promo coupons"),
        ]

        for code, module, desc in system_permissions:
            perm = db.session.query(Permission).filter_by(code=code).first()
            if not perm:
                perm = Permission(code=code, module=module, description=desc)
                db.session.add(perm)

        db.session.commit()

        # Seed default Super Admin and Manager roles if missing
        admin_role = db.session.query(Role).filter_by(tenant_id="ten_default", name="Super Administrator").first()
        if not admin_role:
            all_perms = db.session.query(Permission).all()
            admin_role = Role(tenant_id="ten_default", name="Super Administrator", description="Full enterprise administrative privilege access")
            admin_role.permissions = all_perms
            db.session.add(admin_role)

        mgr_role = db.session.query(Role).filter_by(tenant_id="ten_default", name="Store Manager").first()
        if not mgr_role:
            mgr_perms = db.session.query(Permission).filter(Permission.code.in_([
                "outlet:stock:read", "outlet:stock:write", "outlet:staff:approve", "enterprise:orders:manage"
            ])).all()
            mgr_role = Role(tenant_id="ten_default", name="Store Manager", description="Store branch operational management")
            mgr_role.permissions = mgr_perms
            db.session.add(mgr_role)

        db.session.commit()
    except Exception as e:
        logger.warning(f"Permissions/Roles initialization warning: {e}")


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
        from flask import current_app
        from app.models.user import User
        from app.core.security import hash_password

        admin_email = current_app.config.get("ADMIN_INITIAL_EMAIL", "admin@flashsale.com")
        admin_pass = current_app.config.get("ADMIN_INITIAL_PASSWORD", "Password123")

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
        else:
            admin.password_hash = hash_password(admin_pass)
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
                # id="prod_demo_01",
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

        # Warm Redis product catalog cache safely without blocking startup
        try:
            from app.api.v1.products import warm_product_cache
            warm_product_cache()
            logger.info("Redis cache warmed successfully.")
        except Exception as cache_err:
            logger.warning(f"Redis cache warmup skipped or timed out: {cache_err}")
    except Exception as e:
        logger.warning(f"Default products seed warning: {e}")
