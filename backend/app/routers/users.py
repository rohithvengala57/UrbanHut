import io
import time
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, ImageOps
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.match import MatchInterest
from app.models.user import User
from app.models.user_search_preferences import UserSearchPreferences
from app.schemas.user import UserProfileUpdate, UserPublicResponse, UserResponse
from app.utils.s3 import avatar_key, upload_bytes

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).options(selectinload(User.verifications)).where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.add(current_user)
    await db.flush()
    result = await db.execute(
        select(User).options(selectinload(User.verifications)).where(User.id == current_user.id)
    )
    user = result.scalar_one()
    return user


_AVATAR_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
_AVATAR_MAX_WIDTH = 400
_AVATAR_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


@router.post("/me/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a new avatar. Resizes to 400px, strips EXIF, converts to JPEG, stores on S3.
    Updates user.avatar_url with the S3 key.
    """
    content_type = file.content_type or ""
    if content_type not in _AVATAR_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported type '{content_type}'. Allowed: {', '.join(_AVATAR_ALLOWED_TYPES)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > _AVATAR_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum avatar size is 10 MB.",
        )

    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        if img.width > _AVATAR_MAX_WIDTH:
            ratio = _AVATAR_MAX_WIDTH / img.width
            img = img.resize((_AVATAR_MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85, optimize=True)
        jpeg_bytes = buf.getvalue()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not process image: {exc}",
        )

    key = avatar_key(str(current_user.id), f"{int(time.time())}.jpg")
    upload_bytes(key, jpeg_bytes)

    current_user.avatar_url = key
    db.add(current_user)
    await db.flush()
    return {"avatar_key": key}


@router.get("/seeking-count")
async def seeking_count(db: AsyncSession = Depends(get_db)):
    """Count of active seekers — users with search preferences set. Used for home insight cards."""
    result = await db.execute(
        select(func.count(UserSearchPreferences.id))
    )
    count = result.scalar_one()
    return {"count": count}


@router.get("/{user_id}/best-match-score")
async def best_match_score(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return the top compatibility score this user has received from a listing match."""
    result = await db.execute(
        select(func.max(MatchInterest.compatibility_score)).where(
            MatchInterest.from_user_id == user_id
        )
    )
    score = result.scalar_one()
    return {"user_id": user_id, "best_match_score": float(score) if score is not None else 0.0}


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
