import uuid
from app.core.extensions import db


class OrderItem(db.Model):
    """Line item model for multi-item orders."""

    __tablename__ = "order_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    sub_order_id = db.Column(db.String(36), db.ForeignKey("sub_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    variant_id = db.Column(db.String(36), db.ForeignKey("product_variants.id"), nullable=True, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    order = db.relationship("Order", back_populates="items")
    sub_order = db.relationship("SubOrder", back_populates="items")
    product = db.relationship("Product")
    variant = db.relationship("ProductVariant")

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="check_order_item_quantity_positive"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else f"Product #{self.product_id[:8]}",
            "variant_id": self.variant_id,
            "variant_name": self.variant.name if self.variant else None,
            "variant_sku": self.variant.sku if self.variant else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "subtotal": float(self.subtotal),
        }
