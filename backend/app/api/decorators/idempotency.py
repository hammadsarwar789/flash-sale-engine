import json
import functools
import logging
from flask import request, jsonify, make_response
from app.core.extensions import redis_client

logger = logging.getLogger(__name__)


def idempotent(required: bool = True, expire_seconds: int = 86400):
    """
    Redis-backed Idempotency decorator for REST API endpoints.
    Guarantees duplicate POST/PUT requests safely return identical responses.
    """

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            idempotency_key = request.headers.get("Idempotency-Key")

            if not idempotency_key:
                if required:
                    return (
                        jsonify(
                            {
                                "type": "https://api.flashsale.com/errors/missing-header",
                                "title": "Bad Request",
                                "status": 400,
                                "detail": "Header 'Idempotency-Key' is required for this endpoint.",
                            }
                        ),
                        400,
                    )
                return fn(*args, **kwargs)

            redis_key = f"idempotency:{idempotency_key}"

            try:
                cached_raw = redis_client.get(redis_key)
                if cached_raw:
                    cached_data = json.loads(cached_raw)
                    status = cached_data.get("status")

                    if status == "IN_FLIGHT":
                        return (
                            jsonify(
                                {
                                    "type": "https://api.flashsale.com/errors/concurrent-request",
                                    "title": "Conflict",
                                    "status": 409,
                                    "detail": "A request with this Idempotency-Key is currently processing.",
                                }
                            ),
                            409,
                        )

                    if status == "COMPLETED":
                        logger.info(f"Returning cached idempotent response for key {idempotency_key}")
                        response = make_response(jsonify(cached_data.get("body")), cached_data.get("code", 200))
                        response.headers["X-Cache-Lookup"] = "HIT"
                        return response

                # Lock request as IN_FLIGHT in Redis
                in_flight_payload = json.dumps({"status": "IN_FLIGHT"})
                acquired = redis_client.set(redis_key, in_flight_payload, nx=True, ex=120)

                if not acquired:
                    return (
                        jsonify(
                            {
                                "type": "https://api.flashsale.com/errors/concurrent-request",
                                "title": "Conflict",
                                "status": 409,
                                "detail": "A request with this Idempotency-Key is currently processing.",
                            }
                        ),
                        409,
                    )

                # Execute wrapped view function
                result = fn(*args, **kwargs)

                # Format response payload
                if isinstance(result, tuple):
                    response_obj, status_code = result[0], result[1]
                else:
                    response_obj, status_code = result, 200

                if hasattr(response_obj, "get_json"):
                    body = response_obj.get_json()
                elif isinstance(response_obj, dict):
                    body = response_obj
                else:
                    body = {"message": str(response_obj)}

                # Cache completed result in Redis
                completed_payload = json.dumps(
                    {
                        "status": "COMPLETED",
                        "code": status_code,
                        "body": body,
                    }
                )
                redis_client.set(redis_key, completed_payload, ex=expire_seconds)
                return result

            except Exception as e:
                logger.error(f"Idempotency decorator error for key {idempotency_key}: {e}")
                # Fallback to normal execution if Redis fails
                return fn(*args, **kwargs)

        return wrapper

    return decorator
