import pytest
import pytest_asyncio
import uuid
from datetime import date
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.household import Household
from app.models.expense import Expense, ExpenseSplit

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

async def get_token(client, email="test@example.com", name="Test User"):
    await client.post("/api/v1/auth/signup", json={
        "email": email,
        "password": "password123",
        "full_name": name,
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "password123",
    })
    return resp.json()["access_token"]

@pytest.mark.anyio
class TestExpenses:
    async def test_create_expense_equal_split(self, client):
        # Setup: Create household with 2 members
        token1 = await get_token(client, email="user1@test.com", name="User One")
        headers1 = {"Authorization": f"Bearer {token1}"}
        
        hh_resp = await client.post("/api/v1/households/", json={"name": "Test Home"}, headers=headers1)
        invite_code = hh_resp.json()["invite_code"]
        
        token2 = await get_token(client, email="user2@test.com", name="User Two")
        headers2 = {"Authorization": f"Bearer {token2}"}
        await client.post("/api/v1/households/join", json={"invite_code": invite_code}, headers=headers2)
        
        # Create expense
        expense_data = {
            "description": "Groceries",
            "amount": 4000, # $40.00
            "category": "food",
            "date": str(date.today()),
            "split_type": "equal"
        }
        resp = await client.post("/api/v1/expenses/", json=expense_data, headers=headers1)
        assert resp.status_code == 201
        body = resp.json()
        assert body["amount"] == 4000
        assert body["paid_by"] is not None
        
        # Check splits
        splits_resp = await client.get("/api/v1/expenses/my-splits", headers=headers2)
        assert splits_resp.status_code == 200
        my_splits = splits_resp.json()
        assert len(my_splits) == 1
        assert my_splits[0]["amount_owed"] == 2000
        assert my_splits[0]["status"] == "pending"

    async def test_get_balances(self, client):
        token1 = await get_token(client, email="b1@test.com", name="B1")
        headers1 = {"Authorization": f"Bearer {token1}"}
        hh_resp = await client.post("/api/v1/households/", json={"name": "Balance Home"}, headers=headers1)
        invite_code = hh_resp.json()["invite_code"]
        
        token2 = await get_token(client, email="b2@test.com", name="B2")
        headers2 = {"Authorization": f"Bearer {token2}"}
        await client.post("/api/v1/households/join", json={"invite_code": invite_code}, headers=headers2)
        
        # User 1 pays $60
        await client.post("/api/v1/expenses/", json={
            "description": "Internet",
            "amount": 6000,
            "category": "utilities",
            "date": str(date.today()),
            "split_type": "equal"
        }, headers=headers1)
        
        resp = await client.get("/api/v1/expenses/balances", headers=headers1)
        assert resp.status_code == 200
        balances = resp.json()
        # B1 paid 60, owes 30 -> net +30
        # B2 paid 0, owes 30 -> net -30
        b1_bal = next(b for b in balances if b["full_name"] == "B1")
        b2_bal = next(b for b in balances if b["full_name"] == "B2")
        assert b1_bal["net_balance"] == 3000
        assert b2_bal["net_balance"] == -3000

    async def test_settle_expense(self, client):
        token1 = await get_token(client, email="s1@test.com", name="S1")
        headers1 = {"Authorization": f"Bearer {token1}"}
        hh_resp = await client.post("/api/v1/households/", json={"name": "Settle Home"}, headers=headers1)
        invite_code = hh_resp.json()["invite_code"]
        
        token2 = await get_token(client, email="s2@test.com", name="S2")
        headers2 = {"Authorization": f"Bearer {token2}"}
        await client.post("/api/v1/households/join", json={"invite_code": invite_code}, headers=headers2)
        
        create_resp = await client.post("/api/v1/expenses/", json={
            "description": "Cleaning supplies",
            "amount": 1000,
            "category": "household",
            "date": str(date.today()),
            "split_type": "equal"
        }, headers=headers1)
        expense_id = create_resp.json()["id"]
        
        # S2 settles
        settle_resp = await client.post(f"/api/v1/expenses/{expense_id}/settle", headers=headers2)
        assert settle_resp.status_code == 200
        
        # Check status
        summary_resp = await client.get("/api/v1/expenses/summary", headers=headers1)
        breakdown = summary_resp.json()["breakdown_per_member"]
        s2_summary = next(m for m in breakdown if m["full_name"] == "S2")
        assert s2_summary["pending_amount"] == 0
