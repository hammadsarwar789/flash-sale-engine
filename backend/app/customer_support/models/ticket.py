import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Ticket(db.Model):
    """Customer Support Ticket model."""

    __tablename__ = "tickets"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vendor_id = db.Column(db.String(36), db.ForeignKey("sellers.id", ondelete="SET NULL"), nullable=True, index=True)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    
    subject = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(64), nullable=False, default="GENERAL")
    priority = db.Column(db.String(20), nullable=False, default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = db.Column(db.String(30), nullable=False, default="OPEN", index=True)      # OPEN, IN_PROGRESS, WAITING_CUSTOMER, RESOLVED, CLOSED
    
    assigned_agent_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

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

    # Relationships
    customer = db.relationship("User", foreign_keys=[customer_id])
    assigned_agent = db.relationship("User", foreign_keys=[assigned_agent_id])
    messages = db.relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at.asc()")
    ai_metadata = db.relationship("TicketAI", back_populates="ticket", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "ticket_number": self.ticket_number,
            "customer_id": self.customer_id,
            "customer_name": self.customer.full_name if self.customer else None,
            "customer_email": self.customer.email if self.customer else None,
            "vendor_id": self.vendor_id,
            "order_id": self.order_id,
            "subject": self.subject,
            "category": self.category,
            "priority": self.priority,
            "status": self.status,
            "assigned_agent_id": self.assigned_agent_id,
            "assigned_agent_name": self.assigned_agent.full_name if self.assigned_agent else None,
            "message_count": len(self.messages) if self.messages else 0,
            "ai_metadata": self.ai_metadata.to_dict() if self.ai_metadata else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TicketAI(db.Model):
    """AI Analysis & Summarization metadata for support tickets."""

    __tablename__ = "ticket_ai"

    ticket_id = db.Column(db.String(36), db.ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True)
    summary = db.Column(db.Text, nullable=True)
    sentiment = db.Column(db.String(32), nullable=True)  # NEUTRAL, FRUSTRATED, URGENT, POSITIVE
    suggested_reply = db.Column(db.Text, nullable=True)
    confidence = db.Column(db.Float, nullable=True, default=0.0)
    predicted_category = db.Column(db.String(64), nullable=True)
    duplicate_cluster_id = db.Column(db.String(36), nullable=True)
    analyzed_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    ticket = db.relationship("Ticket", back_populates="ai_metadata")

    def to_dict(self):
        return {
            "ticket_id": self.ticket_id,
            "summary": self.summary,
            "sentiment": self.sentiment,
            "suggested_reply": self.suggested_reply,
            "confidence": self.confidence,
            "predicted_category": self.predicted_category,
            "duplicate_cluster_id": self.duplicate_cluster_id,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
        }
