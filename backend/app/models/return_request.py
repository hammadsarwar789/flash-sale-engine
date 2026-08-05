import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class ReturnRequest(db.Model):
    """Model tracking reverse logistics, return inspection, and replacement exchanges."""

    __tablename__ = "return_requests"
    __table_args__ = (
        db.Index("idx_return_req_status_updated", "status", "updated_at"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=False, index=True)
    sub_order_id = db.Column(db.String(36), db.ForeignKey("sub_orders.id"), nullable=True, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id"), nullable=True, index=True)
    customer_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    exchange_product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=True)
    
    type = db.Column(db.String(20), nullable=False, default="RETURN")  # RETURN, EXCHANGE
    status = db.Column(db.String(32), nullable=False, default="REQUESTED", index=True)  
    # REQUESTED, IN_TRANSIT, ARRIVED_AT_WAREHOUSE, INSPECTION_PASSED, REJECTED_QC, REFUNDED, EXCHANGE_DISPATCHED, CANCELLED_SLA
    
    courier_ticket_id = db.Column(db.String(64), unique=True, nullable=True, index=True)
    reason = db.Column(db.Text, nullable=True)
    inspector_notes = db.Column(db.Text, nullable=True)

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

    order = db.relationship("Order", foreign_keys=[order_id])
    sub_order = db.relationship("SubOrder", foreign_keys=[sub_order_id])
    seller = db.relationship("Seller", foreign_keys=[seller_id])
    customer = db.relationship("User", foreign_keys=[customer_id])
    product = db.relationship("Product", foreign_keys=[product_id])
    exchange_product = db.relationship("Product", foreign_keys=[exchange_product_id])

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "sub_order_id": self.sub_order_id,
            "seller_id": self.seller_id,
            "customer_id": self.customer_id,
            "product_id": self.product_id,
            "exchange_product_id": self.exchange_product_id,
            "type": self.type,
            "status": self.status,
            "courier_ticket_id": self.courier_ticket_id,
            "reason": self.reason,
            "inspector_notes": self.inspector_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
