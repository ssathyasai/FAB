from fastapi import APIRouter, HTTPException, Query, Depends
from database import get_db
from models import CategorizeRequest, TransactionStatus
from utils import serialize_doc, serialize_docs, current_month
from bson import ObjectId
from datetime import datetime
from routers.auth import get_current_user

router = APIRouter()


@router.get("/")
async def list_transactions(
    month: str = Query(default=None),
    status: str = Query(default=None),
    limit: int = Query(default=50),
    skip: int = Query(default=0),
    current_user=Depends(get_current_user)
):
    db = get_db()
    user_id = current_user["id"]
    query = {"user_id": user_id}
    if month:
        query["month"] = month
    if status:
        query["status"] = status

    cursor = db.transactions.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    total = await db.transactions.count_documents(query)
    return {"transactions": serialize_docs(docs), "total": total}


@router.get("/pending")
async def pending_transactions(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    cursor = db.transactions.find({"user_id": user_id, "status": "pending"}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return {"transactions": serialize_docs(docs), "count": len(docs)}


@router.get("/{tx_id}")
async def get_transaction(tx_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    doc = await db.transactions.find_one({"_id": ObjectId(tx_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize_doc(doc)


@router.put("/{tx_id}/categorize")
async def categorize_transaction(tx_id: str, req: CategorizeRequest, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    doc = await db.transactions.find_one({"_id": ObjectId(tx_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update = {
        "category_type": req.category_type,
        "expense_category": req.expense_category,
        "income_type": req.income_type,
        "note": req.note,
        "status": "categorized",
        "categorized_at": datetime.utcnow(),
    }
    await db.transactions.update_one({"_id": ObjectId(tx_id), "user_id": user_id}, {"$set": update})

    # Update budget spent if it's an expense
    if req.category_type == "expense" and req.expense_category:
        month = doc.get("month", current_month())
        await db.budgets.update_one(
            {"user_id": user_id, "month": month, "categories.name": req.expense_category},
            {"$inc": {"categories.$.spent": doc["amount"]}},
        )
        # Check if budget exceeded — create alert
        budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
        if budget_doc:
            for cat in budget_doc.get("categories", []):
                if cat["name"] == req.expense_category:
                    spent = cat["spent"] + doc["amount"]
                    allocated = cat["allocated"]
                    pct = (spent / allocated * 100) if allocated > 0 else 0
                    if pct >= 100:
                        await _create_alert(db, user_id, month, "budget_exceeded", "critical",
                            f"{req.expense_category} Budget Exceeded",
                            f"{req.expense_category} budget exceeded by ₹{spent - allocated:,.0f}",
                            req.expense_category)
                    elif pct >= 80:
                        await _create_alert(db, user_id, month, "budget_exceeded", "warning",
                            f"{req.expense_category} at 80%",
                            f"{req.expense_category} budget is {pct:.0f}% used",
                            req.expense_category)

    updated = await db.transactions.find_one({"_id": ObjectId(tx_id), "user_id": user_id})
    return serialize_doc(updated)


async def _create_alert(db, user_id, month, alert_type, severity, title, message, category=None):
    existing = await db.alerts.find_one(
        {"user_id": user_id, "month": month, "alert_type": alert_type, "category": category, "dismissed": False}
    )
    if not existing:
        await db.alerts.insert_one({
            "user_id": user_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "category": category,
            "dismissed": False,
            "created_at": datetime.utcnow(),
            "month": month,
        })


@router.delete("/{tx_id}")
async def delete_transaction(tx_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    result = await db.transactions.delete_one({"_id": ObjectId(tx_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"success": True}
