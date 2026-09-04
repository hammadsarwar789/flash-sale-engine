import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class ProductImage(db.Model):
    """Product gallery image model supporting multiple images and primary cover image."""

    __tablename__ = "product_images"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(
        db.String(36),
        db.ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    image_url = db.Column(db.String(1024), nullable=False)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    display_order = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    product = db.relationship("Product", back_populates="images")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "image_url": self.image_url,
            "is_primary": bool(self.is_primary),
            "display_order": self.display_order or 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
