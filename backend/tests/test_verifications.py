from datetime import datetime

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


async def _signup_admin(client: AsyncClient, db_session: AsyncSession) -> dict:
    from sqlalchemy import select

    from app.models.user import User

    await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "admin@test.com",
            "password": "password123",
            "full_name": "Admin User",
        },
    )

    result = await db_session.execute(select(User).where(User.email == "admin@test.com"))
    user = result.scalar_one()
    user.role = "admin"
    await db_session.flush()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "password123"},
    )
    return resp.json()


@pytest.mark.anyio
async def test_reviewed_verification_sets_30_day_delete_after(client: AsyncClient, db_session: AsyncSession):
    from sqlalchemy import select

    from app.models.user import User
    from app.models.verification import Verification

    tokens = await _signup_admin(client, db_session)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    user = (
        await db_session.execute(select(User).where(User.email == "admin@test.com"))
    ).scalar_one()
    verification = Verification(
        user_id=user.id,
        type="id",
        status="pending",
        document_url=f"verifications/{user.id}/id/license.jpg",
    )
    db_session.add(verification)
    await db_session.flush()

    review_resp = await client.patch(
        f"/api/v1/verifications/{verification.id}/review",
        json={"status": "approved", "review_notes": "Looks good"},
        headers=headers,
    )
    assert review_resp.status_code == 200

    body = review_resp.json()
    metadata = body["metadata"]
    approved_at = datetime.fromisoformat(metadata["approved_at"])
    delete_after = datetime.fromisoformat(metadata["delete_after"])

    assert approved_at.tzinfo is not None
    assert delete_after.tzinfo is not None
    assert (delete_after - approved_at).days == 30
    assert delete_after > approved_at
