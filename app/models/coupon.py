import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Coupon(db.Model):
    """Coupons and Promo Codes model."""

    __tablename__ = "coupons"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    discount_type = db.Column(db.String(32), nullable=False, default="percentage")  # 'percentage' or 'fixed'
    discount_value = db.Column(db.Numeric(12, 2), nullable=False)
    min_order_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    usage_limit = db.Column(db.Integer, nullable=True)
    times_used = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "discount_type": self.discount_type,
            "discount_value": float(self.discount_value),
            "min_order_amount": float(self.min_order_amount),
            "usage_limit": self.usage_limit,
            "times_used": self.times_used,
            "is_active": self.is_active,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }
