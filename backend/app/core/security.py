import datetime
import hashlib
import os
import hmac
import jwt
from typing import Any, Dict, Optional


def hash_password(password: str) -> str:
    """Hash password using SHA-256 with random salt."""
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex() + ":" + pwd_hash.hex()


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify raw password against salted SHA-256 hash string."""
    try:
        salt_hex, key_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        computed_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False


def create_access_token(
    user_id: str,
    role: str,
    secret_key: str,
    expires_minutes: int = 60,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate JWT access token with scoped RBAC claims."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + datetime.timedelta(minutes=expires_minutes),
        "context": context or {},
    }
    return jwt.encode(payload, secret_key, algorithm="HS256")


def decode_access_token(token: str, secret_key: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
