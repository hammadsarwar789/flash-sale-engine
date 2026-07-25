import logging
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, List
from app.core.extensions import db
from app.models.product import Product
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.cart import CartItem
from app.models.outbox import OutboxEvent, OutboxStatus
from app.services.inventory_service import InventoryService

logger = logging.getLogger(__name__)


class OrderService:
    """Transactional Order creation and lifecycle management service."""

    @classmethod
    def create_reservation(
        cls,
        user_id: str,
        product_id: str,
        quantity: int,
        idempotency_key: str,
        expiry_minutes: int = 10,
    ) -> Tuple[bool, str, Optional[Order], Optional[OutboxEvent]]:
        """
        Executes Direct Flash Sale Reservation for a single SKU.
        Creates Order and matching OrderItem record.
        """
        product = db.session.query(Product).filter_by(id=product_id, is_active=True).first()
        if not product:
            return False, "Product does not exist or is inactive", None, None

        existing_order = db.session.query(Order).filter_by(idempotency_key=idempotency_key).first()
        if existing_order:
            return True, "Order already created (Idempotent)", existing_order, None

        unit_price = product.price
        total_amount = unit_price * quantity
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

        success, msg, remaining = InventoryService.reserve_stock(product_id, quantity)
        if not success:
            return False, msg, None, None

        try:
            order = Order(
                user_id=user_id,
                product_id=product_id,
                status=OrderStatus.PENDING,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=total_amount,
                total_amount=total_amount,
                idempotency_key=idempotency_key,
                expires_at=expires_at,
            )
            db.session.add(order)
            db.session.flush()

            order_item = OrderItem(
                order_id=order.id,
                product_id=product_id,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=total_amount,
            )
            db.session.add(order_item)

            outbox_payload = {
                "order_id": order.id,
                "user_id": user_id,
                "product_id": product_id,
                "quantity": quantity,
                "total_amount": float(total_amount),
                "items": [order_item.to_dict()],
                "expires_at": expires_at.isoformat(),
            }

            outbox_event = OutboxEvent(
                aggregate_type="ORDER",
                aggregate_id=order.id,
                event_type="order.reserved",
                payload=outbox_payload,
                status=OutboxStatus.PENDING,
            )
            db.session.add(outbox_event)

            product.available_stock = max(0, product.available_stock - quantity)

            db.session.commit()
            logger.info(f"Successfully created single-item order {order.id} and outbox event {outbox_event.id}")
            return True, "Reservation created successfully", order, outbox_event

        except Exception as e:
            db.session.rollback()
            logger.error(f"PostgreSQL Transaction failed for user {user_id}. Compensating Redis: {e}")
            InventoryService.release_stock(product_id, quantity)
            return False, f"Database transaction error: {str(e)}", None, None

    @classmethod
    def create_checkout_order(
        cls,
        user_id: str,
        idempotency_key: str,
        expiry_minutes: int = 10,
    ) -> Tuple[bool, str, Optional[Order], Optional[OutboxEvent]]:
        """
        Executes Multi-Item Cart Checkout:
        1. Validates cart items.
        2. Atomic Multi-Item Redis Lua reservation.
        3. Transactional PostgreSQL write (Order, OrderItems, OutboxEvent, Cart clearing).
        4. Automatic Redis compensation on failure.
        """
        existing_order = db.session.query(Order).filter_by(idempotency_key=idempotency_key).first()
        if existing_order:
            return True, "Order already created (Idempotent)", existing_order, None

        cart_items = db.session.query(CartItem).filter_by(user_id=user_id).all()
        if not cart_items:
            return False, "Cart is empty", None, None

        reservation_items = []
        subtotal = 0.0
        order_line_items_data = []

        for cart_item in cart_items:
            product = db.session.query(Product).filter_by(id=cart_item.product_id, is_active=True).first()
            if not product:
                return False, f"Product ID '{cart_item.product_id}' is no longer active or available", None, None
            
            line_subtotal = float(product.price) * cart_item.quantity
            subtotal += line_subtotal
            reservation_items.append((cart_item.product_id, cart_item.quantity))
            order_line_items_data.append({
                "product": product,
                "quantity": cart_item.quantity,
                "unit_price": product.price,
                "subtotal": line_subtotal,
            })

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

        # Atomic multi-item Redis reservation
        success, msg = InventoryService.reserve_multi_stock(reservation_items)
        if not success:
            return False, msg, None, None

        try:
            order = Order(
                user_id=user_id,
                status=OrderStatus.PENDING,
                subtotal=subtotal,
                tax=0.00,
                shipping_fee=0.00,
                total_amount=subtotal,
                idempotency_key=idempotency_key,
                expires_at=expires_at,
            )
            db.session.add(order)
            db.session.flush()

            created_items = []
            for item_data in order_line_items_data:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item_data["product"].id,
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    subtotal=item_data["subtotal"],
                )
                db.session.add(order_item)
                created_items.append(order_item)

                # Deduct DB available stock
                prod = item_data["product"]
                prod.available_stock = max(0, prod.available_stock - item_data["quantity"])

            # Clear user cart
            db.session.query(CartItem).filter_by(user_id=user_id).delete()

            outbox_payload = {
                "order_id": order.id,
                "user_id": user_id,
                "total_amount": float(subtotal),
                "items": [item.to_dict() for item in created_items],
                "expires_at": expires_at.isoformat(),
            }

            outbox_event = OutboxEvent(
                aggregate_type="ORDER",
                aggregate_id=order.id,
                event_type="order.reserved",
                payload=outbox_payload,
                status=OutboxStatus.PENDING,
            )
            db.session.add(outbox_event)

            db.session.commit()
            logger.info(f"Successfully checked out order {order.id} with {len(created_items)} items")
            return True, "Order successfully checked out", order, outbox_event

        except Exception as e:
            db.session.rollback()
            logger.error(f"Cart checkout PostgreSQL transaction failed for user {user_id}: {e}")
            InventoryService.release_multi_stock(reservation_items)
            return False, f"Database transaction error: {str(e)}", None, None

    @classmethod
    def create_guest_checkout(
        cls,
        guest_email: str,
        items_data: List[dict],
        idempotency_key: str,
        expiry_minutes: int = 10,
    ) -> Tuple[bool, str, Optional[Order], Optional[OutboxEvent]]:
        """
        Executes Guest Checkout:
        1. Gets or creates guest user.
        2. Atomic Multi-Item Redis Lua reservation.
        3. Transactional PostgreSQL write (Order, OrderItems, OutboxEvent).
        """
        from app.models.user import User
        from app.core.security import hash_password

        guest_user = db.session.query(User).filter_by(email=guest_email).first()
        if not guest_user:
            guest_user = User(
                email=guest_email,
                password_hash=hash_password("GuestPass123!"),
                full_name="Guest User",
                role="guest",
            )
            db.session.add(guest_user)
            db.session.flush()

        existing_order = db.session.query(Order).filter_by(idempotency_key=idempotency_key).first()
        if existing_order:
            return True, "Order already created (Idempotent)", existing_order, None

        if not items_data:
            return False, "No checkout items provided", None, None

        reservation_items = []
        subtotal = 0.0
        order_line_items_data = []

        for item_in in items_data:
            pid = item_in["product_id"]
            qty = int(item_in.get("quantity", 1))
            product = db.session.query(Product).filter_by(id=pid, is_active=True).first()
            if not product:
                return False, f"Product ID '{pid}' is no longer active or available", None, None

            line_subtotal = float(product.price) * qty
            subtotal += line_subtotal
            reservation_items.append((pid, qty))
            order_line_items_data.append({
                "product": product,
                "quantity": qty,
                "unit_price": product.price,
                "subtotal": line_subtotal,
            })

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

        success, msg = InventoryService.reserve_multi_stock(reservation_items)
        if not success:
            return False, msg, None, None

        try:
            order = Order(
                user_id=guest_user.id,
                status=OrderStatus.PENDING,
                subtotal=subtotal,
                tax=0.00,
                shipping_fee=0.00,
                total_amount=subtotal,
                idempotency_key=idempotency_key,
                expires_at=expires_at,
            )
            db.session.add(order)
            db.session.flush()

            created_items = []
            for item_data in order_line_items_data:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item_data["product"].id,
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    subtotal=item_data["subtotal"],
                )
                db.session.add(order_item)
                created_items.append(order_item)

                prod = item_data["product"]
                prod.available_stock = max(0, prod.available_stock - item_data["quantity"])

            outbox_payload = {
                "order_id": order.id,
                "guest_email": guest_email,
                "total_amount": float(subtotal),
                "items": [item.to_dict() for item in created_items],
                "expires_at": expires_at.isoformat(),
            }

            outbox_event = OutboxEvent(
                aggregate_type="ORDER",
                aggregate_id=order.id,
                event_type="order.reserved.guest",
                payload=outbox_payload,
                status=OutboxStatus.PENDING,
            )
            db.session.add(outbox_event)

            db.session.commit()
            logger.info(f"Successfully created guest order {order.id} for {guest_email}")
            return True, "Guest order successfully checked out", order, outbox_event

        except Exception as e:
            db.session.rollback()
            logger.error(f"Guest checkout PostgreSQL transaction failed for {guest_email}: {e}")
            InventoryService.release_multi_stock(reservation_items)
            return False, f"Database transaction error: {str(e)}", None, None

    @classmethod
    def cancel_order(cls, order_id: str, user_id: str = None) -> Tuple[bool, str]:
        """Cancel reservation, update status to CANCELLED, and restore Redis stock for all items."""
        query = db.session.query(Order).filter_by(id=order_id)
        if user_id:
            query = query.filter_by(user_id=user_id)

        order = query.first()
        if not order:
            return False, "Order not found"

        if order.status != OrderStatus.PENDING:
            return False, f"Order cannot be cancelled in state {order.status}"

        try:
            order.status = OrderStatus.CANCELLED
            release_items = []

            if order.items:
                for item in order.items:
                    product = db.session.query(Product).filter_by(id=item.product_id).first()
                    if product:
                        product.available_stock += item.quantity
                    release_items.append((item.product_id, item.quantity))
            elif order.product_id and order.quantity:
                product = db.session.query(Product).filter_by(id=order.product_id).first()
                if product:
                    product.available_stock += order.quantity
                release_items.append((order.product_id, order.quantity))

            db.session.commit()

            # Restore Redis stock pool
            InventoryService.release_multi_stock(release_items)
            logger.info(f"Order {order_id} cancelled and stock restored for {len(release_items)} items.")
            return True, "Order cancelled and stock restored"

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to cancel order {order_id}: {e}")
            return False, str(e)

    @classmethod
    def pay_order(cls, order_id: str, user_id: str = None) -> Tuple[bool, str]:
        """Mark order as PAID and decrement total stock in DB for all items."""
        query = db.session.query(Order).filter_by(id=order_id)
        if user_id:
            query = query.filter_by(user_id=user_id)

        order = query.first()
        if not order:
            return False, "Order not found"

        if order.status != OrderStatus.PENDING:
            return False, f"Order cannot be paid in state {order.status}"

        if datetime.now(timezone.utc) > order.expires_at.replace(tzinfo=timezone.utc):
            cls.cancel_order(order_id)
            return False, "Reservation has expired and was cancelled"

        try:
            order.status = OrderStatus.PAID
            if order.items:
                for item in order.items:
                    product = db.session.query(Product).filter_by(id=item.product_id).first()
                    if product:
                        product.total_stock = max(0, product.total_stock - item.quantity)
            elif order.product_id and order.quantity:
                product = db.session.query(Product).filter_by(id=order.product_id).first()
                if product:
                    product.total_stock = max(0, product.total_stock - order.quantity)

            db.session.commit()
            logger.info(f"Order {order_id} successfully paid.")
            return True, "Payment completed successfully"

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to process payment for order {order_id}: {e}")
            return False, str(e)

