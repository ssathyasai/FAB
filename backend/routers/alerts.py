from fastapi import APIRouter, Query, Depends
from database import get_db
from utils import serialize_docs, serialize_doc, current_month
from bson import ObjectId
from datetime import datetime
from routers.auth import get_current_user

router = APIRouter()


@router.get("/")
async def list_alerts(month: str = Query(default=None), dismissed: bool = Query(default=False), current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    query = {"user_id": user_id, "dismissed": dismissed}
    if month:
        query["month"] = month
    else:
        query["month"] = current_month()
    cursor = db.alerts.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=50)
    return {"alerts": serialize_docs(docs), "count": len(docs)}


@router.put("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id), "user_id": user_id},
        {"$set": {"dismissed": True}}
    )
    return {"success": True}


@router.post("/check")
async def run_alert_checks(current_user=Depends(get_current_user)):
    """Run all alert checks for current month."""
    db = get_db()
    user_id = current_user["id"]
    month = current_month()
    alerts_created = []

    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})

    # 1. Budget exceeded / warning
    if budget_doc:
        for cat in budget_doc.get("categories", []):
            if cat["name"] == "Savings":
                continue
            spent = cat["spent"]
            allocated = cat["allocated"]
            pct = (spent / allocated * 100) if allocated > 0 else 0

            if pct >= 100:
                await _upsert_alert(db, user_id, month, "budget_exceeded", "critical",
                    f"{cat['name']} Budget Exceeded",
                    f"You've exceeded your {cat['name']} budget by ₹{spent - allocated:,.0f}",
                    f"Your savings this month reduced by ₹{spent - allocated:,.0f}",
                    cat["name"])
                alerts_created.append(f"{cat['name']} exceeded")
            elif pct >= 80:
                await _upsert_alert(db, user_id, month, "budget_warning", "warning",
                    f"{cat['name']} at {pct:.0f}%",
                    f"{cat['name']} budget is {pct:.0f}% used",
                    "Consider reducing spending in this category",
                    cat["name"])

    # 2. No income recorded by 10th
    from datetime import date
    today = date.today()
    if today.day >= 10:
        income_count = await db.transactions.count_documents({
            "user_id": user_id, "month": month, "category_type": "income", "status": "categorized"
        })
        if income_count == 0:
            await _upsert_alert(db, user_id, month, "no_income", "warning",
                "No Income Recorded",
                "No income transactions recorded this month",
                "Record your salary/income transactions", None)
            alerts_created.append("no_income")

    # 3. Unusual spending (transaction > 20% of category budget)
    pipeline = [
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
    ]
    txns = await db.transactions.aggregate(pipeline).to_list(200)
    if budget_doc:
        cat_budgets = {c["name"]: c["allocated"] for c in budget_doc.get("categories", [])}
        for tx in txns:
            cat = tx.get("expense_category")
            amount = tx.get("amount", 0)
            if cat and cat in cat_budgets:
                if amount > 0.2 * cat_budgets[cat]:
                    await _upsert_alert(db, user_id, month, "unusual_spending", "warning",
                        f"Large {cat} Transaction",
                        f"₹{amount:,.0f} transaction is >20% of your {cat} budget",
                        "Review if this is expected spending", cat)

    return {"alerts_created": alerts_created, "month": month}


async def _upsert_alert(db, user_id, month, alert_type, severity, title, message, impact=None, category=None):
    existing = await db.alerts.find_one({
        "user_id": user_id, "month": month, "alert_type": alert_type,
        "category": category, "dismissed": False
    })
    if not existing:
        await db.alerts.insert_one({
            "user_id": user_id,
            "alert_type": alert_type,
            "severity": severity,
            "title": title,
            "message": message,
            "impact": impact,
            "category": category,
            "dismissed": False,
            "created_at": datetime.utcnow(),
            "month": month,
        })
