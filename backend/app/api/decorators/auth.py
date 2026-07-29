import functools
from flask import request, jsonify, g, current_app
from app.core.security import decode_access_token


def jwt_required(fn):
    """Decorator requiring valid JWT Bearer token in Authorization header."""

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/unauthorized",
                        "title": "Unauthorized",
                        "status": 401,
                        "detail": "Missing or invalid Authorization header. Expected 'Bearer <token>'.",
                    }
                ),
                401,
            )

        token = auth_header.split(" ")[1]
        secret_key = current_app.config.get("JWT_SECRET_KEY") or current_app.config["SECRET_KEY"]
        payload = decode_access_token(token, secret_key)

        if not payload:
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/invalid-token",
                        "title": "Unauthorized",
                        "status": 401,
                        "detail": "Token is invalid or expired.",
                    }
                ),
                401,
            )

        g.current_user_id = payload.get("sub")
        g.current_user_role = payload.get("role", "user")

        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """Decorator requiring admin role privileges."""

    @functools.wraps(fn)
    @jwt_required
    def wrapper(*args, **kwargs):
        if getattr(g, "current_user_role", None) != "admin":
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/forbidden",
                        "title": "Forbidden",
                        "status": 403,
                        "detail": "Admin privileges are required to access this resource.",
                    }
                ),
                403,
            )

        return fn(*args, **kwargs)

    return wrapper
