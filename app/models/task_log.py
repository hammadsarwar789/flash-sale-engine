import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class TaskLog(db.Model):
    """Execution log model for background Celery tasks."""

    __tablename__ = "task_logs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = db.Column(db.String(255), nullable=False, index=True)
    order_id = db.Column(db.String(36), db.ForeignKey("orders.id"), nullable=True, index=True)
    task_name = db.Column(db.String(128), nullable=False)
    status = db.Column(db.String(32), nullable=False, index=True)
    execution_time_ms = db.Column(db.Numeric(10, 2), nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    order = db.relationship("Order", back_populates="task_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "order_id": self.order_id,
            "task_name": self.task_name,
            "status": self.status,
            "execution_time_ms": float(self.execution_time_ms) if self.execution_time_ms else None,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
