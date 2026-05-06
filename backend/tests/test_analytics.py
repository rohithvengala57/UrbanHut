
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
from app.models.community import CommunityPost, CommunityReply
from app.models.service_provider import ServiceProvider
from app.models.service_booking import ServiceBooking
from app.models.household import Household
from app.models.listing import Listing
from app.models.expense import Expense
from app.models.match import MatchInterest
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

    async def test_weekly_retention(self, client, db_session):
        today = datetime.now(timezone.utc)
        signup_day = today - timedelta(days=15)

        user_a = await create_test_user(db_session, "retention_a@test.com")
        user_b = await create_test_user(db_session, "retention_b@test.com")

        await record_event(
            db_session,
            event_name="signup_completed",
            user_id=user_a.id,
            occurred_at=signup_day,
            source="web",
            properties={"source": "google"},
        )
        await record_event(
            db_session,
            event_name="signup_completed",
            user_id=user_b.id,
            occurred_at=signup_day,
            source="web",
            properties={"source": "google"},
        )

        # User A retained in week 1 and week 2; User B retained in week 1 only.
        await record_event(
            db_session,
            event_name="chat_message_sent",
            user_id=user_a.id,
            occurred_at=signup_day + timedelta(days=8),
            source="web",
        )
        await record_event(
            db_session,
            event_name="expense_created",
            user_id=user_a.id,
            occurred_at=signup_day + timedelta(days=14),
            source="web",
        )
        await record_event(
            db_session,
            event_name="chat_message_sent",
            user_id=user_b.id,
            occurred_at=signup_day + timedelta(days=8),
            source="web",
        )
        await db_session.commit()

        resp = await client.get("/api/v1/telemetry/retention/weekly?cohort_weeks=8&max_age_weeks=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["rows"]

        cohort = data["rows"][0]
        assert cohort["channel"] == "google"
        assert cohort["cohort_size"] == 2
        assert cohort["retention"][0]["retained_users"] == 2
        assert cohort["retention"][1]["retained_users"] == 2
        assert cohort["retention"][2]["retained_users"] == 1
        assert cohort["retention"][2]["retention_pct"] == 50.0

    async def test_community_analytics(self, client, db_session):
        admin = await create_test_user(db_session, "admin-community@test.com", role="admin")
        author = await create_test_user(db_session, "author@test.com")
        replier = await create_test_user(db_session, "replier@test.com")

        post = CommunityPost(
            author_id=author.id,
            city="San Francisco",
            type="tip",
            title="Great neighborhood",
            body="Detailed guide to local commute options.",
            upvotes=3,
            reply_count=1,
        )
        db_session.add(post)
        await db_session.flush()
        db_session.add(
            CommunityReply(
                post_id=post.id,
                author_id=replier.id,
                body="Very helpful tip, thanks!",
                upvotes=1,
            )
        )
        await db_session.commit()

        from app.utils.security import create_access_token
        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("/api/v1/admin/metrics/community-analytics?days=30", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["metrics"]["total_posts"] == 1
        assert data["metrics"]["total_replies"] == 1
        assert data["metrics"]["new_posts"] == 1
        assert data["metrics"]["new_replies"] == 1
        assert data["metrics"]["active_contributors"] >= 2
        assert data["top_cities"][0]["city"] == "San Francisco"

    async def test_services_analytics_and_household_services_adoption(self, client, db_session):
        admin = await create_test_user(db_session, "admin-services@test.com", role="admin")
        user = await create_test_user(db_session, "services-user@test.com")

        household = Household(name="Svc Home", admin_id=user.id, status="active")
        db_session.add(household)
        await db_session.flush()
        user.household_id = household.id

        provider = ServiceProvider(
            name="Handy Pro",
            category="plumbing",
            city="San Francisco",
            state="CA",
            verified=True,
            rating=4.5,
            review_count=0,
        )
        db_session.add(provider)
        await db_session.flush()

        booking = ServiceBooking(
            user_id=user.id,
            provider_id=provider.id,
            scheduled_date=date.today(),
            time_slot="10:00",
            status="completed",
        )
        db_session.add(booking)
        await db_session.commit()

        from app.utils.security import create_access_token
        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        services_resp = await client.get("/api/v1/admin/metrics/services-analytics?days=30", headers=headers)
        assert services_resp.status_code == 200
        services_data = services_resp.json()
        assert services_data["metrics"]["total_providers"] == 1
        assert services_data["metrics"]["verified_providers"] == 1
        assert services_data["metrics"]["new_bookings"] == 1
        assert services_data["metrics"]["completed_bookings"] == 1
        assert services_data["metrics"]["completion_rate"] == 100.0
        assert services_data["category_demand"][0]["category"] == "plumbing"

        household_resp = await client.get("/api/v1/admin/metrics/household-analytics", headers=headers)
        assert household_resp.status_code == 200
        household_data = household_resp.json()
        services_bar = next(row for row in household_data["feature_adoption"] if row["label"] == "Services Used")
        assert services_bar["count"] == 1

    async def test_investor_insights_revenue_conversion_and_geography(self, client, db_session):
        admin = await create_test_user(db_session, "admin-investor@test.com", role="admin")
        seeker = await create_test_user(db_session, "seeker-investor@test.com")
        host = await create_test_user(db_session, "host-investor@test.com")

        listing = Listing(
            host_id=host.id,
            title="Sunny room in SF",
            description="Walkable neighborhood near transit.",
            property_type="apartment",
            room_type="private_room",
            address_line1="123 Market St",
            address_line2=None,
            city="San Francisco",
            state="CA",
            zip_code="94103",
            latitude=37.7749,
            longitude=-122.4194,
            rent_monthly=180000,
            security_deposit=180000,
            utilities_included=True,
            utility_estimate=0,
            total_bedrooms=2,
            total_bathrooms=1.0,
            available_spots=1,
            current_occupants=1,
            amenities=[],
            house_rules=[],
            images=[],
            available_from=date.today(),
            available_until=None,
            lease_duration="12_months",
            nearest_transit="BART",
            transit_walk_mins=8,
            nearby_universities=[],
            is_verified=True,
            status="published",
        )
        db_session.add(listing)

        db_session.add(
            Expense(
                household_id=uuid.uuid4(),
                paid_by=seeker.id,
                description="Rent payment",
                amount=120000,
                category="rent",
                date=date.today(),
                status="paid",
            )
        )
        db_session.add(
            MatchInterest(
                from_user_id=seeker.id,
                to_listing_id=listing.id,
                status="accepted",
            )
        )

        await record_event(
            db_session,
            event_name="search_performed",
            user_id=seeker.id,
            source="web",
            occurred_at=datetime.now(timezone.utc),
            properties={"city": "San Francisco"},
        )
        await record_event(
            db_session,
            event_name="interest_sent",
            user_id=seeker.id,
            source="web",
            occurred_at=datetime.now(timezone.utc),
            properties={"city": "San Francisco"},
        )
        await db_session.commit()

        from app.utils.security import create_access_token
        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/metrics/investor-insights?days=180", headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert data["window_days"] == 180
        assert data["revenue"]["total_revenue_cents"] == 120000
        assert data["revenue"]["mrr_cents"] == 120000
        assert data["revenue"]["arpu_cents"] == 120000
        assert len(data["revenue"]["trend"]) == 1

        assert data["conversion"]["funnel"]["search_users"] == 1
        assert data["conversion"]["funnel"]["interest_users"] == 1
        assert data["conversion"]["funnel"]["close_users"] == 1
        assert data["conversion"]["search_to_interest_pct"] == 100.0
        assert data["conversion"]["interest_to_close_pct"] == 100.0

        sf_growth = next(row for row in data["geography"]["city_growth"] if row["city"] == "San Francisco")
        assert sf_growth["new_supply"] == 1
        assert sf_growth["new_demand"] >= 2
