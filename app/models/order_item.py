import uuid
from app.core.extensions import db


class OrderItem(db.Model):
    """Line item model for multi-item orders."""

    __tablename__ = "order_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product")

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="check_order_item_quantity_positive"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "subtotal": float(self.subtotal),
        }
