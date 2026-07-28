import time
import functools
import logging
from flask import request, jsonify, g
from app.core.extensions import redis_client

logger = logging.getLogger(__name__)


def rate_limit(limit: int = 10, period: int = 60):
    """
    Redis Sliding Window Rate Limiter decorator.
    Restricts client request rate to `limit` requests per `period` seconds.
    """

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # Identify client by authenticated user_id or remote IP address
            identity = getattr(g, "current_user_id", request.remote_addr or "127.0.0.1")
            endpoint = request.path
            redis_key = f"rate_limit:{identity}:{endpoint}"

            now = time.time()
            window_start = now - period

            try:
                pipeline = redis_client.pipeline()
                # 1. Remove timestamps older than current window start
                pipeline.zremrangebyscore(redis_key, 0, window_start)
                # 2. Count requests in current window
                pipeline.zcard(redis_key)
                # 3. Add current timestamp
                pipeline.zadd(redis_key, {str(now): now})
                # 4. Set key expiration
                pipeline.expire(redis_key, period)

                results = pipeline.execute()
                request_count = results[1]

                if request_count >= limit:
                    logger.warning(f"Rate limit exceeded for client {identity} on {endpoint}")
                    return (
                        jsonify(
                            {
                                "type": "https://api.flashsale.com/errors/rate-limit-exceeded",
                                "title": "Too Many Requests",
                                "status": 429,
                                "detail": f"Rate limit of {limit} requests per {period} seconds exceeded. Try again later.",
                            }
                        ),
                        429,
                        {"Retry-After": str(period)},
                    )

            except Exception as e:
                logger.error(f"Rate limit error for key {redis_key}: {e}")

            return fn(*args, **kwargs)

        return wrapper

    return decorator
