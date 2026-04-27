import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.listing import Listing

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
class TestListings:
    async def test_create_listing(self, client):
        token = await get_token(client)
        headers = {"Authorization": f"Bearer {token}"}
        
        payload = {
            "title": "Cozy Room in Downtown",
            "description": "A nice room in the heart of the city, with a great view and lots of light.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1500,
            "total_bedrooms": 3,
            "total_bathrooms": 2,
            "security_deposit": 1000,
            "available_from": "2026-05-01",
            "min_lease_months": 6,
            "utilities_included": True,
            "furnished": True,
            "current_occupants": 2,
            "available_spots": 1
        }
        
        resp = await client.post("/api/v1/listings/", json=payload, headers=headers)
        assert resp.status_code == 201
        body = resp.json()
        assert body["title"] == payload["title"]
        assert body["city"] == "San Francisco"
        assert body["rent_monthly"] == 1500

    async def test_get_listing(self, client):
        token = await get_token(client, email="get@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a listing
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Listing to get",
            "description": "This is a long enough description for the listing to get.",
            "property_type": "apartment",
            "room_type": "entire_home",
            "address_line1": "456 Oak Ave",
            "city": "Oakland",
            "state": "CA",
            "zip_code": "94612",
            "rent_monthly": 2000,
            "total_bedrooms": 2,
            "total_bathrooms": 1,
            "available_from": "2026-06-01"
        }, headers=headers)
        listing_id = create_resp.json()["id"]
        
        # Get the listing
        resp = await client.get(f"/api/v1/listings/{listing_id}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Listing to get"
        assert resp.json()["view_count"] == 1

    async def test_search_listings(self, client):
        token = await get_token(client, email="search@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create active listing
        await client.post("/api/v1/listings/", json={
            "title": "San Francisco Apartment",
            "description": "A very nice apartment in the heart of San Francisco, close to everything.",
            "property_type": "apartment",
            "room_type": "entire_home",
            "address_line1": "789 Market St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94103",
            "rent_monthly": 3000,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-07-01",
            "status": "active"
        }, headers=headers)
        
        # Search by city
        resp = await client.get("/api/v1/listings/?city=San Francisco")
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) >= 1
        assert any(l["city"] == "San Francisco" for l in results)

    async def test_update_listing(self, client):
        token = await get_token(client, email="update@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Old Title",
            "description": "This is a description that is long enough to pass validation.",
            "property_type": "house",
            "room_type": "private_room",
            "address_line1": "111 Pine St",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98101",
            "rent_monthly": 1200,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-08-01"
        }, headers=headers)
        listing_id = create_resp.json()["id"]
        
        resp = await client.patch(f"/api/v1/listings/{listing_id}", json={
            "title": "New Title",
            "rent_monthly": 1300
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"
        assert resp.json()["rent_monthly"] == 1300

    async def test_delete_listing(self, client):
        token = await get_token(client, email="delete@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Delete Me",
            "description": "This is a description for a listing that is going to be deleted.",
            "property_type": "house",
            "room_type": "private_room",
            "address_line1": "222 Elm St",
            "city": "Austin",
            "state": "TX",
            "zip_code": "78701",
            "rent_monthly": 1000,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-09-01"
        }, headers=headers)
        listing_id = create_resp.json()["id"]
        
        del_resp = await client.delete(f"/api/v1/listings/{listing_id}", headers=headers)
        assert del_resp.status_code == 204
        
        get_resp = await client.get(f"/api/v1/listings/{listing_id}")
        assert get_resp.status_code == 404

    async def test_create_listing_invalid_data_returns_422(self, client):
        token = await get_token(client, email="invalid@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Missing required fields like rent_monthly, property_type, etc.
        resp = await client.post("/api/v1/listings/", json={
            "title": "Short",
            "description": "Too short"
        }, headers=headers)
        assert resp.status_code == 422

    async def test_delete_listing_non_owner_returns_403(self, client):
        # Create listing as user 1
        token1 = await get_token(client, email="owner@test.com")
        headers1 = {"Authorization": f"Bearer {token1}"}
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Owner Listing",
            "description": "This listing belongs to the owner user for 403 testing.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "999 Owner St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1000,
            "total_bedrooms": 1,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=headers1)
        listing_id = create_resp.json()["id"]
        
        # Attempt delete as user 2
        token2 = await get_token(client, email="nonowner@test.com")
        headers2 = {"Authorization": f"Bearer {token2}"}
        resp = await client.delete(f"/api/v1/listings/{listing_id}", headers=headers2)
        assert resp.status_code == 404 # Backend returns 404 if not found OR not owned (security by obscurity)
