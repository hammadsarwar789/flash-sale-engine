import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Tenant(db.Model):
    """Tenant / Enterprise organization entity."""

    __tablename__ = "tenants"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"ten_{uuid.uuid4().hex[:12]}")
    name = db.Column(db.String(255), nullable=False)
    domain = db.Column(db.String(255), unique=True, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

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

    outlets = db.relationship("Outlet", back_populates="tenant", cascade="all, delete-orphan", lazy="select")
    users = db.relationship("User", back_populates="tenant", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "domain": self.domain,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Outlet(db.Model):
    """Store / Outlet entity belonging to a Tenant."""

    __tablename__ = "outlets"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"out_{uuid.uuid4().hex[:12]}")
    tenant_id = db.Column(db.String(64), db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code = db.Column(db.String(32), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    is_hq = db.Column(db.Boolean, nullable=False, default=False)
    address = db.Column(db.JSON, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    tenant = db.relationship("Tenant", back_populates="outlets")
    inventories = db.relationship("OutletInventory", back_populates="outlet", cascade="all, delete-orphan", lazy="select")

    __table_args__ = (
        db.UniqueConstraint("tenant_id", "code", name="uk_tenant_outlet_code"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "code": self.code,
            "name": self.name,
            "is_hq": self.is_hq,
            "address": self.address,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
