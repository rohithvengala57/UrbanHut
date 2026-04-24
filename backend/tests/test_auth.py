"""
Integration tests for auth flow.
Uses an in-memory SQLite database (via SQLAlchemy + aiosqlite).

Tests: signup → verify email → login → refresh → logout

Run: pytest tests/test_auth.py -v
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

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
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.mark.anyio
class TestSignup:
    async def test_signup_returns_tokens(self, client):
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "test@example.com",
            "password": "securepassword",
            "full_name": "Test User",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert body["token_type"] == "bearer"

    async def test_signup_duplicate_email_returns_409(self, client):
        payload = {"email": "dup@example.com", "password": "password123", "full_name": "Dup User"}
        await client.post("/api/v1/auth/signup", json=payload)
        resp = await client.post("/api/v1/auth/signup", json=payload)
        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "CONFLICT"

    async def test_signup_short_password_returns_422(self, client):
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "a@b.com", "password": "short", "full_name": "X",
        })
        assert resp.status_code == 422
        assert "error" in resp.json()

    async def test_new_user_trust_score_baseline(self, client, db_session):
        from sqlalchemy import select
        from app.models.user import User

        await client.post("/api/v1/auth/signup", json={
            "email": "baseline@test.com",
            "password": "password123",
            "full_name": "Baseline User",
        })
        result = await db_session.execute(select(User).where(User.email == "baseline@test.com"))
        user = result.scalar_one_or_none()
        assert user is not None
        assert float(user.trust_score) >= 15.0


@pytest.mark.anyio
class TestLogin:
    async def test_login_returns_tokens(self, client):
        await client.post("/api/v1/auth/signup", json={
            "email": "login@test.com", "password": "password123", "full_name": "Login User",
        })
        resp = await client.post("/api/v1/auth/login", json={
            "email": "login@test.com", "password": "password123",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_wrong_password_returns_401(self, client):
        await client.post("/api/v1/auth/signup", json={
            "email": "wrong@test.com", "password": "correctpass", "full_name": "W User",
        })
        resp = await client.post("/api/v1/auth/login", json={
            "email": "wrong@test.com", "password": "wrongpass",
        })
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "UNAUTHORIZED"

    async def test_nonexistent_email_returns_401(self, client):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com", "password": "password",
        })
        assert resp.status_code == 401


@pytest.mark.anyio
class TestRefreshAndLogout:
    async def _signup_and_login(self, client) -> dict:
        await client.post("/api/v1/auth/signup", json={
            "email": "refresh@test.com", "password": "password123", "full_name": "Refresh User",
        })
        resp = await client.post("/api/v1/auth/login", json={
            "email": "refresh@test.com", "password": "password123",
        })
        return resp.json()

    async def test_refresh_returns_new_tokens(self, client):
        tokens = await self._signup_and_login(client)
        resp = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": tokens["refresh_token"]
        })
        assert resp.status_code == 200
        new_tokens = resp.json()
        assert "access_token" in new_tokens
        # New refresh token should differ (rotation)
        assert new_tokens["refresh_token"] != tokens["refresh_token"]

    async def test_used_refresh_token_is_rejected(self, client):
        tokens = await self._signup_and_login(client)
        # Use it once
        await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        # Use it again — should fail (revoked by rotation)
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 401

    async def test_logout_revokes_token(self, client):
        tokens = await self._signup_and_login(client)
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        # Logout
        await client.post("/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}, headers=headers)
        # Refresh should now fail
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 401


@pytest.mark.anyio
class TestErrorSchema:
    async def test_error_response_has_correct_shape(self, client):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nobody@test.com", "password": "x"
        })
        body = resp.json()
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]

    async def test_validation_error_has_field(self, client):
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "not-an-email", "password": "pass1234", "full_name": "X"
        })
        assert resp.status_code == 422
        body = resp.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"
