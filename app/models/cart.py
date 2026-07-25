import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class CartItem(db.Model):
    """Shopping cart line item model."""

    __tablename__ = "cart_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)

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

    user = db.relationship("User", back_populates="cart_items")
    product = db.relationship("Product")

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="check_cart_quantity_positive"),
        db.UniqueConstraint("user_id", "product_id", name="uq_user_product_cart"),
    )

    def to_dict(self):
        unit_price = float(self.product.price) if self.product else 0.0
        product_name = self.product.name if self.product else None
        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "product_name": product_name,
            "quantity": self.quantity,
            "unit_price": unit_price,
            "subtotal": round(unit_price * self.quantity, 2),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
