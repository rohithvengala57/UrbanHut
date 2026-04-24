import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    amount: int = Field(gt=0)
    category: str
    split_type: str = "equal"
    split_details: dict | None = None
    date: date
    is_recurring: bool = False
    recurrence: str | None = None


class ExpenseUpdate(BaseModel):
    description: str | None = None
    amount: int | None = None
    category: str | None = None
    split_type: str | None = None
    split_details: dict | None = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    household_id: uuid.UUID
    paid_by: uuid.UUID
    description: str
    amount: int
    category: str
    split_type: str
    split_details: dict | None = None
    receipt_url: str | None = None
    date: date
    is_recurring: bool
    recurrence: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseSplitResponse(BaseModel):
    id: uuid.UUID
    expense_id: uuid.UUID
    user_id: uuid.UUID
    amount_owed: int
    paid_at: datetime | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BalanceResponse(BaseModel):
    user_id: uuid.UUID
    full_name: str
    net_balance: int  # positive = owed money, negative = owes money
