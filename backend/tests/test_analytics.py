
import pytest
import pytest_asyncio
import uuid
from datetime import date, datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.analytics import TelemetryEvent, UserAttribution
from app.services.analytics import record_event, track_backend_event

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

async def create_test_user(db: AsyncSession, email: str, role: str = "user"):
    user = User(
        email=email,
        password_hash="hashed",
        full_name="Test User",
        role=role,
        status="active"
    )
    db.add(user)
    await db.commit()
    return user

@pytest.mark.anyio
class TestTelemetryIngestion:
    async def test_ingest_batch_events(self, client, db_session):
        resp = await client.post("/api/v1/telemetry/events", json={
            "events": [
                {
                    "event_name": "landing_page_viewed",
                    "properties": {
                        "source": "google",
                        "medium": "cpc",
                        "campaign": "brand",
                        "city": "London"
                    }
                }
            ]
        })
        assert resp.status_code == 204
        
        # Verify DB
        result = await db_session.execute(select(TelemetryEvent))
        events = result.scalars().all()
        assert len(events) == 1
        assert events[0].event_name == "landing_page_viewed"
        assert events[0].utm_source == "google"

    async def test_ingest_missing_required_properties_fails(self, client):
        resp = await client.post("/api/v1/telemetry/events", json={
            "events": [
                {
                    "event_name": "landing_page_viewed",
                    "properties": {"source": "google"} # missing medium, campaign, city
                }
            ]
        })
        assert resp.status_code == 422
        assert "Missing required properties" in resp.json()["error"]["message"]

@pytest.mark.anyio
class TestUserAttribution:
    async def test_signup_records_attribution(self, client, db_session):
        resp = await client.post("/api/v1/auth/signup", json={
            "email": "attr@test.com",
            "password": "password123",
            "full_name": "Attr User",
            "utm_source": "fb",
            "utm_medium": "social",
            "utm_campaign": "summer_sale"
        })
        assert resp.status_code == 201
        
        result = await db_session.execute(select(User).where(User.email == "attr@test.com"))
        user = result.scalar_one()
        
        attr_result = await db_session.execute(select(UserAttribution).where(UserAttribution.user_id == user.id))
        attr = attr_result.scalar_one()
        
        assert attr.first_touch_source == "fb"
        assert attr.signup_at is not None

    async def test_login_records_event(self, client, db_session):
        # Create user
        user = await create_test_user(db_session, "login_test@test.com")
        from app.utils.security import hash_password
        user.password_hash = hash_password("password123")
        await db_session.commit()
        
        resp = await client.post("/api/v1/auth/login", json={
            "email": "login_test@test.com",
            "password": "password123"
        })
        assert resp.status_code == 200
        
        # Verify TelemetryEvent
        result = await db_session.execute(
            select(TelemetryEvent).where(
                TelemetryEvent.user_id == user.id,
                TelemetryEvent.event_name == "login_completed"
            )
        )
        event = result.scalar_one_or_none()
        assert event is not None
        assert event.source == "backend"

@pytest.mark.anyio
class TestAdminAnalytics:
    async def test_get_user_events_timeline(self, client, db_session):
        admin = await create_test_user(db_session, "admin@test.com", role="admin")
        user = await create_test_user(db_session, "user@test.com")
        
        # Record some events
        await record_event(db_session, event_name="test_event_1", user_id=user.id)
        await record_event(db_session, event_name="test_event_2", user_id=user.id)
        await db_session.commit()
        
        # Login as admin
        from app.utils.security import create_access_token
        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}
        
        resp = await client.get(f"/api/v1/admin/metrics/users/{user.id}/events", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 2
        assert data["events"][0]["event_name"] == "test_event_2" # Descending order

    async def test_daily_funnel(self, client, db_session):
        # Add some events across different days
        today = datetime.now(timezone.utc)
        yesterday = today - timedelta(days=1)
        
        await record_event(db_session, event_name="landing_page_viewed", occurred_at=today, source="web")
        await record_event(db_session, event_name="signup_completed", occurred_at=today, source="web")
        await record_event(db_session, event_name="landing_page_viewed", occurred_at=yesterday, source="web")
        await db_session.commit()
        
        resp = await client.get("/api/v1/telemetry/funnel/daily?days=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["rows"]) >= 1
