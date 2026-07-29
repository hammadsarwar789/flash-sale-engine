import uuid
from datetime import datetime, timezone
from app.core.extensions import db


class Permission(db.Model):
    """Granular permission entity (<scope>:<resource>:<action>)."""

    __tablename__ = "permissions"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"perm_{uuid.uuid4().hex[:12]}")
    code = db.Column(db.String(128), unique=True, nullable=False, index=True)
    module = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "module": self.module,
            "description": self.description,
        }


class Role(db.Model):
    """Dynamic Role entity per tenant."""

    __tablename__ = "roles"

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"role_{uuid.uuid4().hex[:12]}")
    tenant_id = db.Column(db.String(64), db.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_system_role = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    permissions = db.relationship("Permission", secondary="role_permissions", lazy="subquery")

    __table_args__ = (
        db.UniqueConstraint("tenant_id", "name", name="uk_tenant_role_name"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "description": self.description,
            "is_system_role": self.is_system_role,
            "permissions": [p.code for p in self.permissions],
        }


class RolePermission(db.Model):
    """Join table linking Roles and Permissions."""

    __tablename__ = "role_permissions"

    role_id = db.Column(db.String(64), db.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = db.Column(db.String(64), db.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


class UserRole(db.Model):
    """Join table linking Users and Roles."""

    __tablename__ = "user_roles"

    user_id = db.Column(db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = db.Column(db.String(64), db.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class UserOutletScope(db.Model):
    """Outlet access scope mapping for users."""

    __tablename__ = "user_outlet_scopes"

    user_id = db.Column(db.String(64), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    outlet_id = db.Column(db.String(64), db.ForeignKey("outlets.id", ondelete="CASCADE"), primary_key=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
