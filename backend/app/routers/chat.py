import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.appointment import Appointment
from app.models.chat import ChatMessage, ChatRoom
from app.models.listing import Listing
from app.models.match import MatchInterest
from app.models.user import User
from app.schemas.chat import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    ChatRoomResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.analytics import track_backend_event

router = APIRouter()


# ─── UH-303: Chat Rooms ──────────────────────────────────────────────────────

@router.get("/rooms", response_model=list[ChatRoomResponse])
async def get_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chat rooms for the current user, with last message preview."""
    result = await db.execute(
        select(ChatRoom)
        .where(
            and_(
                ChatRoom.status == "active",
                or_(
                    ChatRoom.user_a_id == current_user.id,
                    ChatRoom.user_b_id == current_user.id,
                ),
            )
        )
        .order_by(ChatRoom.created_at.desc())
    )
    rooms = list(result.scalars().all())
    if not rooms:
        return []

    # Collect other user IDs and room IDs
    other_user_ids = set()
    room_ids = []
    for r in rooms:
        other_id = r.user_b_id if r.user_a_id == current_user.id else r.user_a_id
        other_user_ids.add(other_id)
        room_ids.append(r.id)

    # Batch-fetch other users
    users_result = await db.execute(select(User).where(User.id.in_(other_user_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    # Batch-fetch last message per room in one query (avoid N+1 room loop)
    last_message_at_subq = (
        select(
            ChatMessage.room_id.label("room_id"),
            func.max(ChatMessage.created_at).label("max_created_at"),
        )
        .where(ChatMessage.room_id.in_(room_ids))
        .group_by(ChatMessage.room_id)
        .subquery()
    )
    last_msg_rows = await db.execute(
        select(ChatMessage)
        .join(
            last_message_at_subq,
            and_(
                ChatMessage.room_id == last_message_at_subq.c.room_id,
                ChatMessage.created_at == last_message_at_subq.c.max_created_at,
            ),
        )
    )
    last_msgs = {msg.room_id: msg for msg in last_msg_rows.scalars().all()}

    # Batch-fetch unread counts
    unread_result = await db.execute(
        select(ChatMessage.room_id, func.count(ChatMessage.id))
        .where(
            and_(
                ChatMessage.room_id.in_(room_ids),
                ChatMessage.sender_id != current_user.id,
                ChatMessage.is_read == False,  # noqa: E712
            )
        )
        .group_by(ChatMessage.room_id)
    )
    unread_map = {row[0]: row[1] for row in unread_result.all()}

    # Batch-fetch listing titles
    listing_ids = [r.listing_id for r in rooms if r.listing_id]
    listings_map: dict[uuid.UUID, str] = {}
    if listing_ids:
        listings_result = await db.execute(
            select(Listing.id, Listing.title).where(Listing.id.in_(listing_ids))
        )
        listings_map = {row[0]: row[1] for row in listings_result.all()}

    responses = []
    for room in rooms:
        other_id = room.user_b_id if room.user_a_id == current_user.id else room.user_a_id
        other = users_map.get(other_id)
        last_msg = last_msgs.get(room.id)

        responses.append(ChatRoomResponse(
            id=room.id,
            interest_id=room.interest_id,
            listing_id=room.listing_id,
            user_a_id=room.user_a_id,
            user_b_id=room.user_b_id,
            status=room.status,
            created_at=room.created_at,
            other_user_name=other.full_name if other else "Unknown",
            other_user_avatar=other.avatar_url if other else None,
            other_user_trust=float(other.trust_score) if other else 0,
            last_message=last_msg.body if last_msg else None,
            last_message_at=last_msg.created_at if last_msg else None,
            unread_count=unread_map.get(room.id, 0),
            listing_title=listings_map.get(room.listing_id) if room.listing_id else None,
        ))

    # Sort by last message time (most recent first)
    responses.sort(key=lambda r: r.last_message_at or r.created_at, reverse=True)
    return responses


@router.post("/rooms/from-match/{interest_id}", response_model=ChatRoomResponse)
async def create_or_get_room(
    interest_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a chat room from a mutual match, or return existing."""
    # Verify mutual match
    interest_result = await db.execute(
        select(MatchInterest).where(MatchInterest.id == interest_id)
    )
    interest = interest_result.scalar_one_or_none()
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")

    if interest.status != "mutual":
        raise HTTPException(status_code=403, detail="Chat requires a mutual match")

    # Determine the two parties
    user_a = interest.from_user_id
    # Resolve user_b: either to_user_id or the host of to_listing_id
    if interest.to_user_id:
        user_b = interest.to_user_id
    elif interest.to_listing_id:
        listing_result = await db.execute(
            select(Listing.host_id).where(Listing.id == interest.to_listing_id)
        )
        row = listing_result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Listing not found")
        user_b = row[0]
    else:
        raise HTTPException(status_code=400, detail="Interest has no target")

    # Verify current user is one of the parties
    if current_user.id not in (user_a, user_b):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check for existing room
    existing = await db.execute(
        select(ChatRoom).where(ChatRoom.interest_id == interest_id)
    )
    if room := existing.scalar_one_or_none():
        other_id = room.user_b_id if room.user_a_id == current_user.id else room.user_a_id
        other_result = await db.execute(select(User).where(User.id == other_id))
        other = other_result.scalar_one_or_none()
        return ChatRoomResponse(
            id=room.id,
            interest_id=room.interest_id,
            listing_id=room.listing_id,
            user_a_id=room.user_a_id,
            user_b_id=room.user_b_id,
            status=room.status,
            created_at=room.created_at,
            other_user_name=other.full_name if other else "Unknown",
            other_user_avatar=other.avatar_url if other else None,
            other_user_trust=float(other.trust_score) if other else 0,
        )

    room = ChatRoom(
        interest_id=interest_id,
        listing_id=interest.to_listing_id,
        user_a_id=user_a,
        user_b_id=user_b,
    )
    db.add(room)
    await db.flush()

    await track_backend_event(
        db,
        event_name="chat_room_created",
        user_id=current_user.id,
        source="backend",
        properties={"room_id": str(room.id)},
    )

    await db.refresh(room)

    other_id = user_b if current_user.id == user_a else user_a
    other_result = await db.execute(select(User).where(User.id == other_id))
    other = other_result.scalar_one_or_none()

    return ChatRoomResponse(
        id=room.id,
        interest_id=room.interest_id,
        listing_id=room.listing_id,
        user_a_id=room.user_a_id,
        user_b_id=room.user_b_id,
        status=room.status,
        created_at=room.created_at,
        other_user_name=other.full_name if other else "Unknown",
        other_user_avatar=other.avatar_url if other else None,
        other_user_trust=float(other.trust_score) if other else 0,
    )


@router.get("/rooms/{room_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    room_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a chat room. Marks received messages as read."""
    # Verify room membership
    room_result = await db.execute(select(ChatRoom).where(ChatRoom.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room or current_user.id not in (room.user_a_id, room.user_b_id):
        raise HTTPException(status_code=404, detail="Chat room not found")

    # Mark unread messages as read
    from sqlalchemy import update
    await db.execute(
        update(ChatMessage)
        .where(
            and_(
                ChatMessage.room_id == room_id,
                ChatMessage.sender_id != current_user.id,
                ChatMessage.is_read == False,  # noqa: E712
            )
        )
        .values(is_read=True)
    )

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    messages = list(result.scalars().all())
    messages.reverse()  # Return oldest first
    return messages


@router.post("/rooms/{room_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    room_id: uuid.UUID,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a chat room."""
    room_result = await db.execute(select(ChatRoom).where(ChatRoom.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room or current_user.id not in (room.user_a_id, room.user_b_id):
        raise HTTPException(status_code=404, detail="Chat room not found")
    if room.status != "active":
        raise HTTPException(status_code=403, detail="This chat is no longer active")

    if not data.body.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        body=data.body.strip(),
    )
    db.add(msg)
    await db.flush()

    await track_backend_event(
        db,
        event_name="chat_message_sent",
        user_id=current_user.id,
        source="backend",
        properties={"room_id": str(room_id), "message_id": str(msg.id)},
    )

    await db.refresh(msg)
    return msg


@router.get("/unread-count")
async def get_total_unread(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get total unread message count across all rooms."""
    # Get rooms the user belongs to
    rooms_result = await db.execute(
        select(ChatRoom.id).where(
            or_(ChatRoom.user_a_id == current_user.id, ChatRoom.user_b_id == current_user.id)
        )
    )
    room_ids = [r[0] for r in rooms_result.all()]
    if not room_ids:
        return {"unread_count": 0}

    count_result = await db.execute(
        select(func.count(ChatMessage.id)).where(
            and_(
                ChatMessage.room_id.in_(room_ids),
                ChatMessage.sender_id != current_user.id,
                ChatMessage.is_read == False,  # noqa: E712
            )
        )
    )
    return {"unread_count": count_result.scalar() or 0}


# ─── UH-304: Appointments ────────────────────────────────────────────────────

@router.post("/rooms/{room_id}/appointments", response_model=AppointmentResponse, status_code=201)
async def propose_appointment(
    room_id: uuid.UUID,
    data: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Propose a tour or call within a chat room."""
    room_result = await db.execute(select(ChatRoom).where(ChatRoom.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room or current_user.id not in (room.user_a_id, room.user_b_id):
        raise HTTPException(status_code=404, detail="Chat room not found")

    responder_id = room.user_b_id if room.user_a_id == current_user.id else room.user_a_id

    if data.appointment_type not in ("tour", "call"):
        raise HTTPException(status_code=400, detail="Type must be 'tour' or 'call'")

    appt = Appointment(
        room_id=room_id,
        proposer_id=current_user.id,
        responder_id=responder_id,
        appointment_type=data.appointment_type,
        proposed_time=data.proposed_time,
        alt_time_1=data.alt_time_1,
        alt_time_2=data.alt_time_2,
        notes=data.notes,
    )
    db.add(appt)
    await db.flush()
    await db.refresh(appt)

    proposer_name = current_user.full_name
    resp_result = await db.execute(select(User.full_name).where(User.id == responder_id))
    responder_name = resp_result.scalar() or "Unknown"

    resp = AppointmentResponse.model_validate(appt)
    resp.proposer_name = proposer_name
    resp.responder_name = responder_name
    return resp


@router.get("/rooms/{room_id}/appointments", response_model=list[AppointmentResponse])
async def get_appointments(
    room_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all appointments for a chat room."""
    room_result = await db.execute(select(ChatRoom).where(ChatRoom.id == room_id))
    room = room_result.scalar_one_or_none()
    if not room or current_user.id not in (room.user_a_id, room.user_b_id):
        raise HTTPException(status_code=404, detail="Chat room not found")

    result = await db.execute(
        select(Appointment)
        .where(Appointment.room_id == room_id)
        .order_by(Appointment.created_at.desc())
    )
    appts = list(result.scalars().all())

    # Fetch names
    user_ids = set()
    for a in appts:
        user_ids.add(a.proposer_id)
        user_ids.add(a.responder_id)
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    names_map = {u.id: u.full_name for u in users_result.scalars().all()}

    responses = []
    for appt in appts:
        resp = AppointmentResponse.model_validate(appt)
        resp.proposer_name = names_map.get(appt.proposer_id, "Unknown")
        resp.responder_name = names_map.get(appt.responder_id, "Unknown")
        responses.append(resp)

    return responses


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def respond_to_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept, reject, or request reschedule for an appointment."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.id not in (appt.proposer_id, appt.responder_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    valid = {"accepted", "rejected", "rescheduled", "completed"}
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid)}")

    appt.status = data.status
    if data.confirmed_time:
        appt.confirmed_time = data.confirmed_time
    if data.notes is not None:
        appt.notes = data.notes

    await db.flush()
    await db.refresh(appt)

    # Fetch names
    users_result = await db.execute(
        select(User).where(User.id.in_([appt.proposer_id, appt.responder_id]))
    )
    names_map = {u.id: u.full_name for u in users_result.scalars().all()}

    resp = AppointmentResponse.model_validate(appt)
    resp.proposer_name = names_map.get(appt.proposer_id, "Unknown")
    resp.responder_name = names_map.get(appt.responder_id, "Unknown")
    return resp
