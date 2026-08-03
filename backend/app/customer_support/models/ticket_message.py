import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class TicketMessage(db.Model):
    """Message thread items for a customer support ticket."""

    __tablename__ = "ticket_messages"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = db.Column(db.String(36), db.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = db.Column(db.String(20), nullable=False, default="CUSTOMER")  # CUSTOMER, AGENT, SYSTEM
    message = db.Column(db.Text, nullable=False)
    attachments = db.Column(db.JSON, nullable=True, default=list)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    ticket = db.relationship("Ticket", back_populates="messages")
    sender = db.relationship("User", foreign_keys=[sender_id])

    def to_dict(self):
        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.full_name if self.sender else None,
            "sender_type": self.sender_type,
            "message": self.message,
            "attachments": self.attachments or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
