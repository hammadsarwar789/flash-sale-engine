from flask import request, jsonify, g
from flask_smorest import Blueprint
from app.core.extensions import db
from app.core.authorization import require_permission
from app.core.security import hash_password
from app.models.approval import RegistrationRequest, ApprovalAuditLog
from app.models.user import User
from app.models.rbac import UserRole, UserOutletScope

approvals_bp = Blueprint("approvals", "approvals", url_prefix="/api/v1/admin/approvals", description="Hierarchical Registration Approval Pipeline")


@approvals_bp.route("", methods=["GET"])
@require_permission("outlet:staff:approve")
def list_pending_approvals():
    """List pending registration requests scoped by outlet or enterprise level."""
    status_filter = request.args.get("status", "PENDING").upper()
    query = db.session.query(RegistrationRequest)
    if status_filter != "ALL":
        query = query.filter(RegistrationRequest.status == status_filter)

    # If not enterprise admin, restrict requests to STAFF_ONBOARDING within assigned outlets
    if not g.is_enterprise_admin:
        assigned_outlets = g.assigned_outlets or []
        if not assigned_outlets:
            return jsonify([]), 200
        query = query.filter(
            RegistrationRequest.request_type == "STAFF_ONBOARDING",
            RegistrationRequest.target_outlet_id.in_(assigned_outlets)
        )

    requests_list = query.all()
    return jsonify([r.to_dict() for r in requests_list]), 200


@approvals_bp.route("/audit-logs", methods=["GET"])
@require_permission("outlet:staff:approve")
def get_approval_audit_logs():
    """List immutable approval audit trail logs."""
    logs = db.session.query(ApprovalAuditLog).order_by(ApprovalAuditLog.created_at.desc()).limit(100).all()
    return jsonify([log.to_dict() for log in logs]), 200


@approvals_bp.route("/<string:request_id>/action", methods=["POST"])
@require_permission("outlet:staff:approve")
def process_approval_action(request_id: str):
    """Approve or reject a registration request and write an immutable audit log."""
    data = request.get_json() or {}
    action = data.get("action", "").upper()
    comments = data.get("comments", "")

    if action not in ["APPROVE", "REJECT"]:
        return jsonify({"error": "Bad Request", "message": "Action must be 'APPROVE' or 'REJECT'."}), 400

    req = db.session.query(RegistrationRequest).filter_by(id=request_id).first()
    if not req:
        return jsonify({"error": "Not Found", "message": f"Registration request '{request_id}' not found."}), 404

    if req.status != "PENDING":
        return jsonify({"error": "Conflict", "message": f"Request is already processed (Status: '{req.status}')."}), 409

    # Scope check & Hierarchy enforcement
    if req.request_type in ["MANAGER_ONBOARDING", "VENDOR_REGISTRATION"] and not g.is_enterprise_admin:
        return jsonify({
            "error": "Forbidden Scope Access",
            "message": "Only Super Admins can approve Manager or Vendor registration requests."
        }), 403

    if req.target_outlet_id and not g.is_enterprise_admin:
        if req.target_outlet_id not in g.assigned_outlets:
            return jsonify({
                "error": "Forbidden Scope Access",
                "message": f"Cannot approve request for Outlet '{req.target_outlet_id}'. Scope mismatch."
            }), 403

    actor_id = g.user_id

    if action == "APPROVE":
        req.status = "APPROVED"
        payload = req.payload or {}

        # Determine target role
        target_role = "user"
        user_type = "STAFF"
        if req.request_type == "MANAGER_ONBOARDING":
            target_role = "manager"
            user_type = "STAFF"
        elif req.request_type == "VENDOR_REGISTRATION":
            target_role = "vendor"
            user_type = "VENDOR"
        elif req.request_type == "STAFF_ONBOARDING":
            target_role = "stock_operator"
            user_type = "STAFF"

        # Create or update active user account
        user = db.session.query(User).filter_by(email=req.applicant_email).first()
        if not user:
            user = User(
                email=req.applicant_email,
                password_hash=hash_password(payload.get("password", "DefaultP@ssword123")),
                full_name=req.applicant_name,
                tenant_id=req.tenant_id,
                role=target_role,
                user_type=user_type,
                status="ACTIVE",
                is_active=True,
                is_email_verified=True,
            )
            db.session.add(user)
            db.session.flush()
        else:
            user.role = target_role
            user.user_type = user_type
            user.status = "ACTIVE"
            user.is_active = True

        # Assign requested role
        if req.requested_role_id:
            db.session.add(UserRole(user_id=user.id, role_id=req.requested_role_id))

        # Assign target outlet scope
        if req.target_outlet_id:
            db.session.add(UserOutletScope(user_id=user.id, outlet_id=req.target_outlet_id))

    else:
        req.status = "REJECTED"
        # Update user status if pre-registered account exists
        user = db.session.query(User).filter_by(email=req.applicant_email).first()
        if user:
            user.status = "REJECTED"

    # Write Immutable Audit Log
    audit_log = ApprovalAuditLog(
        request_id=req.id,
        actor_id=actor_id,
        action=action,
        comments=comments,
    )
    db.session.add(audit_log)
    db.session.commit()

    return jsonify({
        "message": f"Registration request '{request_id}' successfully set to '{req.status}'.",
        "request": req.to_dict(),
        "audit_log": audit_log.to_dict(),
    }), 200
