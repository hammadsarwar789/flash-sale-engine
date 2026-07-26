import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Review(db.Model):
    """Product Review and Rating model."""

    __tablename__ = "reviews"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = db.Column(db.String(36), db.ForeignKey("products.id"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(128), nullable=True)
    comment = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User")
    product = db.relationship("Product")

    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="check_review_rating_1_to_5"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else "Anonymous",
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
