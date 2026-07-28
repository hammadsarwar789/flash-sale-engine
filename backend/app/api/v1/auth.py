import logging
from flask import current_app, jsonify
from flask_smorest import Blueprint
from app.core.extensions import db, redis_client
from app.models.user import User
from app.api.decorators.rate_limit import rate_limit
from app.schemas.auth_schema import (
    UserRegisterSchema,
    UserLoginSchema,
    UserResponseSchema,
    TokenResponseSchema,
)
from app.core.security import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", "auth", url_prefix="/api/v1/auth", description="Authentication operations")


@auth_bp.route("/register", methods=["POST"])
@rate_limit(limit=5, period=60)
@auth_bp.arguments(UserRegisterSchema)
@auth_bp.response(201, UserResponseSchema)
def register(user_data):
    """Register a new user account."""
    existing_user = db.session.query(User).filter_by(email=user_data["email"]).first()
    if existing_user:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/user-exists",
                    "title": "Conflict",
                    "status": 409,
                    "detail": f"User with email '{user_data['email']}' already exists.",
                }
            ),
            409,
        )

    user = User(
        email=user_data["email"],
        password_hash=hash_password(user_data["password"]),
        full_name=user_data.get("full_name"),
        role="user",
    )
    db.session.add(user)
    db.session.commit()

    return user.to_dict(), 201


@auth_bp.route("/login", methods=["POST"])
@rate_limit(limit=5, period=60)
@auth_bp.arguments(UserLoginSchema)
@auth_bp.response(200, TokenResponseSchema)
def login(login_data):
    """Authenticate user credentials and issue JWT access token."""
    email = login_data["email"].lower().strip()
    failed_key = f"failed_login:{email}"
    lockout_key = f"lockout:{email}"

    # 1. Check if account is currently locked out
    try:
        ttl = redis_client.ttl(lockout_key)
        if ttl > 0:
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/account-locked",
                        "title": "Too Many Failed Attempts",
                        "status": 429,
                        "detail": f"Account locked due to 5 consecutive failed login attempts. Try again in {ttl} seconds.",
                    }
                ),
                429,
                {"Retry-After": str(ttl)},
            )
    except Exception as e:
        logger.warning(f"Redis lockout check failed: {e}")

    user = db.session.query(User).filter_by(email=email).first()
    if not user or not verify_password(login_data["password"], user.password_hash):
        try:
            failed_count = redis_client.incr(failed_key)
            redis_client.expire(failed_key, 300)  # Keep failed counter for 5 minutes

            if failed_count >= 5:
                redis_client.setex(lockout_key, 900, "locked")  # 15-minute lockout
                redis_client.delete(failed_key)
                return (
                    jsonify(
                        {
                            "type": "https://api.flashsale.com/errors/account-locked",
                            "title": "Account Locked",
                            "status": 429,
                            "detail": "Account locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.",
                        }
                    ),
                    429,
                    {"Retry-After": "900"},
                )

            attempts_left = 5 - failed_count
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/invalid-credentials",
                        "title": "Unauthorized",
                        "status": 401,
                        "detail": f"Invalid email or password credentials. ({attempts_left} attempt{'s' if attempts_left != 1 else ''} remaining before account lock).",
                    }
                ),
                401,
            )
        except Exception:
            return (
                jsonify(
                    {
                        "type": "https://api.flashsale.com/errors/invalid-credentials",
                        "title": "Unauthorized",
                        "status": 401,
                        "detail": "Invalid email or password credentials.",
                    }
                ),
                401,
            )

    # 2. Reset lockout tracking on successful login
    try:
        redis_client.delete(failed_key)
        redis_client.delete(lockout_key)
    except Exception:
        pass

    if not user.is_active:
        return (
            jsonify(
                {
                    "type": "https://api.flashsale.com/errors/account-disabled",
                    "title": "Forbidden",
                    "status": 403,
                    "detail": "Account has been deactivated.",
                }
            ),
            403,
        )

    secret_key = current_app.config["JWT_SECRET_KEY"]
    expires_minutes = current_app.config["JWT_ACCESS_TOKEN_EXPIRES_MINUTES"]

    token = create_access_token(
        user_id=user.id,
        role=user.role,
        secret_key=secret_key,
        expires_minutes=expires_minutes,
    )

    return {
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": expires_minutes * 60,
        "user": user.to_dict(),
    }, 200


@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    """Refresh JWT access token."""
    from flask import request
    from app.core.security import decode_access_token

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"message": "Missing Authorization header"}), 401

    token_str = auth_header.split(" ")[1]
    secret_key = current_app.config["JWT_SECRET_KEY"]

    payload = decode_access_token(token_str, secret_key)
    if not payload:
        return jsonify({"message": "Invalid or expired token"}), 401

    user = db.session.query(User).filter_by(id=payload["sub"]).first()
    if not user or not user.is_active:
        return jsonify({"message": "Invalid user account"}), 401

    new_token = create_access_token(
        user_id=user.id,
        role=user.role,
        secret_key=secret_key,
        expires_minutes=current_app.config["JWT_ACCESS_TOKEN_EXPIRES_MINUTES"],
    )
    return jsonify({"access_token": new_token, "token_type": "Bearer"}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Logout user and revoke active token."""
    from flask import request
    from app.core.extensions import redis_client

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token_str = auth_header.split(" ")[1]
        try:
            redis_client.set(f"blacklist:{token_str}", "revoked", ex=86400)
        except Exception:
            pass

    return jsonify({"message": "Successfully logged out"}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Request password reset link/token."""
    from flask import request
    from app.core.extensions import redis_client
    import secrets

    data = request.get_json() or {}
    email = data.get("email")
    if not email:
        return jsonify({"message": "Email is required"}), 400

    user = db.session.query(User).filter_by(email=email).first()
    if user:
        # Generate cryptographically secure reset token
        reset_token = secrets.token_urlsafe(48)
        try:
            redis_client.set(f"password_reset:{reset_token}", user.id, ex=3600)  # 1 hour TTL
        except Exception:
            pass
        return jsonify({"message": "Password reset link sent to email", "reset_token": reset_token}), 200

    return jsonify({"message": "If that email exists, a reset link has been sent"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password using reset token."""
    from flask import request
    from app.core.extensions import redis_client

    data = request.get_json() or {}
    token = data.get("reset_token")
    new_password = data.get("new_password")

    if not token or not new_password:
        return jsonify({"message": "reset_token and new_password are required"}), 400

    # Look up token in Redis
    try:
        user_id = redis_client.get(f"password_reset:{token}")
        if user_id:
            user_id = user_id.decode() if isinstance(user_id, bytes) else user_id
        else:
            return jsonify({"message": "Invalid or expired reset token"}), 400
    except Exception:
        return jsonify({"message": "Unable to verify reset token"}), 500

    user = db.session.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({"message": "Invalid or expired reset token"}), 400

    user.password_hash = hash_password(new_password)
    db.session.commit()

    # Invalidate used token
    try:
        redis_client.delete(f"password_reset:{token}")
    except Exception:
        pass

    return jsonify({"message": "Password reset successfully"}), 200


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    """Verify user email address."""
    from flask import request
    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    user = db.session.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.is_email_verified = True
    db.session.commit()
    return jsonify({"message": "Email verified successfully", "user": user.to_dict()}), 200
