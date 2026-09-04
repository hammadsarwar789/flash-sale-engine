import uuid
from datetime import datetime, timezone, timedelta
from app.core.extensions import db


class CartItem(db.Model):
    """Shopping cart line item model."""

    __tablename__ = "cart_items"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    variant_id = db.Column(db.String(36), db.ForeignKey("product_variants.id"), nullable=True, index=True)
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
    variant = db.relationship("ProductVariant")

    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="check_cart_quantity_positive"),
        db.UniqueConstraint("user_id", "product_id", "variant_id", name="uq_user_product_variant_cart"),
    )

    def to_dict(self):
        price = float(self.variant.price) if self.variant else (float(self.product.price) if self.product else 0.0)
        product_name = self.product.name if self.product else None
        variant_name = self.variant.name if self.variant else None
        variant_sku = self.variant.sku if self.variant else None

        image_url = None
        if self.product:
            if getattr(self.product, "images", None) and len(self.product.images) > 0:
                image_url = self.product.images[0]
            elif getattr(self.product, "image_url", None):
                image_url = self.product.image_url

        created_dt = self.created_at if (self.created_at and self.created_at.tzinfo) else (
            self.created_at.replace(tzinfo=timezone.utc) if self.created_at else None
        )
        expires_at_str = (created_dt + timedelta(minutes=10)).isoformat() if created_dt else None

        return {
            "id": self.id,
            "user_id": self.user_id,
            "product_id": self.product_id,
            "product_name": product_name,
            "variant_id": self.variant_id,
            "variant_name": variant_name,
            "variant_sku": variant_sku,
            "image_url": image_url,
            "quantity": self.quantity,
            "unit_price": price,
            "subtotal": round(price * self.quantity, 2),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": expires_at_str,
        }
