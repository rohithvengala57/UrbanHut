import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.community import CommunityPost, CommunityReply, PostUpvote
from app.models.user import User

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    city: str
    type: str  # 'tip', 'question', 'event', 'recommendation'
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=10)


class ReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class PostResponse(BaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    city: str
    type: str
    post_type: str | None = None
    title: str
    body: str
    upvotes: int
    reply_count: int = 0
    created_at: str
    author_name: str | None = None
    author_trust_score: float | None = None
    user_trust_score: float | None = None
    user_upvoted: bool = False

    class Config:
        from_attributes = True


class ReplyResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    body: str
    upvotes: int
    created_at: str
    author_name: str | None = None
    author_avatar: str | None = None
    author_trust_score: float | None = None

    class Config:
        from_attributes = True


# ─── Helpers ─────────────────────────────────────────────────────────────────

_POST_TYPE_MAP = {
    "tip": "TIP",
    "event": "EVENT",
    "recommendation": "RECOMMENDATION",
    "question": "QUESTION",
}


async def _post_to_response(
    post: CommunityPost,
    author: User | None,
    user_upvoted: bool = False,
) -> PostResponse:
    trust_score = float(author.trust_score) if author else None
    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        city=post.city,
        type=post.type,
        post_type=_POST_TYPE_MAP.get(post.type.lower(), post.type.upper()),
        title=post.title,
        body=post.body,
        upvotes=post.upvotes,
        reply_count=post.reply_count,
        created_at=post.created_at.isoformat(),
        author_name=author.full_name if author else None,
        author_trust_score=trust_score,
        user_trust_score=trust_score,
        user_upvoted=user_upvoted,
    )


# ─── Posts ───────────────────────────────────────────────────────────────────

@router.get("/posts", response_model=list[PostResponse])
async def list_posts(
    city: str | None = None,
    type: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(CommunityPost)
    if city:
        query = query.where(CommunityPost.city.ilike(f"%{city}%"))
    if type:
        query = query.where(CommunityPost.type == type)

    query = query.order_by(CommunityPost.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    posts = result.scalars().all()

    if not posts:
        return []

    # Batch-load authors
    author_ids = {p.author_id for p in posts}
    authors_result = await db.execute(select(User).where(User.id.in_(author_ids)))
    authors_map = {u.id: u for u in authors_result.scalars().all()}

    # Batch-load upvotes for current user
    post_ids = [p.id for p in posts]
    upvotes_result = await db.execute(
        select(PostUpvote.post_id).where(
            and_(PostUpvote.post_id.in_(post_ids), PostUpvote.user_id == current_user.id)
        )
    )
    upvoted_post_ids = {row for row in upvotes_result.scalars().all()}

    response = []
    for post in posts:
        author = authors_map.get(post.author_id)
        user_upvoted = post.id in upvoted_post_ids
        response.append(await _post_to_response(post, author, user_upvoted))
    return response


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = CommunityPost(
        author_id=current_user.id,
        city=data.city,
        type=data.type,
        title=data.title,
        body=data.body,
    )
    db.add(post)
    await db.flush()
    await db.refresh(post)
    return await _post_to_response(post, current_user, False)


# ─── UH-702: Upvote with deduplication ───────────────────────────────────────

@router.post("/posts/{post_id}/upvote")
async def upvote_post(
    post_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CommunityPost).where(CommunityPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    # Check if already upvoted
    existing = await db.execute(
        select(PostUpvote).where(
            and_(PostUpvote.post_id == post_id, PostUpvote.user_id == current_user.id)
        )
    )
    already_upvoted = existing.scalar_one_or_none()

    if already_upvoted:
        # Toggle: remove upvote
        await db.delete(already_upvoted)
        post.upvotes = max(0, post.upvotes - 1)
        return {"upvotes": post.upvotes, "user_upvoted": False}
    else:
        # Add upvote
        vote = PostUpvote(post_id=post_id, user_id=current_user.id)
        db.add(vote)
        post.upvotes += 1
        return {"upvotes": post.upvotes, "user_upvoted": True}


# ─── UH-701: Community Replies ────────────────────────────────────────────────

@router.get("/posts/{post_id}/replies", response_model=list[ReplyResponse])
async def list_replies(
    post_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get replies for a community post, ordered oldest first."""
    result = await db.execute(
        select(CommunityReply)
        .where(CommunityReply.post_id == post_id)
        .order_by(CommunityReply.created_at.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    replies = result.scalars().all()

    if not replies:
        return []

    # Batch-load authors
    author_ids = {r.author_id for r in replies}
    authors_result = await db.execute(select(User).where(User.id.in_(author_ids)))
    authors_map = {u.id: u for u in authors_result.scalars().all()}

    response = []
    for reply in replies:
        author = authors_map.get(reply.author_id)
        response.append(ReplyResponse(
            id=reply.id,
            post_id=reply.post_id,
            author_id=reply.author_id,
            body=reply.body,
            upvotes=reply.upvotes,
            created_at=reply.created_at.isoformat(),
            author_name=author.full_name if author else "Anonymous",
            author_avatar=author.avatar_url if author else None,
            author_trust_score=float(author.trust_score) if author else None,
        ))
    return response


@router.post("/posts/{post_id}/replies", response_model=ReplyResponse, status_code=status.HTTP_201_CREATED)
async def create_reply(
    post_id: uuid.UUID,
    data: ReplyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a reply to a community post. Increments reply_count on the post."""
    post_result = await db.execute(select(CommunityPost).where(CommunityPost.id == post_id))
    post = post_result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    reply = CommunityReply(
        post_id=post_id,
        author_id=current_user.id,
        body=data.body.strip(),
    )
    db.add(reply)
    post.reply_count += 1

    await db.flush()
    await db.refresh(reply)

    return ReplyResponse(
        id=reply.id,
        post_id=reply.post_id,
        author_id=reply.author_id,
        body=reply.body,
        upvotes=reply.upvotes,
        created_at=reply.created_at.isoformat(),
        author_name=current_user.full_name,
        author_avatar=current_user.avatar_url,
        author_trust_score=float(current_user.trust_score),
    )
