import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class RegistrationRequest(db.Model):
    """Hierarchical registration request queue entity."""

    __tablename__ = "registration_requests"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"req_{uuid.uuid4().hex[:12]}")
    tenant_id = db.Column(db.String(64), db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    applicant_email = db.Column(db.String(255), nullable=False)
    applicant_name = db.Column(db.String(255), nullable=False)
    request_type = db.Column(db.String(32), nullable=False)  # VENDOR_REGISTRATION, STAFF_ONBOARDING
    target_outlet_id = db.Column(db.String(64), db.ForeignKey("outlets.id", ondelete="SET NULL"), nullable=True)
    requested_role_id = db.Column(db.String(64), db.ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    payload = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED
    assigned_approver_role = db.Column(db.String(64), nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    audit_logs = db.relationship("ApprovalAuditLog", back_populates="request", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "applicant_email": self.applicant_email,
            "applicant_name": self.applicant_name,
            "request_type": self.request_type,
            "target_outlet_id": self.target_outlet_id,
            "requested_role_id": self.requested_role_id,
            "payload": self.payload,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ApprovalAuditLog(db.Model):
    """Immutable audit trail for registration approvals/rejections."""

    __tablename__ = "approval_audit_logs"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"log_{uuid.uuid4().hex[:12]}")
    request_id = db.Column(db.String(64), db.ForeignKey("registration_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = db.Column(db.String(64), db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(32), nullable=False)  # APPROVED, REJECTED
    comments = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    request = db.relationship("RegistrationRequest", back_populates="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "actor_id": self.actor_id,
            "action": self.action,
            "comments": self.comments,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
