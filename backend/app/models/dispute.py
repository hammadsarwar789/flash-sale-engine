import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class SellerRating(db.Model):
    """Customer ratings and feedback for merchant sellers per sub-order."""

    __tablename__ = "seller_ratings"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False, index=True)
    sub_order_id = db.Column(db.String(36), db.ForeignKey("sub_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    rated_by = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    rating = db.Column(db.SmallInteger, nullable=False)  # 1 to 5 stars
    comment = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    seller = db.relationship("Seller")
    sub_order = db.relationship("SubOrder")
    customer = db.relationship("User")

    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="check_seller_rating_range"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "sub_order_id": self.sub_order_id,
            "rated_by": self.rated_by,
            "customer_name": self.customer.full_name if self.customer else "Verified Buyer",
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Dispute(db.Model):
    """Buyer-seller order dispute case resolution model."""

    __tablename__ = "disputes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sub_order_id = db.Column(db.String(36), db.ForeignKey("sub_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    raised_by = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False, index=True)
    reason = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="OPEN", index=True)  # OPEN, UNDER_REVIEW, RESOLVED, ESCALATED
    resolution_notes = db.Column(db.Text, nullable=True)
    assigned_to = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    resolved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    sub_order = db.relationship("SubOrder")
    claimant = db.relationship("User", foreign_keys=[raised_by])
    agent = db.relationship("User", foreign_keys=[assigned_to])

    def to_dict(self):
        return {
            "id": self.id,
            "sub_order_id": self.sub_order_id,
            "raised_by": self.raised_by,
            "claimant_email": self.claimant.email if self.claimant else None,
            "reason": self.reason,
            "status": self.status,
            "resolution_notes": self.resolution_notes,
            "assigned_to": self.assigned_to,
            "agent_email": self.agent.email if self.agent else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }
