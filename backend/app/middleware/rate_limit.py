"""
Redis sliding window rate limiter for auth endpoints.

Limits:
  /auth/login           → 5 attempts per 15 min per email
  /auth/signup          → 3 per hour per IP
  /auth/verify-email    → 5 per hour per user
  /auth/forgot-password → 3 per hour per email
"""

import time

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.config import settings

log = structlog.get_logger("app.middleware.rate_limit")


async def get_redis() -> Redis:
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def _check_rate_limit(
    redis: Redis,
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int]:
    """
    Sliding window rate limit check.
    Returns (is_allowed, retry_after_seconds).
    """
    now = time.time()
    window_start = now - window_seconds

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, "-inf", window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window_seconds)
    results = await pipe.execute()

    count = results[2]
    if count > max_requests:
        oldest = await redis.zrange(key, 0, 0, withscores=True)
        retry_after = window_seconds
        if oldest:
            oldest_ts = oldest[0][1]
            retry_after = max(0, int(window_seconds - (now - oldest_ts)))
        return False, retry_after

    return True, 0


class RateLimitMiddleware:
    """ASGI middleware that rate-limits auth endpoints."""

    LIMITS: dict[str, tuple[str, int, int]] = {
        # path_suffix: (key_source, max_requests, window_seconds)
        "/api/v1/auth/login": ("email", 5, 900),          # 5/15min per email
        "/api/v1/auth/signup": ("ip", 3, 3600),            # 3/hr per IP
        "/api/v1/auth/verify-email": ("user", 5, 3600),    # 5/hr per user
        "/api/v1/auth/resend-verification": ("user", 5, 3600),
        "/api/v1/auth/phone/request-otp": ("user", 5, 3600),
    }

    def __init__(self, app):
        self.app = app

    async def _call_downstream(self, scope, receive, send, cached_body: bytes | None):
        if cached_body is None:
            await self.app(scope, receive, send)
            return

        body_sent = False

        async def receive_with_cached_body():
            nonlocal body_sent
            if not body_sent:
                body_sent = True
                return {
                    "type": "http.request",
                    "body": cached_body,
                    "more_body": False,
                }
            return {
                "type": "http.request",
                "body": b"",
                "more_body": False,
            }

        await self.app(scope, receive_with_cached_body, send)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        limit_config = self.LIMITS.get(path)

        if not limit_config:
            await self.app(scope, receive, send)
            return

        key_source, max_req, window = limit_config
        request = Request(scope, receive)
        cached_body: bytes | None = None
        identifier = "unknown"

        # Determine rate-limit key
        if key_source == "ip":
            client_ip = request.client.host if request.client else "unknown"
            identifier = client_ip
            rl_key = f"rl:{path}:{client_ip}"
        elif key_source == "email":
            # Read body to get email; only works for JSON POST
            cached_body = await request.body()
            import json
            try:
                data = json.loads(cached_body)
                identifier = data.get("email", request.client.host if request.client else "unknown")
            except Exception as parse_exc:
                log.debug(
                    "rate_limit_body_parse_failed",
                    path=path,
                    error=str(parse_exc),
                )
                identifier = request.client.host if request.client else "unknown"
            rl_key = f"rl:{path}:{identifier}"
        else:
            # user — based on Authorization header
            auth = request.headers.get("authorization", "")
            identifier = auth[-20:] if auth else "anon"
            rl_key = f"rl:{path}:{identifier}"

        redis = await get_redis()
        try:
            try:
                allowed, retry_after = await _check_rate_limit(redis, rl_key, max_req, window)
            except RedisError as redis_exc:
                # Fail open in local/dev when Redis is unavailable so the API can boot.
                log.warning(
                    "rate_limit_redis_unavailable",
                    path=path,
                    error=str(redis_exc),
                    action="failing_open",
                )
                await self._call_downstream(scope, receive, send, cached_body)
                return
        finally:
            await redis.aclose()

        if not allowed:
            log.warning(
                "rate_limit_exceeded",
                path=path,
                key_source=key_source,
                # Mask full email/ip — log only suffix for correlation
                identifier_suffix=str(identifier)[-6:] if identifier else "unknown",
                retry_after_seconds=retry_after,
                max_requests=max_req,
                window_seconds=window,
            )
            response = JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Try again in {retry_after} seconds.",
                    }
                },
                headers={"Retry-After": str(retry_after)},
            )
            await response(scope, receive, send)
            return

        await self._call_downstream(scope, receive, send, cached_body)
