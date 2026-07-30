from app.api.v1.auth import auth_bp
from app.api.v1.products import products_bp
from app.api.v1.orders import orders_bp
from app.api.v1.cart import cart_bp
from app.api.v1.commerce import commerce_bp
from app.api.v1.webhooks import webhooks_bp
from app.api.v1.health import health_bp
from app.api.v1.admin import admin_bp
from app.api.v1.roles import roles_bp
from app.api.v1.approvals import approvals_bp
from app.api.v1.outlet_inventory import outlet_inventory_bp
from app.api.v1.vendor import vendor_bp
from app.api.v1.logistics import logistics_bp
from app.api.v1.support import support_bp

__all__ = [
    "auth_bp",
    "products_bp",
    "orders_bp",
    "cart_bp",
    "commerce_bp",
    "webhooks_bp",
    "health_bp",
    "admin_bp",
    "roles_bp",
    "approvals_bp",
    "outlet_inventory_bp",
    "vendor_bp",
    "logistics_bp",
    "support_bp",
]
