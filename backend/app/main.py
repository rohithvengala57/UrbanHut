import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware.rate_limit import RateLimitMiddleware
from app.tasks.worker import start_scheduler, stop_scheduler
from app.routers import (
    auth,
    chat,
    chores,
    community,
    expenses,
    households,
    listings,
    matching,
    saved,
    services,
    trust,
    users,
    verifications,
    telemetry,
)

# ─── Structured logging setup ─────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.CallsiteParameterAdder(
            [
                structlog.processors.CallsiteParameter.FUNC_NAME,
                structlog.processors.CallsiteParameter.MODULE,
            ]
        ),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger("app.main")

# Minimum mobile app version. Bump when a breaking API change ships.
MIN_APP_VERSION = "1.0.0"
LATEST_APP_VERSION = "1.0.0"
_API_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.config import settings

    db_url_safe = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL

    log.info(
        "startup",
        service="urban_hut_api",
        api_version=_API_VERSION,
        min_app_version=MIN_APP_VERSION,
        db_host=db_url_safe,
        jwt_algorithm=settings.JWT_ALGORITHM,
        s3_bucket=settings.AWS_S3_BUCKET or "not_configured",
        dynamo_rate_limit_table=settings.DYNAMODB_RATE_LIMIT_TABLE,
    )

    try:
        start_scheduler()
        log.info("scheduler_started", jobs=["weekly_trust_recalc"])
    except Exception as exc:
        log.error(
            "scheduler_start_failed",
            error=str(exc),
            exc_info=True,
        )
        # Still yield — app can run without scheduler

    yield

    log.info("shutdown_initiated", service="urban_hut_api")
    try:
        stop_scheduler()
        log.info("scheduler_stopped")
    except Exception as exc:
        log.warning("scheduler_stop_error", error=str(exc))

    log.info("shutdown_complete", service="urban_hut_api")


app = FastAPI(
    title="Urban Hut API",
    description="Roommate finding & household management platform",
    version=_API_VERSION,
    lifespan=lifespan,
)

# ─── Middleware (order matters — outermost first) ─────────────────────────────

from app.config import settings as _settings

_cors_origins = [o.strip() for o in _settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)


# ─── Request ID + structured logging middleware ───────────────────────────────

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host if request.client else "unknown",
    )

    log.debug(
        "request_started",
        query_string=str(request.url.query) or None,
        user_agent=request.headers.get("user-agent", "")[:120] or None,
    )

    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        log.error(
            "request_unhandled_exception",
            elapsed_ms=elapsed_ms,
            exc_type=type(exc).__name__,
            error=str(exc),
            exc_info=True,
        )
        raise

    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

    level = "warning" if response.status_code >= 400 else "info"
    log_fn = getattr(log, level)
    log_fn(
        "request_completed",
        status_code=response.status_code,
        elapsed_ms=elapsed_ms,
    )

    response.headers["X-Request-ID"] = request_id
    return response


# ─── App version enforcement ──────────────────────────────────────────────────

@app.middleware("http")
async def app_version_middleware(request: Request, call_next):
    """
    Reject clients below the minimum app version with 426 Upgrade Required.
    Skipped for /health and /api/status so clients can discover the requirement.
    """
    skip_paths = {"/health", "/api/status"}
    if request.url.path in skip_paths:
        return await call_next(request)

    client_version = request.headers.get("X-App-Version")
    if client_version and _version_lt(client_version, MIN_APP_VERSION):
        log.warning(
            "client_version_rejected",
            client_version=client_version,
            min_version=MIN_APP_VERSION,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        )
        return JSONResponse(
            status_code=426,
            content={
                "error": {
                    "code": "APP_VERSION_TOO_OLD",
                    "message": f"App version {client_version} is no longer supported. "
                               f"Please update to at least {MIN_APP_VERSION}.",
                    "min_version": MIN_APP_VERSION,
                    "latest_version": LATEST_APP_VERSION,
                }
            },
        )

    return await call_next(request)


def _version_lt(v1: str, v2: str) -> bool:
    """Returns True if v1 < v2 (semver comparison)."""
    try:
        return tuple(int(x) for x in v1.split(".")) < tuple(int(x) for x in v2.split("."))
    except ValueError:
        log.warning("version_parse_failed", v1=v1, v2=v2)
        return False


# ─── Standardized error response handlers ────────────────────────────────────

def _error_response(code: str, message: str, field: str | None = None, status_code: int = 400) -> JSONResponse:
    body: dict = {"error": {"code": code, "message": message}}
    if field:
        body["error"]["field"] = field
    return JSONResponse(status_code=status_code, content=body)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }
    code = code_map.get(exc.status_code, "ERROR")
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)

    # Auth and permission failures are security-relevant — log at warning
    if exc.status_code in (401, 403):
        log.warning(
            "auth_or_permission_error",
            status_code=exc.status_code,
            code=code,
            detail=detail,
            path=request.url.path,
            method=request.method,
        )
    elif exc.status_code >= 500:
        log.error(
            "http_server_error",
            status_code=exc.status_code,
            code=code,
            detail=detail,
            path=request.url.path,
        )
    else:
        log.info(
            "http_client_error",
            status_code=exc.status_code,
            code=code,
            detail=detail,
        )

    return _error_response(code, detail, status_code=exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()

    # Build field-mapped detail array for all errors (frontend surfaces these directly)
    detail = []
    for e in errors:
        loc = e.get("loc", [])
        # Strip leading "body" segment that Pydantic adds for request body fields
        field_parts = [str(x) for x in loc if x != "body"]
        detail.append({"field": ".".join(field_parts) if field_parts else None, "message": e.get("msg", "")})

    first = detail[0] if detail else {}
    log.warning(
        "request_validation_failed",
        path=request.url.path,
        method=request.method,
        error_count=len(errors),
        errors=detail[:5],
    )
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first.get("message", "Validation error"),
                "detail": detail,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log.error(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        exc_type=type(exc).__name__,
        error=str(exc),
        exc_info=True,
    )
    return _error_response("INTERNAL_SERVER_ERROR", "An unexpected error occurred.", status_code=500)


# ─── Routes ───────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(listings.router, prefix="/api/v1/listings", tags=["Listings"])
app.include_router(matching.router, prefix="/api/v1/matching", tags=["Matching"])
app.include_router(households.router, prefix="/api/v1/households", tags=["Households"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["Expenses"])
app.include_router(chores.router, prefix="/api/v1/chores", tags=["Chores"])
app.include_router(trust.router, prefix="/api/v1/trust", tags=["Trust"])
app.include_router(verifications.router, prefix="/api/v1/verifications", tags=["Verifications"])
app.include_router(services.router, prefix="/api/v1/services", tags=["Services"])
app.include_router(community.router, prefix="/api/v1/community", tags=["Community"])
app.include_router(saved.router, prefix="/api/v1/saved", tags=["Saved"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(telemetry.router, prefix="/api/v1/telemetry", tags=["Telemetry"])

log.info("routes_registered", router_count=13)


# ─── Utility endpoints ────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": _API_VERSION}


@app.get("/api/status")
async def api_status():
    """
    Mobile clients call this on startup to check version requirements
    and maintenance mode before making API calls.
    """
    return {
        "min_version": MIN_APP_VERSION,
        "latest_version": LATEST_APP_VERSION,
        "maintenance_mode": False,
        "status": "operational",
    }
