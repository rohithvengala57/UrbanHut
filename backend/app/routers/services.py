import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.service_booking import ServiceBooking
from app.models.service_provider import ServiceProvider, ServiceReview
from app.models.user import User

router = APIRouter()


# ─── UH-801/UH-802: Booking schemas ──────────────────────────────────────────

class BookingCreate(BaseModel):
    provider_id: uuid.UUID
    scheduled_date: date
    time_slot: str
    notes: str | None = None


class BookingReschedule(BaseModel):
    scheduled_date: date
    time_slot: str
    reason: str | None = None


class BookingCancel(BaseModel):
    reason: str | None = None


def _booking_dict(b: ServiceBooking, provider_name: str | None = None) -> dict:
    return {
        "id": str(b.id),
        "provider_id": str(b.provider_id),
        "provider_name": provider_name,
        "scheduled_date": b.scheduled_date.isoformat(),
        "time_slot": b.time_slot,
        "notes": b.notes,
        "status": b.status,
        "rescheduled_date": b.rescheduled_date.isoformat() if b.rescheduled_date else None,
        "rescheduled_time_slot": b.rescheduled_time_slot,
        "reschedule_reason": b.reschedule_reason,
        "cancel_reason": b.cancel_reason,
        "created_at": b.created_at.isoformat(),
        "updated_at": b.updated_at.isoformat(),
    }


# ─── Providers ───────────────────────────────────────────────────────────────

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


# ─── UH-801: Service Booking MVP ─────────────────────────────────────────────

@router.post("/bookings", status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Book a service provider for a specific date and time slot."""
    provider_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.id == data.provider_id)
    )
    provider = provider_result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")

    if data.scheduled_date < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scheduled date must be in the future")

    booking = ServiceBooking(
        user_id=current_user.id,
        provider_id=data.provider_id,
        scheduled_date=data.scheduled_date,
        time_slot=data.time_slot,
        notes=data.notes,
        status="pending",
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    return _booking_dict(booking, provider.name)


@router.get("/bookings")
async def list_my_bookings(
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all service bookings for the current user."""
    query = select(ServiceBooking).where(ServiceBooking.user_id == current_user.id)
    if status_filter:
        query = query.where(ServiceBooking.status == status_filter)
    query = query.order_by(ServiceBooking.scheduled_date.desc())

    result = await db.execute(query)
    bookings = result.scalars().all()

    if not bookings:
        return []

    provider_ids = {b.provider_id for b in bookings}
    providers_result = await db.execute(
        select(ServiceProvider).where(ServiceProvider.id.in_(provider_ids))
    )
    providers_map = {p.id: p.name for p in providers_result.scalars().all()}

    return [_booking_dict(b, providers_map.get(b.provider_id)) for b in bookings]


@router.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ServiceBooking).where(
            and_(ServiceBooking.id == booking_id, ServiceBooking.user_id == current_user.id)
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    provider_result = await db.execute(
        select(ServiceProvider.name).where(ServiceProvider.id == booking.provider_id)
    )
    provider_name = provider_result.scalar_one_or_none()
    return _booking_dict(booking, provider_name)


# ─── UH-802: Reschedule / Cancel Booking ─────────────────────────────────────

@router.patch("/bookings/{booking_id}/reschedule")
async def reschedule_booking(
    booking_id: uuid.UUID,
    data: BookingReschedule,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reschedule a pending or confirmed booking to a new date/time."""
    result = await db.execute(
        select(ServiceBooking).where(
            and_(ServiceBooking.id == booking_id, ServiceBooking.user_id == current_user.id)
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status not in ("pending", "confirmed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reschedule a booking with status '{booking.status}'",
        )

    if data.scheduled_date < date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New date must be in the future")

    booking.rescheduled_date = booking.scheduled_date
    booking.rescheduled_time_slot = booking.time_slot
    booking.reschedule_reason = data.reason
    booking.scheduled_date = data.scheduled_date
    booking.time_slot = data.time_slot
    booking.status = "rescheduled"

    await db.flush()
    await db.refresh(booking)

    provider_result = await db.execute(
        select(ServiceProvider.name).where(ServiceProvider.id == booking.provider_id)
    )
    return _booking_dict(booking, provider_result.scalar_one_or_none())


@router.patch("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: uuid.UUID,
    data: BookingCancel,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending, confirmed, or rescheduled booking."""
    result = await db.execute(
        select(ServiceBooking).where(
            and_(ServiceBooking.id == booking_id, ServiceBooking.user_id == current_user.id)
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status in ("cancelled", "completed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel a booking with status '{booking.status}'",
        )

    booking.status = "cancelled"
    booking.cancel_reason = data.reason

    await db.flush()
    await db.refresh(booking)

    provider_result = await db.execute(
        select(ServiceProvider.name).where(ServiceProvider.id == booking.provider_id)
    )
    return _booking_dict(booking, provider_result.scalar_one_or_none())
