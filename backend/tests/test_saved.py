import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.listing import Listing
from app.models.saved_listing import SavedListing

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

async def get_token(client, email="test@example.com"):
    await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "password123",
        "full_name": "Test User",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "password123",
    })
    return resp.json()["access_token"]

@pytest.mark.anyio
class TestSaved:
    async def test_save_listing(self, client):
        token = await get_token(client, email="saver@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create listing
        host_token = await get_token(client, email="host_saved@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Listing to save",
            "description": "This is a long enough description for the listing to be saved.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "555 Saved St",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "rent_monthly": 1500,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        listing_id = create_resp.json()["id"]
        
        # Save listing
        resp = await client.post(f"/api/v1/saved/listings/{listing_id}", headers=headers)
        assert resp.status_code == 201
        assert resp.json()["listing_id"] == listing_id
        
        # Get saved listing ids
        ids_resp = await client.get("/api/v1/saved/listings/ids", headers=headers)
        assert ids_resp.status_code == 200
        assert listing_id in ids_resp.json()

    async def test_compare_listings(self, client):
        token = await get_token(client, email="comparator@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create 2 listings
        host_token = await get_token(client, email="host_comp@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        
        l1 = await client.post("/api/v1/listings/", json={
            "title": "Listing One",
            "description": "Description for listing one, which is long enough.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "111 One St",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "rent_monthly": 1500,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        l1_id = l1.json()["id"]
        
        l2 = await client.post("/api/v1/listings/", json={
            "title": "Listing Two",
            "description": "Description for listing two, which is also long enough.",
            "property_type": "house",
            "room_type": "private_room",
            "address_line1": "222 Two St",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "rent_monthly": 1600,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        l2_id = l2.json()["id"]
        
        # Compare
        resp = await client.post("/api/v1/saved/listings/compare", json=[l1_id, l2_id], headers=headers)
        assert resp.status_code == 200
        items = resp.json()
        assert len(items) == 2
        assert any(i["title"] == "Listing One" for i in items)
        assert any(i["title"] == "Listing Two" for i in items)
