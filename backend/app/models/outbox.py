import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class OutboxStatus:
    PENDING = "PENDING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"


class OutboxEvent(db.Model):
    """Transactional Outbox Pattern event model."""

    __tablename__ = "outbox_events"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    aggregate_type = db.Column(db.String(64), nullable=False, index=True)
    aggregate_id = db.Column(db.String(255), nullable=False, index=True)
    event_type = db.Column(db.String(64), nullable=False, index=True)
    payload = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(32), nullable=False, default=OutboxStatus.PENDING, index=True)
    retry_count = db.Column(db.Integer, nullable=False, default=0)
    error_log = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    processed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "aggregate_type": self.aggregate_type,
            "aggregate_id": self.aggregate_id,
            "event_type": self.event_type,
            "payload": self.payload,
            "status": self.status,
            "retry_count": self.retry_count,
            "error_log": self.error_log,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
        }
