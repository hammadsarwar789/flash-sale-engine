import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Product(db.Model):
    """Flash sale Product model with stock tracking and optimistic locking."""

    __tablename__ = "products"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=True, index=True)
    vendor_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True, index=True)
    name = db.Column(db.String(255), nullable=False)
    sku = db.Column(db.String(64), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    images = db.Column(db.JSON, nullable=True, default=list)
    total_stock = db.Column(db.Integer, nullable=False)
    available_stock = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    discount_percentage = db.Column(db.Float, nullable=False, default=0.0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    version = db.Column(db.Integer, nullable=False, default=1)

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

    category = db.relationship("Category", back_populates="products")
    vendor = db.relationship("User", foreign_keys=[vendor_id])
    variants = db.relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", lazy="joined")
    orders = db.relationship("Order", back_populates="product", lazy="select")

    __table_args__ = (
        db.CheckConstraint("total_stock >= 0", name="check_total_stock_non_negative"),
        db.CheckConstraint("available_stock >= 0", name="check_available_stock_non_negative"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "category": self.category.name if self.category else (self.category_id or "GENERAL"),
            "category_name": self.category.name if self.category else (self.category_id or "GENERAL"),
            "vendor_id": self.vendor_id,
            "vendor_name": self.vendor.full_name if self.vendor and self.vendor.full_name else (self.vendor.email if self.vendor else "Central Enterprise Outlet"),
            "name": self.name,
            "sku": self.sku,
            "description": self.description,
            "images": self.images or [],
            "total_stock": self.total_stock,
            "available_stock": self.available_stock,
            "price": float(self.price),
            "discount_percentage": float(self.discount_percentage or 0.0),
            "sale_price": round(float(self.price) * (1 - float(self.discount_percentage or 0.0) / 100.0), 2) if (self.discount_percentage or 0.0) > 0 else float(self.price),
            "is_active": self.is_active,
            "version": self.version,
            "variants": [v.to_dict() for v in self.variants] if self.variants else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
