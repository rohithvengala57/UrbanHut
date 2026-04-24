import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.service_provider import ServiceProvider, ServiceReview
from app.models.user import User

router = APIRouter()


@router.get("/providers")
async def search_providers(
    city: str | None = None,
    category: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(ServiceProvider)
    if city:
        query = query.where(ServiceProvider.city.ilike(f"%{city}%"))
    if category:
        query = query.where(ServiceProvider.category == category)

    query = query.order_by(ServiceProvider.rating.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    providers = result.scalars().all()

    return [
        {
            "id": str(p.id),
            "name": p.name,
            "category": p.category,
            "phone": p.phone,
            "city": p.city,
            "state": p.state,
            "rating": float(p.rating),
            "review_count": p.review_count,
            "verified": p.verified,
        }
        for p in providers
    ]


@router.get("/providers/{provider_id}")
async def get_provider(provider_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServiceProvider).where(ServiceProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    reviews_result = await db.execute(
        select(ServiceReview)
        .where(ServiceReview.provider_id == provider_id)
        .order_by(ServiceReview.created_at.desc())
        .limit(20)
    )
    reviews = reviews_result.scalars().all()

    return {
        "id": str(provider.id),
        "name": provider.name,
        "category": provider.category,
        "phone": provider.phone,
        "email": provider.email,
        "city": provider.city,
        "state": provider.state,
        "rating": float(provider.rating),
        "review_count": provider.review_count,
        "verified": provider.verified,
        "reviews": [
            {
                "id": str(r.id),
                "user_id": str(r.user_id),
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews
        ],
    }


@router.post("/providers/{provider_id}/review", status_code=status.HTTP_201_CREATED)
async def create_review(
    provider_id: uuid.UUID,
    rating: int = Query(ge=1, le=5),
    comment: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ServiceProvider).where(ServiceProvider.id == provider_id))
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    review = ServiceReview(
        provider_id=provider_id,
        user_id=current_user.id,
        household_id=current_user.household_id,
        rating=rating,
        comment=comment,
    )
    db.add(review)

    # Update provider rating
    provider.review_count += 1
    total_rating = float(provider.rating) * (provider.review_count - 1) + rating
    provider.rating = total_rating / provider.review_count

    await db.flush()
    return {"status": "created", "review_id": str(review.id)}
