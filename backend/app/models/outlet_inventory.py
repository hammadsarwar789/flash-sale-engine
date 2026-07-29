import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class OutletInventory(db.Model):
    """Store-isolated inventory model."""

    __tablename__ = "outlet_inventories"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    outlet_id = db.Column(db.String(64), db.ForeignKey("outlets.id", ondelete="CASCADE"), nullable=False, index=True)
    product_sku = db.Column(db.String(64), nullable=False)
    quantity_available = db.Column(db.Integer, nullable=False, default=0)
    quantity_held = db.Column(db.Integer, nullable=False, default=0)
    reorder_level = db.Column(db.Integer, nullable=False, default=10)

    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    outlet = db.relationship("Outlet", back_populates="inventories")

    __table_args__ = (
        db.UniqueConstraint("outlet_id", "product_sku", name="uk_outlet_sku"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "outlet_id": self.outlet_id,
            "product_sku": self.product_sku,
            "quantity_available": self.quantity_available,
            "quantity_held": self.quantity_held,
            "reorder_level": self.reorder_level,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
