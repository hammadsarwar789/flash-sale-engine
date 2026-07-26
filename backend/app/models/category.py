import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Category(db.Model):
    """Product Category hierarchy model."""

    __tablename__ = "categories"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(128), nullable=False, unique=True)
    slug = db.Column(db.String(128), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    parent_id = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=True, index=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    children = db.relationship("Category", backref=db.backref("parent", remote_side=[id]))
    products = db.relationship("Product", back_populates="category")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "parent_id": self.parent_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
