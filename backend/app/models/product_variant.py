import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class ProductVariant(db.Model):
    """Product Variant model for SKU variations (Size, Color, etc.)."""

    __tablename__ = "product_variants"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(128), nullable=False)
    size = db.Column(db.String(32), nullable=True)
    color = db.Column(db.String(32), nullable=True)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    total_stock = db.Column(db.Integer, nullable=False, default=0)
    available_stock = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    product = db.relationship("Product", back_populates="variants")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "sku": self.sku,
            "name": self.name,
            "size": self.size,
            "color": self.color,
            "price": float(self.price),
            "total_stock": self.total_stock,
            "available_stock": self.available_stock,
        }
