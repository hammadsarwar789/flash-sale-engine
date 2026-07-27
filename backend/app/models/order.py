import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class OrderStatus:
    PENDING = "PENDING"
    PAID = "PAID"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"
    RETURNED = "RETURNED"


class Order(db.Model):
    """Order and inventory reservation record model."""

    __tablename__ = "orders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=True, index=True)
    shipping_address_id = db.Column(db.String(36), db.ForeignKey("shipping_addresses.id"), nullable=True)
    tracking_number = db.Column(db.String(128), nullable=True)
    carrier = db.Column(db.String(64), nullable=True)
    payment_intent_id = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(32), nullable=False, default=OrderStatus.PENDING, index=True)
    quantity = db.Column(db.Integer, nullable=True)
    unit_price = db.Column(db.Numeric(12, 2), nullable=True)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    tax = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    shipping_fee = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    idempotency_key = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User", back_populates="orders")
    product = db.relationship("Product", back_populates="orders")
    shipping_address = db.relationship("ShippingAddress")
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="joined")
    task_logs = db.relationship("TaskLog", back_populates="order", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "shipping_address_id": self.shipping_address_id,
            "tracking_number": self.tracking_number if self.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED) else None,
            "carrier": self.carrier if self.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED) else None,
            "payment_intent_id": self.payment_intent_id,
            "status": self.status,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price) if self.unit_price is not None else None,
            "subtotal": float(self.subtotal) if self.subtotal is not None else 0.0,
            "tax": float(self.tax) if self.tax is not None else 0.0,
            "shipping_fee": float(self.shipping_fee) if self.shipping_fee is not None else 0.0,
            "total_amount": float(self.total_amount),
            "idempotency_key": self.idempotency_key,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.to_dict() for item in self.items] if self.items else [],
        }
