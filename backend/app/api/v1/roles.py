from flask import request, jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.core.authorization import require_permission
from app.models.rbac import Role, Permission, UserRole, UserOutletScope
from app.models.user import User

roles_bp = Blueprint("roles", "roles", url_prefix="/api/v1/admin", description="Dynamic RBAC Role & Permission Management")


@roles_bp.route("/permissions", methods=["GET"])
@require_permission("enterprise:roles:read")
def get_permissions():
    """List all available system permissions."""
    perms = db.session.query(Permission).all()
    return jsonify([p.to_dict() for p in perms]), 200


@roles_bp.route("/permissions", methods=["POST"])
@require_permission("enterprise:roles:write")
def create_permission():
    """Create a new granular permission code (<scope>:<resource>:<action>)."""
    data = request.get_json() or {}
    code = data.get("code")
    module = data.get("module", "custom")
    description = data.get("description", "")

    if not code:
        return jsonify({"error": "Bad Request", "message": "Permission 'code' is required."}), 400

    existing = db.session.query(Permission).filter_by(code=code).first()
    if existing:
        return jsonify({"error": "Conflict", "message": f"Permission code '{code}' already exists."}), 409

    perm = Permission(code=code, module=module, description=description)
    db.session.add(perm)
    db.session.commit()
    return jsonify(perm.to_dict()), 201


@roles_bp.route("/roles", methods=["GET"])
@require_permission("enterprise:roles:read")
def get_roles():
    """List all dynamic roles for tenant."""
    tenant_id = g.tenant_id
    query = db.session.query(Role)
    if tenant_id:
        query = query.filter_by(tenant_id=tenant_id)
    roles = query.all()
    return jsonify([r.to_dict() for r in roles]), 200


@roles_bp.route("/roles", methods=["POST"])
@require_permission("enterprise:roles:write")
def create_role():
    """Create a dynamic custom role and bind permission codes."""
    data = request.get_json() or {}
    name = data.get("name")
    description = data.get("description", "")
    permission_codes = data.get("permissions", [])
    tenant_id = g.tenant_id or data.get("tenant_id", "default_tenant")

    if not name:
        return jsonify({"error": "Bad Request", "message": "Role 'name' is required."}), 400

    existing = db.session.query(Role).filter_by(tenant_id=tenant_id, name=name).first()
    if existing:
        return jsonify({"error": "Conflict", "message": f"Role '{name}' already exists for this tenant."}), 409

    role = Role(tenant_id=tenant_id, name=name, description=description)

    # Attach permissions
    if permission_codes:
        perms = db.session.query(Permission).filter(Permission.code.in_(permission_codes)).all()
        role.permissions = perms

    db.session.add(role)
    db.session.commit()
    return jsonify(role.to_dict()), 201


@roles_bp.route("/users/<string:user_id>/roles", methods=["POST"])
@require_permission("enterprise:roles:assign")
def assign_user_roles(user_id: str):
    """Assign roles and outlet scopes to a user."""
    data = request.get_json() or {}
    role_ids = data.get("role_ids", [])
    outlet_ids = data.get("outlet_ids", [])

    user = db.session.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({"error": "Not Found", "message": f"User '{user_id}' not found."}), 404

    # Clear existing roles and assign new
    db.session.query(UserRole).filter_by(user_id=user_id).delete()
    for rid in role_ids:
        db.session.add(UserRole(user_id=user_id, role_id=rid))

    # Clear existing scopes and assign new
    db.session.query(UserOutletScope).filter_by(user_id=user_id).delete()
    for oid in outlet_ids:
        db.session.add(UserOutletScope(user_id=user_id, outlet_id=oid))

    db.session.commit()
    return jsonify({
        "message": f"Roles and outlet scopes assigned to user '{user.email}' successfully.",
        "user": user.to_dict()
    }), 200
