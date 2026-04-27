import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.listing import Listing
from app.models.match import MatchInterest

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
class TestMatching:
    async def test_get_recommendations(self, client):
        token = await get_token(client, email="seeker@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a listing from another user
        host_token = await get_token(client, email="host@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        await client.post("/api/v1/listings/", json={
            "title": "Available Room",
            "description": "This is a very nice room that is available for someone to move in.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "100 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1500,
            "total_bedrooms": 2,
            "total_bathrooms": 1,
            "available_from": "2026-05-01",
            "status": "active"
        }, headers=host_headers)
        
        resp = await client.get("/api/v1/matching/recommendations", headers=headers)
        assert resp.status_code == 200
        recs = resp.json()
        assert len(recs) >= 1
        assert recs[0]["title"] == "Available Room"

    async def test_express_interest(self, client):
        token = await get_token(client, email="interested@test.com")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create listing
        host_token = await get_token(client, email="host2@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Room 2",
            "description": "Another great room for someone looking for a place in SF.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "200 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1600,
            "total_bedrooms": 2,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        listing_id = create_resp.json()["id"]
        
        # Express interest
        resp = await client.post("/api/v1/matching/interest", json={
            "to_listing_id": listing_id,
            "message": "Hi, I'm interested!"
        }, headers=headers)
        assert resp.status_code == 201
        assert resp.json()["status"] == "interested"

    async def test_update_interest_status(self, client):
        seeker_token = await get_token(client, email="seeker3@test.com")
        seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
        
        host_token = await get_token(client, email="host3@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Room 3",
            "description": "The third room in our test suite, perfectly located.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "300 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1700,
            "total_bedrooms": 2,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        listing_id = create_resp.json()["id"]
        
        # Express interest
        interest_resp = await client.post("/api/v1/matching/interest", json={
            "to_listing_id": listing_id
        }, headers=seeker_headers)
        interest_id = interest_resp.json()["id"]
        
        # Host shortlists
        patch_resp = await client.patch(f"/api/v1/matching/interest/{interest_id}", json={
            "status": "shortlisted"
        }, headers=host_headers)
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "shortlisted"
        
        # Host accepts
        patch_resp = await client.patch(f"/api/v1/matching/interest/{interest_id}", json={
            "status": "accepted"
        }, headers=host_headers)
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "accepted"

    async def test_invalid_status_transition(self, client):
        seeker_token = await get_token(client, email="seeker4@test.com")
        seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
        
        host_token = await get_token(client, email="host4@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Room 4",
            "description": "Room 4 is also a great option for testing purposes.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "400 Main St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1800,
            "total_bedrooms": 2,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        listing_id = create_resp.json()["id"]
        
        interest_resp = await client.post("/api/v1/matching/interest", json={
            "to_listing_id": listing_id
        }, headers=seeker_headers)
        interest_id = interest_resp.json()["id"]
        
        # Try to jump to mutual (invalid from interested)
        patch_resp = await client.patch(f"/api/v1/matching/interest/{interest_id}", json={
            "status": "mutual"
        }, headers=host_headers)
        assert patch_resp.status_code == 400

    async def test_mutual_match_detection(self, client):
        seeker_token = await get_token(client, email="seeker_mutual@test.com")
        seeker_headers = {"Authorization": f"Bearer {seeker_token}"}
        
        host_token = await get_token(client, email="host_mutual@test.com")
        host_headers = {"Authorization": f"Bearer {host_token}"}
        
        create_resp = await client.post("/api/v1/listings/", json={
            "title": "Mutual Room",
            "description": "Room for mutual match testing, located in a nice area.",
            "property_type": "apartment",
            "room_type": "private_room",
            "address_line1": "555 Mutual St",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "rent_monthly": 1900,
            "total_bedrooms": 2,
            "total_bathrooms": 1,
            "available_from": "2026-05-01"
        }, headers=host_headers)
        listing_id = create_resp.json()["id"]
        
        # Seeker expresses interest
        interest_resp = await client.post("/api/v1/matching/interest", json={
            "to_listing_id": listing_id
        }, headers=seeker_headers)
        interest_id = interest_resp.json()["id"]
        
        # Host accepts seeker's interest
        # In the actual implementation, PATCH /listings/{listing_id}/interests/{interest_id} 
        # handles the "mutual" logic if the seeker already expressed interest.
        # Let's check matching.py logic for update_interest.
        
        resp = await client.patch(f"/api/v1/listings/{listing_id}/interests/{interest_id}", json={
            "status": "accepted"
        }, headers=host_headers)
        assert resp.status_code == 200
        # If the seeker is already interested, it should become mutual
        assert resp.json()["status"] == "mutual"
