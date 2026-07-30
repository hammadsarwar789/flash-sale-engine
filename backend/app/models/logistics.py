import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Carrier(db.Model):
    """Logistics 3PL carrier integration model."""

    __tablename__ = "carriers"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    api_identifier = db.Column(db.String(64), nullable=True)  # e.g., 'tcs', 'leopards', 'dhl', 'fedex'
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "api_identifier": self.api_identifier,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Shipment(db.Model):
    """Sub-order shipment dispatch and tracking model with Proof of Delivery (PoD)."""

    __tablename__ = "shipments"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sub_order_id = db.Column(db.String(36), db.ForeignKey("sub_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    carrier_id = db.Column(db.String(36), db.ForeignKey("carriers.id"), nullable=True, index=True)
    tracking_number = db.Column(db.String(128), nullable=True, index=True)
    status = db.Column(db.String(32), nullable=False, default="LABEL_CREATED", index=True)  # LABEL_CREATED, PICKED_UP, IN_TRANSIT, DELIVERED, FAILED
    proof_of_delivery_url = db.Column(db.String(500), nullable=True)

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

    sub_order = db.relationship("SubOrder")
    carrier = db.relationship("Carrier")

    def to_dict(self):
        return {
            "id": self.id,
            "sub_order_id": self.sub_order_id,
            "carrier_id": self.carrier_id,
            "carrier_name": self.carrier.name if self.carrier else "Platform Express",
            "tracking_number": self.tracking_number,
            "status": self.status,
            "proof_of_delivery_url": self.proof_of_delivery_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
