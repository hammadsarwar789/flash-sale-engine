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
    usage_limit = db.Column(db.Integer, nullable=True)  # Max total redemptions (e.g. first 50 users)
    max_uses_per_user = db.Column(db.Integer, nullable=False, default=1)  # Max redemptions per user account
    times_used = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    redemptions = db.relationship("CouponRedemption", back_populates="coupon", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "discount_type": self.discount_type,
            "discount_value": float(self.discount_value),
            "min_order_amount": float(self.min_order_amount),
            "usage_limit": self.usage_limit,
            "max_uses_per_user": self.max_uses_per_user,
            "times_used": self.times_used,
            "is_active": self.is_active,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class CouponRedemption(db.Model):
    """Tracks per-user coupon redemptions for user usage limit enforcement."""

    __tablename__ = "coupon_redemptions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    coupon_id = db.Column(db.String(36), db.ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, index=True)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    coupon = db.relationship("Coupon", back_populates="redemptions")
    user = db.relationship("User")

