import uuid
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.expense import Expense, ExpenseSplit
from app.models.user import User
from app.schemas.expense import BalanceResponse, ExpenseCreate, ExpenseResponse, ExpenseSplitResponse
from app.utils.s3 import generate_presigned_upload_url, generate_presigned_download_url

router = APIRouter()


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    category: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    query = select(Expense).where(Expense.household_id == current_user.household_id)
    if category:
        query = query.where(Expense.category == category)

    query = query.order_by(Expense.date.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    expense = Expense(
        household_id=current_user.household_id,
        paid_by=current_user.id,
        **data.model_dump(),
    )
    db.add(expense)
    await db.flush()

    # Create splits
    members_result = await db.execute(
        select(User).where(User.household_id == current_user.household_id)
    )
    members = list(members_result.scalars().all())

    if data.split_type == "equal":
        per_person = data.amount // len(members)
        for member in members:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=member.id,
                amount_owed=per_person,
                status="paid" if member.id == current_user.id else "pending",
                paid_at=datetime.now(timezone.utc) if member.id == current_user.id else None,
            )
            db.add(split)
    elif data.split_type == "exact" and data.split_details:
        for user_id_str, amount in data.split_details.items():
            uid = uuid.UUID(user_id_str)
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=uid,
                amount_owed=int(amount),
                status="paid" if uid == current_user.id else "pending",
                paid_at=datetime.now(timezone.utc) if uid == current_user.id else None,
            )
            db.add(split)

    await db.flush()
    await db.refresh(expense)
    return expense


@router.get("/my-splits")
async def get_my_splits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns all expense splits for the current user with expense details."""
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    splits_result = await db.execute(
        select(ExpenseSplit).where(ExpenseSplit.user_id == current_user.id)
    )
    splits = list(splits_result.scalars().all())

    expense_ids = list({s.expense_id for s in splits})
    if not expense_ids:
        return []

    expenses_result = await db.execute(
        select(Expense).where(Expense.id.in_(expense_ids))
    )
    expenses = {e.id: e for e in expenses_result.scalars().all()}

    # Get payer names
    payer_ids = list({e.paid_by for e in expenses.values()})
    payers_result = await db.execute(select(User).where(User.id.in_(payer_ids)))
    payers = {u.id: u.full_name for u in payers_result.scalars().all()}

    return [
        {
            "split_id": str(s.id),
            "expense_id": str(s.expense_id),
            "description": expenses[s.expense_id].description if s.expense_id in expenses else "",
            "category": expenses[s.expense_id].category if s.expense_id in expenses else "",
            "date": str(expenses[s.expense_id].date) if s.expense_id in expenses else "",
            "total_amount": expenses[s.expense_id].amount if s.expense_id in expenses else 0,
            "paid_by_name": payers.get(expenses[s.expense_id].paid_by, "Unknown") if s.expense_id in expenses else "Unknown",
            "paid_by_id": str(expenses[s.expense_id].paid_by) if s.expense_id in expenses else None,
            "amount_owed": s.amount_owed,
            "status": s.status,
        }
        for s in splits
    ]


@router.get("/balances", response_model=list[BalanceResponse])
async def get_balances(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    members_result = await db.execute(
        select(User).where(User.household_id == current_user.household_id)
    )
    members = {m.id: m for m in members_result.scalars().all()}

    expenses_result = await db.execute(
        select(Expense).where(Expense.household_id == current_user.household_id)
    )
    expenses = list(expenses_result.scalars().all())

    if not expenses:
        return [
            BalanceResponse(user_id=uid, full_name=m.full_name, net_balance=0)
            for uid, m in members.items()
        ]

    splits_result = await db.execute(
        select(ExpenseSplit).where(
            ExpenseSplit.expense_id.in_([e.id for e in expenses])
        )
    )
    splits = list(splits_result.scalars().all())

    # Calculate net balances
    balances: dict[uuid.UUID, int] = defaultdict(int)
    for expense in expenses:
        balances[expense.paid_by] += expense.amount

    for split in splits:
        balances[split.user_id] -= split.amount_owed

    return [
        BalanceResponse(
            user_id=uid,
            full_name=members[uid].full_name if uid in members else "Unknown",
            net_balance=balance,
        )
        for uid, balance in balances.items()
    ]


@router.get("/summary")
async def get_expense_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Household expense summary: total balance and per-member breakdown."""
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    members_result = await db.execute(
        select(User).where(User.household_id == current_user.household_id)
    )
    members = {m.id: m for m in members_result.scalars().all()}

    expenses_result = await db.execute(
        select(Expense).where(Expense.household_id == current_user.household_id)
    )
    expenses = list(expenses_result.scalars().all())

    if not expenses:
        return {
            "total_balance": 0,
            "breakdown_per_member": [
                {"user_id": str(uid), "full_name": m.full_name, "net_balance": 0, "pending_amount": 0}
                for uid, m in members.items()
            ],
        }

    splits_result = await db.execute(
        select(ExpenseSplit).where(ExpenseSplit.expense_id.in_([e.id for e in expenses]))
    )
    splits = list(splits_result.scalars().all())

    net: dict[uuid.UUID, int] = defaultdict(int)
    pending: dict[uuid.UUID, int] = defaultdict(int)

    for expense in expenses:
        net[expense.paid_by] += expense.amount

    for split in splits:
        net[split.user_id] -= split.amount_owed
        if split.status == "pending":
            pending[split.user_id] += split.amount_owed

    total_balance = sum(abs(v) for v in net.values()) // 2

    breakdown = [
        {
            "user_id": str(uid),
            "full_name": members[uid].full_name if uid in members else "Unknown",
            "net_balance": net.get(uid, 0),
            "pending_amount": pending.get(uid, 0),
        }
        for uid in members
    ]

    return {"total_balance": total_balance, "breakdown_per_member": breakdown}


@router.post("/{expense_id}/settle")
async def settle_split(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExpenseSplit).where(
            and_(ExpenseSplit.expense_id == expense_id, ExpenseSplit.user_id == current_user.id)
        )
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Split not found")

    split.status = "paid"
    split.paid_at = datetime.now(timezone.utc)
    return {"status": "settled"}


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Expense).where(
            and_(Expense.id == expense_id, Expense.household_id == current_user.household_id)
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    return expense


# ─── UH-502: Receipt Upload ───────────────────────────────────────────────────

class ReceiptUploadRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"


@router.post("/{expense_id}/receipt-upload-url")
async def get_receipt_upload_url(
    expense_id: uuid.UUID,
    data: ReceiptUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a presigned S3 PUT URL for uploading an expense receipt."""
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    result = await db.execute(
        select(Expense).where(
            and_(Expense.id == expense_id, Expense.household_id == current_user.household_id)
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    s3_key = f"receipts/{current_user.household_id}/{expense_id}/{data.filename}"
    try:
        upload_url = generate_presigned_upload_url(s3_key, data.content_type)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")

    return {"upload_url": upload_url, "s3_key": s3_key}


@router.patch("/{expense_id}/receipt")
async def attach_receipt(
    expense_id: uuid.UUID,
    s3_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """After uploading to S3, call this to save the receipt key on the expense."""
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    expected_prefix = f"receipts/{current_user.household_id}/{expense_id}/"
    if not s3_key.startswith(expected_prefix):
        raise HTTPException(status_code=400, detail="Invalid S3 key for this expense")

    result = await db.execute(
        select(Expense).where(
            and_(Expense.id == expense_id, Expense.household_id == current_user.household_id)
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    expense.receipt_url = s3_key
    await db.flush()
    return {"status": "updated", "receipt_key": s3_key}


@router.get("/{expense_id}/receipt-url")
async def get_receipt_url(
    expense_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a short-lived presigned download URL for an expense receipt."""
    if not current_user.household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a household")

    result = await db.execute(
        select(Expense).where(
            and_(Expense.id == expense_id, Expense.household_id == current_user.household_id)
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    if not expense.receipt_url:
        raise HTTPException(status_code=404, detail="No receipt attached to this expense")

    try:
        url = generate_presigned_download_url(expense.receipt_url)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to generate receipt URL")

    return {"url": url, "expires_in_seconds": 900}
