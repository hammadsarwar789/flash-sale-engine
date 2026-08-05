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

        from app.core.extensions import redis_client
        lock_acquired = False
        try:
            lock_acquired = redis_client.set(f"lock:idempotency:{idempotency_key}", "1", nx=True, ex=30)
        except Exception:
            lock_acquired = True

        existing_order = db.session.query(Order).filter_by(idempotency_key=idempotency_key).first()
        if existing_order:
            return True, "Order already created (Idempotent)", existing_order, None

        if not lock_acquired:
            return False, "Concurrent reservation in progress for this idempotency key. Please retry.", None, None

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
        coupon_code: Optional[str] = None,
        shipping_address_id: Optional[str] = None,
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

        if not shipping_address_id:
            from app.models.shipping_address import ShippingAddress
            latest_addr = db.session.query(ShippingAddress).filter_by(user_id=user_id).order_by(ShippingAddress.created_at.desc()).first()
            if latest_addr:
                shipping_address_id = latest_addr.id

        TAX_RATE = 0.08  # 8% Sales Tax Rate
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

            variant = None
            if cart_item.variant_id:
                from app.models.product_variant import ProductVariant
                variant = db.session.query(ProductVariant).filter_by(id=cart_item.variant_id, product_id=product.id).first()
                if not variant:
                    return False, f"Variant ID '{cart_item.variant_id}' is unavailable", None, None

            item_price = float(variant.price) if variant else float(product.price)
            line_subtotal = round(item_price * cart_item.quantity, 2)
            subtotal += line_subtotal

            reservation_items.append((cart_item.product_id, cart_item.variant_id, cart_item.quantity))
            order_line_items_data.append({
                "product": product,
                "variant": variant,
                "quantity": cart_item.quantity,
                "unit_price": item_price,
                "subtotal": line_subtotal,
            })

        discount = 0.00
        if coupon_code:
            from app.models.coupon import Coupon
            coupon = db.session.query(Coupon).filter_by(code=coupon_code.upper(), is_active=True).first()
            if coupon and subtotal >= float(coupon.min_order_amount):
                if coupon.discount_type == "percentage":
                    discount = round(subtotal * (float(coupon.discount_value) / 100.0), 2)
                else:
                    discount = float(coupon.discount_value)

        tax = round(max(0.0, subtotal - discount) * TAX_RATE, 2)
        shipping_fee = 0.00
        total_amount = max(0.00, round(subtotal - discount + tax + shipping_fee, 2))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

        # Atomic multi-item Redis reservation
        success, msg = InventoryService.reserve_multi_stock(reservation_items)
        if not success:
            return False, msg, None, None

        try:
            order = Order(
                user_id=user_id,
                shipping_address_id=shipping_address_id,
                status=OrderStatus.PENDING,
                subtotal=subtotal,
                tax=tax,
                shipping_fee=shipping_fee,
                total_amount=total_amount,
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
                    variant_id=item_data["variant"].id if item_data["variant"] else None,
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    subtotal=item_data["subtotal"],
                )
                db.session.add(order_item)
                created_items.append(order_item)

                # Deduct DB available stock
                if item_data["variant"]:
                    item_data["variant"].available_stock = max(0, item_data["variant"].available_stock - item_data["quantity"])
                else:
                    prod = item_data["product"]
                    prod.available_stock = max(0, prod.available_stock - item_data["quantity"])

            # Clear user cart
            db.session.query(CartItem).filter_by(user_id=user_id).delete()

            outbox_payload = {
                "order_id": order.id,
                "user_id": user_id,
                "subtotal": subtotal,
                "tax": tax,
                "total_amount": total_amount,
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
        coupon_code: Optional[str] = None,
        shipping_address_data: Optional[dict] = None,
        expiry_minutes: int = 10,
    ) -> Tuple[bool, str, Optional[Order], Optional[OutboxEvent]]:
        """
        Executes Guest Checkout with tax calculation & variant support.
        """
        TAX_RATE = 0.08
        import secrets
        from app.models.user import User
        from app.models.product_variant import ProductVariant
        from app.models.shipping_address import ShippingAddress
        from app.core.security import hash_password

        guest_user = db.session.query(User).filter_by(email=guest_email).first()
        if not guest_user:
            guest_user = User(
                email=guest_email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
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

        shipping_address_id = None
        if shipping_address_data and isinstance(shipping_address_data, dict):
            guest_addr = ShippingAddress(
                user_id=guest_user.id,
                recipient_name=shipping_address_data.get("recipient_name", "Guest Customer"),
                address_line1=shipping_address_data.get("address_line1", "Standard Delivery"),
                address_line2=shipping_address_data.get("address_line2"),
                city=shipping_address_data.get("city", "N/A"),
                state=shipping_address_data.get("state", "N/A"),
                postal_code=shipping_address_data.get("postal_code", "00000"),
                country=shipping_address_data.get("country", "US"),
                phone=shipping_address_data.get("phone"),
            )
            db.session.add(guest_addr)
            db.session.flush()
            shipping_address_id = guest_addr.id

        reservation_items = []
        subtotal = 0.0
        order_line_items_data = []

        for item_in in items_data:
            pid = item_in["product_id"]
            vid = item_in.get("variant_id")
            qty = int(item_in.get("quantity", 1))
            product = db.session.query(Product).filter_by(id=pid, is_active=True).first()
            if not product:
                return False, f"Product ID '{pid}' is no longer active or available", None, None

            variant = None
            if vid:
                variant = db.session.query(ProductVariant).filter_by(id=vid, product_id=pid).first()
                if not variant:
                    return False, f"Variant ID '{vid}' is unavailable", None, None

            item_price = float(variant.price) if variant else float(product.price)
            line_subtotal = round(item_price * qty, 2)
            subtotal += line_subtotal

            reservation_items.append((pid, vid, qty))
            order_line_items_data.append({
                "product": product,
                "variant": variant,
                "quantity": qty,
                "unit_price": item_price,
                "subtotal": line_subtotal,
            })

        discount = 0.00
        if coupon_code:
            from app.models.coupon import Coupon
            coupon = db.session.query(Coupon).filter_by(code=coupon_code.upper(), is_active=True).first()
            if coupon and subtotal >= float(coupon.min_order_amount):
                if coupon.discount_type == "percentage":
                    discount = round(subtotal * (float(coupon.discount_value) / 100.0), 2)
                else:
                    discount = float(coupon.discount_value)

        tax = round(max(0.0, subtotal - discount) * TAX_RATE, 2)
        shipping_fee = 0.00
        total_amount = max(0.00, round(subtotal - discount + tax + shipping_fee, 2))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)

        success, msg = InventoryService.reserve_multi_stock(reservation_items)
        if not success:
            return False, msg, None, None

        try:
            order = Order(
                user_id=guest_user.id,
                shipping_address_id=shipping_address_id,
                status=OrderStatus.PENDING,
                subtotal=subtotal,
                tax=tax,
                shipping_fee=shipping_fee,
                total_amount=total_amount,
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
                    variant_id=item_data["variant"].id if item_data["variant"] else None,
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    subtotal=item_data["subtotal"],
                )
                db.session.add(order_item)
                created_items.append(order_item)

                if item_data["variant"]:
                    item_data["variant"].available_stock = max(0, item_data["variant"].available_stock - item_data["quantity"])
                else:
                    prod = item_data["product"]
                    prod.available_stock = max(0, prod.available_stock - item_data["quantity"])

            outbox_payload = {
                "order_id": order.id,
                "guest_email": guest_email,
                "subtotal": subtotal,
                "tax": tax,
                "total_amount": total_amount,
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
        """Cancel reservation, update status to CANCELLED, and restore Redis stock for all items/variants."""
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
                    if item.variant_id:
                        from app.models.product_variant import ProductVariant
                        variant = db.session.query(ProductVariant).filter_by(id=item.variant_id).first()
                        if variant:
                            variant.available_stock += item.quantity
                        release_items.append((item.product_id, item.variant_id, item.quantity))
                    else:
                        product = db.session.query(Product).filter_by(id=item.product_id).first()
                        if product:
                            product.available_stock += item.quantity
                        release_items.append((item.product_id, None, item.quantity))
            elif order.product_id and order.quantity:
                product = db.session.query(Product).filter_by(id=order.product_id).first()
                if product:
                    product.available_stock += order.quantity
                release_items.append((order.product_id, None, order.quantity))

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
    def check_and_cancel_expired_orders(cls, user_id: str = None) -> int:
        """
        Finds all PENDING orders where expires_at <= current_time,
        cancels them, and restores stock back to PostgreSQL and Redis.
        """
        now = datetime.now(timezone.utc)
        query = db.session.query(Order).filter(
            Order.status == OrderStatus.PENDING,
            Order.expires_at <= now,
        )
        if user_id:
            query = query.filter(Order.user_id == user_id)

        expired_orders = query.all()
        cancelled_count = 0

        for order in expired_orders:
            try:
                order.status = OrderStatus.EXPIRED
                release_items = []
                if order.items:
                    for item in order.items:
                        if item.variant_id:
                            from app.models.product_variant import ProductVariant
                            variant = db.session.query(ProductVariant).filter_by(id=item.variant_id).first()
                            if variant:
                                variant.available_stock += item.quantity
                            release_items.append((item.product_id, item.variant_id, item.quantity))
                        else:
                            product = db.session.query(Product).filter_by(id=item.product_id).first()
                            if product:
                                product.available_stock += item.quantity
                            release_items.append((item.product_id, None, item.quantity))
                elif order.product_id and order.quantity:
                    product = db.session.query(Product).filter_by(id=order.product_id).first()
                    if product:
                        product.available_stock += order.quantity
                    release_items.append((order.product_id, None, order.quantity))

                db.session.commit()
                if release_items:
                    InventoryService.release_multi_stock(release_items)
                cancelled_count += 1
                logger.info(f"Auto-cancelled expired PENDING order '{order.id}' and restored stock for {len(release_items)} items.")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error auto-cancelling expired order '{order.id}': {e}")

        return cancelled_count

    @classmethod
    def restore_order_to_cart(cls, order_id: str, user_id: str) -> Tuple[bool, str]:
        """
        Cancels a PENDING order, restores stock to catalog, and re-adds line items back into user's cart.
        """
        order = db.session.query(Order).filter_by(id=order_id, user_id=user_id).first()
        if not order:
            return False, "Order not found"

        if order.status != OrderStatus.PENDING:
            return False, f"Cannot restore order in state {order.status}"

        try:
            # Re-add items to user's cart
            if order.items:
                for item in order.items:
                    existing_cart_item = db.session.query(CartItem).filter_by(
                        user_id=user_id,
                        product_id=item.product_id,
                        variant_id=item.variant_id
                    ).first()
                    if existing_cart_item:
                        existing_cart_item.quantity += item.quantity
                    else:
                        new_cart_item = CartItem(
                            user_id=user_id,
                            product_id=item.product_id,
                            variant_id=item.variant_id,
                            quantity=item.quantity
                        )
                        db.session.add(new_cart_item)
            elif order.product_id and order.quantity:
                new_cart_item = CartItem(
                    user_id=user_id,
                    product_id=order.product_id,
                    quantity=order.quantity
                )
                db.session.add(new_cart_item)

            db.session.commit()

            # Now cancel the order and release stock
            cls.cancel_order(order_id, user_id)
            return True, "Order cancelled and items restored to cart successfully"

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to restore order {order_id} to cart: {e}")
            return False, str(e)

    @classmethod
    def pay_order(cls, order_id: str, user_id: str = None) -> Tuple[bool, str]:
        """Mark order as PAID and decrement total stock in DB for all items/variants."""
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
                    if item.variant_id:
                        from app.models.product_variant import ProductVariant
                        variant = db.session.query(ProductVariant).filter_by(id=item.variant_id).first()
                        if variant:
                            variant.total_stock = max(0, variant.total_stock - item.quantity)
                    else:
                        product = db.session.query(Product).filter_by(id=item.product_id).first()
                        if product:
                            product.total_stock = max(0, product.total_stock - item.quantity)
            elif order.product_id and order.quantity:
                product = db.session.query(Product).filter_by(id=order.product_id).first()
                if product:
                    product.total_stock = max(0, product.total_stock - order.quantity)

            db.session.commit()
            logger.info(f"Order {order_id} successfully paid.")

            # Trigger Order Splitting Engine into Vendor SubOrders
            try:
                from app.services.order_splitter import split_order_by_seller
                split_order_by_seller(order_id)
            except Exception as split_err:
                logger.error(f"Order splitting warning for paid order '{order_id}': {split_err}")

            return True, "Payment completed successfully"

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to process payment for order {order_id}: {e}")
            return False, str(e)

    @classmethod
    def refund_order(cls, order_id: str) -> Tuple[bool, str]:
        """
        Refund order: Updates order status to REFUNDED,
        and restores both available_stock and total_stock in PostgreSQL and Redis.
        """
        order = db.session.query(Order).filter_by(id=order_id).first()
        if not order:
            return False, "Order not found"

        if order.status == OrderStatus.REFUNDED:
            return False, "Order is already refunded"

        try:
            previous_status = order.status
            order.status = OrderStatus.REFUNDED
            release_items = []

            # Restore stock for unfulfilled / pre-shipped orders
            if previous_status in [OrderStatus.PENDING, OrderStatus.PAID]:
                if order.items:
                    for item in order.items:
                        if item.variant_id:
                            from app.models.product_variant import ProductVariant
                            variant = db.session.query(ProductVariant).filter_by(id=item.variant_id).first()
                            if variant:
                                variant.available_stock += item.quantity
                                if previous_status == OrderStatus.PAID:
                                    variant.total_stock += item.quantity
                            release_items.append((item.product_id, item.variant_id, item.quantity))
                        else:
                            product = db.session.query(Product).filter_by(id=item.product_id).first()
                            if product:
                                product.available_stock += item.quantity
                                if previous_status == OrderStatus.PAID:
                                    product.total_stock += item.quantity
                            release_items.append((item.product_id, None, item.quantity))
                elif order.product_id and order.quantity:
                    product = db.session.query(Product).filter_by(id=order.product_id).first()
                    if product:
                        product.available_stock += order.quantity
                        if previous_status == OrderStatus.PAID:
                            product.total_stock += order.quantity
                    release_items.append((order.product_id, None, order.quantity))

            # Reverse related SubOrders and write REFUND ledger entries
            from app.models.sub_order import SubOrder
            from app.models.financials import LedgerEntry

            sub_orders = db.session.query(SubOrder).filter_by(order_id=order.id).all()
            for so in sub_orders:
                so.status = "CANCELLED"

                # Flip existing HELD escrow entries to REVERSED
                holds = db.session.query(LedgerEntry).filter_by(sub_order_id=so.id, status="HELD").all()
                for hold in holds:
                    hold.status = "REVERSED"

                # Append double-entry REFUND reversal ledger record
                refund_entry = LedgerEntry(
                    sub_order_id=so.id,
                    seller_id=so.seller_id,
                    entry_type="REFUND",
                    amount=so.seller_payout_amount,
                    status="REVERSED",
                )
                db.session.add(refund_entry)

            db.session.commit()

            # Restore Redis stock pool
            if release_items:
                InventoryService.release_multi_stock(release_items)

            logger.info(f"Order {order_id} refunded and stock restored for {len(release_items)} items.")
            return True, "Order refunded and inventory restored to stock pool"

        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to refund order {order_id}: {e}")
            return False, str(e)

