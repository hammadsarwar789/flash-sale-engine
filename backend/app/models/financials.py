import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class CommissionRule(db.Model):
    """Commission rate rules per category or specific seller override."""

    __tablename__ = "commission_rules"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = db.Column(db.String(36), db.ForeignKey("categories.id"), nullable=True, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id"), nullable=True, index=True)
    rate = db.Column(db.Numeric(5, 2), nullable=False, default=10.00)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    category = db.relationship("Category")
    seller = db.relationship("Seller")

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else "All Categories",
            "seller_id": self.seller_id,
            "seller_name": self.seller.store_name if self.seller else "All Sellers Default",
            "rate": float(self.rate),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LedgerEntry(db.Model):
    """Append-only double-entry financial ledger for multi-vendor escrow holds and releases."""

    __tablename__ = "ledger_entries"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sub_order_id = db.Column(db.String(36), db.ForeignKey("sub_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id"), nullable=False, index=True)
    entry_type = db.Column(db.String(32), nullable=False, index=True)  # ESCROW_HOLD, ESCROW_RELEASE, COMMISSION_DEDUCTION, REFUND, PAYOUT
    amount = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    status = db.Column(db.String(32), nullable=False, default="HELD", index=True)  # HELD, RELEASED, PAID_OUT, REVERSED
    available_at = db.Column(db.DateTime(timezone=True), nullable=True)  # Unlocks after delivery + return window

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    sub_order = db.relationship("SubOrder")
    seller = db.relationship("Seller")

    def to_dict(self):
        return {
            "id": self.id,
            "sub_order_id": self.sub_order_id,
            "seller_id": self.seller_id,
            "seller_name": self.seller.store_name if self.seller else "Platform Store",
            "entry_type": self.entry_type,
            "amount": float(self.amount),
            "status": self.status,
            "available_at": self.available_at.isoformat() if self.available_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PayoutRequest(db.Model):
    """Merchant payout withdrawal requests."""

    __tablename__ = "payout_requests"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seller_id = db.Column(db.String(36), db.ForeignKey("sellers.id"), nullable=False, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="REQUESTED", index=True)  # REQUESTED, PROCESSING, PAID, REJECTED
    processed_by = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=True)
    processed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    requested_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    seller = db.relationship("Seller")
    processor = db.relationship("User", foreign_keys=[processed_by])

    def to_dict(self):
        return {
            "id": self.id,
            "seller_id": self.seller_id,
            "seller_name": self.seller.store_name if self.seller else "Seller",
            "amount": float(self.amount),
            "status": self.status,
            "processed_by": self.processed_by,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "requested_at": self.requested_at.isoformat() if self.requested_at else None,
        }
