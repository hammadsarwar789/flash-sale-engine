import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class SubOrder(db.Model):
    """Sub-order model representing vendor-specific fulfillment threads."""

    __tablename__ = "sub_orders"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id"), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default="PENDING", index=True)  # PENDING, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED
    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    commission_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    seller_payout_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    shipment_id = db.Column(db.String(36), nullable=True)

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

    master_order = db.relationship("Order", foreign_keys=[order_id])
    seller = db.relationship("Seller", foreign_keys=[seller_id])
    items = db.relationship("OrderItem", back_populates="sub_order", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "seller_id": self.seller_id,
            "seller_name": self.seller.store_name if self.seller else "Platform Central Outlet",
            "status": self.status,
            "subtotal": float(self.subtotal),
            "commission_amount": float(self.commission_amount),
            "seller_payout_amount": float(self.seller_payout_amount),
            "shipment_id": self.shipment_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [item.to_dict() for item in self.items] if self.items else [],
        }
