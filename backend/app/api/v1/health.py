import logging
from flask import jsonify
from flask_smorest import Blueprint
from sqlalchemy import text
from app.core.extensions import db, redis_client

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", "health", url_prefix="/api/v1/health", description="System Health Checks")


@health_bp.route("/live", methods=["GET"])
def liveness_probe():
    """Liveness check probe."""
    return jsonify({"status": "alive"}), 200


@health_bp.route("/ready", methods=["GET"])
def readiness_probe():
    """Readiness probe checking database and redis dependencies."""
    status_details = {
        "database": "down",
        "redis": "down",
    }
    db_ready = False
    redis_ready = False

    # 1. Check PostgreSQL Database connection (Primary Core)
    try:
        db.session.execute(text("SELECT 1"))
        status_details["database"] = "up"
        db_ready = True
    except Exception as e:
        logger.error(f"Readiness probe DB check failed: {e}")

    # 2. Check Redis In-Memory cache connection (Optional Accelerator)
    try:
        if redis_client.ping():
            status_details["redis"] = "up"
            redis_ready = True
    except Exception as e:
        status_details["redis"] = "offline (DB fallback active)"

    # Application is READY as long as primary PostgreSQL Database is UP
    if db_ready:
        mode = "full (DB + Redis)" if redis_ready else "standalone (PostgreSQL active, Redis bypassed)"
        return jsonify({
            "status": "ready",
            "mode": mode,
            "checks": status_details
        }), 200
    else:
        return jsonify({
            "status": "unhealthy",
            "checks": status_details
        }), 503
