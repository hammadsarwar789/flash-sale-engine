import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class User(db.Model):
    """User database model for authentication and order ownership."""

    __tablename__ = "users"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(db.String(64), db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(128), nullable=True)
    role = db.Column(db.String(32), nullable=False, default="user")
    user_type = db.Column(db.String(32), nullable=False, default="STAFF")  # STAFF, VENDOR, SUPER_ADMIN
    status = db.Column(db.String(32), nullable=False, default="ACTIVE")  # PENDING_APPROVAL, ACTIVE, REJECTED, SUSPENDED
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_email_verified = db.Column(db.Boolean, nullable=False, default=False)

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

    tenant = db.relationship("Tenant", back_populates="users")
    roles = db.relationship("Role", secondary="user_roles", lazy="subquery")
    outlet_scopes = db.relationship("Outlet", secondary="user_outlet_scopes", lazy="subquery")
    orders = db.relationship("Order", back_populates="user", lazy="select", passive_deletes=True)
    cart_items = db.relationship("CartItem", back_populates="user", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "user_type": self.user_type,
            "status": self.status,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "roles": [r.name for r in self.roles],
            "assigned_outlets": [o.id for o in self.outlet_scopes],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
