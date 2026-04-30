import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.household import Household
from app.models.chat import ChatMessage, ChatRoom
from app.models.listing import Listing
from app.models.match import MatchInterest
from app.models.user import User
from app.utils.security import create_access_token


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


async def create_test_user(db: AsyncSession, email: str, role: str = "user", status: str = "active"):
    user = User(
        email=email,
        password_hash="hashed",
        full_name="Test User",
        role=role,
        status=status,
    )
    db.add(user)
    await db.commit()
    return user


async def create_test_listing(db: AsyncSession, host_id, title: str, city: str, status: str = "active"):
    listing = Listing(
        host_id=host_id,
        title=title,
        description="desc",
        property_type="apartment",
        room_type="private",
        address_line1="123 Main St",
        city=city,
        state="CA",
        zip_code="94105",
        rent_monthly=1200,
        total_bedrooms=2,
        total_bathrooms=1.0,
        available_from=date.today(),
        status=status,
        view_count=11,
    )
    db.add(listing)
    await db.commit()
    return listing


@pytest.mark.anyio
class TestAdminManagement:
    async def test_non_admin_cannot_access(self, client, db_session):
        user = await create_test_user(db_session, "user1@test.com", role="user")
        token = create_access_token({"sub": str(user.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/users", headers=headers)
        assert resp.status_code == 403

    async def test_admin_can_list_and_filter_users(self, client, db_session):
        admin = await create_test_user(db_session, "admin@test.com", role="admin")
        await create_test_user(db_session, "alice@test.com", role="user", status="active")
        await create_test_user(db_session, "bob@test.com", role="member", status="inactive")

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/users?role=member&status=inactive", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["email"] == "bob@test.com"

    async def test_admin_can_get_user_detail(self, client, db_session):
        admin = await create_test_user(db_session, "admin2@test.com", role="admin")
        target = await create_test_user(db_session, "target@test.com", role="user")

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get(f"/api/v1/admin/users/{target.id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "target@test.com"

    async def test_admin_can_update_user_role_and_status(self, client, db_session):
        admin = await create_test_user(db_session, "admin3@test.com", role="admin")
        target = await create_test_user(db_session, "target2@test.com", role="user", status="active")

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.patch(
            f"/api/v1/admin/users/{target.id}",
            headers=headers,
            json={"role": "member", "status": "suspended"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "member"
        assert data["status"] == "suspended"

        result = await db_session.execute(select(User).where(User.id == target.id))
        reloaded = result.scalar_one()
        assert reloaded.role == "member"
        assert reloaded.status == "suspended"

    async def test_admin_cannot_remove_own_access(self, client, db_session):
        admin = await create_test_user(db_session, "admin4@test.com", role="admin")
        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.patch(
            f"/api/v1/admin/users/{admin.id}",
            headers=headers,
            json={"role": "user"},
        )
        assert resp.status_code == 400
        assert "cannot remove own" in resp.json()["error"]["message"].lower()

    async def test_admin_can_list_listings_with_metrics(self, client, db_session):
        admin = await create_test_user(db_session, "admin5@test.com", role="admin")
        host = await create_test_user(db_session, "host@test.com", role="user")
        seeker = await create_test_user(db_session, "seeker@test.com", role="user")
        listing = await create_test_listing(db_session, host.id, "Sunny Room", "San Francisco", status="active")

        db_session.add(MatchInterest(from_user_id=seeker.id, to_listing_id=listing.id, status="interested"))
        await db_session.commit()

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/listings?status=active", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        row = data["items"][0]
        assert row["city"] == "San Francisco"
        assert row["metrics"]["interest_count"] == 1
        assert row["metrics"]["view_count"] == 11

    async def test_admin_can_list_households_with_member_counts(self, client, db_session):
        admin = await create_test_user(db_session, "admin6@test.com", role="admin")
        owner = await create_test_user(db_session, "owner@test.com", role="user")

        household = Household(name="H1", admin_id=owner.id, status="active")
        db_session.add(household)
        await db_session.flush()
        owner.household_id = household.id
        db_session.add(owner)
        await db_session.commit()

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/households?status=active", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        row = data["items"][0]
        assert row["member_count"] >= 1
        assert row["feature_status"]["is_active"] is True

    async def test_admin_can_list_interests(self, client, db_session):
        admin = await create_test_user(db_session, "admin7@test.com", role="admin")
        host = await create_test_user(db_session, "host2@test.com", role="user")
        seeker = await create_test_user(db_session, "seeker2@test.com", role="user")
        listing = await create_test_listing(db_session, host.id, "Oak Room", "San Jose", status="active")
        db_session.add(
            MatchInterest(
                from_user_id=seeker.id,
                to_listing_id=listing.id,
                status="interested",
                message="Interested in this listing.",
            )
        )
        await db_session.commit()

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/interests?status=interested", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        row = data["items"][0]
        assert row["status"] == "interested"
        assert row["from_user"]["id"] == str(seeker.id)
        assert row["to_listing"]["id"] == str(listing.id)

    async def test_admin_can_list_messages(self, client, db_session):
        admin = await create_test_user(db_session, "admin8@test.com", role="admin")
        user_a = await create_test_user(db_session, "chata@test.com", role="user")
        user_b = await create_test_user(db_session, "chatb@test.com", role="user")
        listing = await create_test_listing(db_session, user_a.id, "Elm Room", "San Mateo", status="active")

        room = ChatRoom(
            listing_id=listing.id,
            user_a_id=user_a.id,
            user_b_id=user_b.id,
            status="active",
        )
        db_session.add(room)
        await db_session.flush()
        db_session.add(
            ChatMessage(
                room_id=room.id,
                sender_id=user_a.id,
                body="Hello there",
            )
        )
        await db_session.commit()

        token = create_access_token({"sub": str(admin.id)})
        headers = {"Authorization": f"Bearer {token}"}

        resp = await client.get("/api/v1/admin/messages?status=active", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        row = data["items"][0]
        assert row["status"] == "active"
        assert row["user_a"]["id"] == str(user_a.id)
        assert row["user_b"]["id"] == str(user_b.id)
        assert row["last_message"] == "Hello there"
