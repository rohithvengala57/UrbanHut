import uuid

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token

log = structlog.get_logger("app.middleware.auth")
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials

    # Decode and validate the JWT
    payload = decode_token(token)
    if payload is None:
        log.warning(
            "auth_token_invalid",
            reason="decode_failed_or_expired",
            # Log only the last 8 chars of the token suffix for traceability without exposure
            token_suffix=token[-8:] if len(token) >= 8 else "short",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if payload.get("type") != "access":
        log.warning(
            "auth_token_wrong_type",
            expected="access",
            received=payload.get("type"),
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id_str = payload.get("sub")
    if user_id_str is None:
        log.warning("auth_token_missing_sub", payload_keys=list(payload.keys()))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        log.warning("auth_token_invalid_user_id", user_id_str=user_id_str)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        log.warning(
            "auth_user_not_found",
            user_id=str(user_id),
            reason="user_deleted_or_never_existed",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    if user.status != "active":
        log.warning(
            "auth_account_not_active",
            user_id=str(user_id),
            account_status=user.status,
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    # Bind user_id into the structlog context so all downstream logs carry it
    structlog.contextvars.bind_contextvars(user_id=str(user.id))

    return user
