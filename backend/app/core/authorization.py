import functools
from flask import request, jsonify, g, current_app
from app.core.security import decode_access_token


def require_permission(required_permission: str = None, scope_param: str = "outlet_id"):
    """
    Scope-Aware Authorization Middleware Decorator.
    Enforces:
    1. Valid JWT authentication token.
    2. User possesses the specific required permission code (if specified).
    3. Outlet isolation: target outlet_id MUST be within user's assigned outlets (unless enterprise admin).
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Missing or malformed Bearer authorization token."
                }), 401

            token = auth_header.split(" ")[1]
            secret_key = current_app.config.get("JWT_SECRET_KEY") or current_app.config["SECRET_KEY"]
            payload = decode_access_token(token, secret_key)

            if not payload:
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Invalid or expired JWT authorization token."
                }), 401

            ctx = payload.get("context", {})
            user_permissions = ctx.get("permissions", [])
            roles = ctx.get("roles", [])
            is_enterprise_admin = ctx.get("is_enterprise_admin", False) or "super_admin" in roles or payload.get("role") == "admin"

            # 1. Permission Code Check
            if required_permission and not is_enterprise_admin:
                if required_permission not in user_permissions:
                    return jsonify({
                        "error": "Forbidden",
                        "message": f"Required permission missing: '{required_permission}'"
                    }), 403

            # 2. Scope Isolation Check (Outlet-level)
            target_outlet_id = (
                kwargs.get(scope_param)
                or request.args.get(scope_param)
                or (request.is_json and request.json.get(scope_param) if request.is_json else None)
            )

            if target_outlet_id and not is_enterprise_admin:
                assigned_outlets = ctx.get("assigned_outlets", [])
                if target_outlet_id not in assigned_outlets:
                    return jsonify({
                        "error": "Forbidden Scope Access",
                        "message": f"Access denied for Outlet ID '{target_outlet_id}'. User is not scoped for this outlet."
                    }), 403

            # Attach session variables to Flask global context
            g.user_id = payload.get("sub")
            g.user_role = payload.get("role")
            g.tenant_id = ctx.get("tenant_id")
            g.roles = roles
            g.permissions = user_permissions
            g.assigned_outlets = ctx.get("assigned_outlets", [])
            g.is_enterprise_admin = is_enterprise_admin

            return f(*args, **kwargs)

        return decorated_function

    return decorator
