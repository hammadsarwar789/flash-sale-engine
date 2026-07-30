from collections import defaultdict
import logging
from app.core.extensions import db
from app.models.order import Order
from app.models.sub_order import SubOrder
from app.models.seller import Seller
from app.models.user import User

logger = logging.getLogger(__name__)


def ensure_default_platform_seller() -> Seller:
    """Ensure a central platform seller entity exists as fallback for platform-owned inventory."""
    seller = db.session.query(Seller).filter_by(store_slug="central-platform").first()
    if not seller:
        admin_user = db.session.query(User).filter_by(role="admin").first()
        admin_id = admin_user.id if admin_user else "usr_admin_default"
        seller = Seller(
            id="seller_central_01",
            owner_user_id=admin_id,
            store_name="Central Platform Store",
            store_slug="central-platform",
            status="APPROVED",
            commission_rate=0.00,
        )
        db.session.add(seller)
        db.session.commit()
    return seller


def split_order_by_seller(order_id: str) -> list:
    """
    Splits a paid master Order into independent SubOrders grouped by Seller.
    Calculates subtotal, commission amount, and seller payout amounts atomically.
    """
    order = db.session.query(Order).filter_by(id=order_id).first()
    if not order or not order.items:
        logger.warning(f"Order '{order_id}' not found or has no line items to split.")
        return []

    # Check if order has already been split
    existing_sub_orders = db.session.query(SubOrder).filter_by(order_id=order_id).all()
    if existing_sub_orders:
        logger.info(f"Order '{order_id}' has already been split into {len(existing_sub_orders)} sub-orders.")
        return existing_sub_orders

    default_seller = ensure_default_platform_seller()

    # Group order items by seller_id
    items_by_seller = defaultdict(list)
    for item in order.items:
        seller_id = item.product.seller_id if (item.product and item.product.seller_id) else default_seller.id
        items_by_seller[seller_id].append(item)

    created_sub_orders = []

    for seller_id, items in items_by_seller.items():
        seller = db.session.query(Seller).filter_by(id=seller_id).first() or default_seller
        commission_rate = float(seller.commission_rate) if seller.commission_rate is not None else 10.00

        subtotal = sum(float(i.unit_price) * i.quantity for i in items)
        commission_amount = round(subtotal * (commission_rate / 100.0), 2)
        seller_payout_amount = round(subtotal - commission_amount, 2)

        sub_order = SubOrder(
            order_id=order.id,
            seller_id=seller.id,
            status="PENDING",
            subtotal=subtotal,
            commission_amount=commission_amount,
            seller_payout_amount=seller_payout_amount,
        )
        db.session.add(sub_order)
        db.session.flush()

        for item in items:
            item.sub_order_id = sub_order.id

        created_sub_orders.append(sub_order)

    db.session.commit()
    logger.info(f"Order '{order_id}' successfully split into {len(created_sub_orders)} seller sub-orders.")
    return created_sub_orders
