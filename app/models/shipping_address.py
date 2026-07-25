import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class ShippingAddress(db.Model):
    """User Shipping Address model."""

    __tablename__ = "shipping_addresses"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    recipient_name = db.Column(db.String(128), nullable=False)
    address_line1 = db.Column(db.String(255), nullable=False)
    address_line2 = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(64), nullable=False)
    state = db.Column(db.String(64), nullable=False)
    postal_code = db.Column(db.String(32), nullable=False)
    country = db.Column(db.String(64), nullable=False, default="US")
    phone = db.Column(db.String(32), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "recipient_name": self.recipient_name,
            "address_line1": self.address_line1,
            "address_line2": self.address_line2,
            "city": self.city,
            "state": self.state,
            "postal_code": self.postal_code,
            "country": self.country,
            "phone": self.phone,
        }
