from fastapi import APIRouter, Query, Depends
from database import get_db
from utils import current_month, days_elapsed, days_remaining, serialize_docs
from health_score import calculate_health_score
from datetime import datetime, timedelta
from routers.auth import get_current_user

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(current_user=Depends(get_current_user)):
    db = get_db()
    month = current_month()
    user_id = current_user["id"]

    # --- Income & Expenses ---
    pipeline_income = [
        {"$match": {"user_id": user_id, "month": month, "category_type": "income", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    pipeline_expense = [
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]

    income_res = await db.transactions.aggregate(pipeline_income).to_list(1)
    expense_res = await db.transactions.aggregate(pipeline_expense).to_list(1)

    income = income_res[0]["total"] if income_res else 0
    expenses = expense_res[0]["total"] if expense_res else 0
    savings = income - expenses

    # --- Bank Balance ---
    # Get from database settings for this user
    settings = await db.settings.find_one({"user_id": user_id})
    balance = settings.get("bank_balance", 0) if settings else 0

    # --- Budget & Health Score ---
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    income_type = settings.get("income_type", "fixed") if settings else "fixed"

    categories_within = 0
    total_categories = 0
    budget_status = []

    if budget_doc:
        for cat in budget_doc.get("categories", []):
            if cat["name"] == "Savings":
                continue
            total_categories += 1
            spent = cat["spent"]
            allocated = cat["allocated"]
            pct = (spent / allocated * 100) if allocated > 0 else 0
            if pct <= 100:
                categories_within += 1
            budget_status.append({
                "name": cat["name"],
                "allocated": allocated,
                "spent": spent,
                "percentage": round(pct, 1),
                "status": "exceeded" if pct > 100 else ("warning" if pct > 80 else "ok"),
            })

    health = calculate_health_score(
        income, expenses, savings, income_type,
        categories_within, total_categories
    )

    # --- 6-month bar chart data ---
    six_months = []
    for i in range(5, -1, -1):
        from datetime import date
        d = date.today()
        m = d.month - i
        y = d.year
        while m <= 0:
            m += 12
            y -= 1
        label = f"{y}-{m:02d}"
        inc_r = await db.transactions.aggregate([
            {"$match": {"user_id": user_id, "month": label, "category_type": "income", "status": "categorized"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(1)
        exp_r = await db.transactions.aggregate([
            {"$match": {"user_id": user_id, "month": label, "category_type": "expense", "status": "categorized"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(1)
        six_months.append({
            "month": label,
            "income": inc_r[0]["total"] if inc_r else 0,
            "expenses": exp_r[0]["total"] if exp_r else 0,
        })

    # --- Donut chart: expense by category ---
    cat_pipeline = [
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": "$expense_category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
    ]
    cat_breakdown = await db.transactions.aggregate(cat_pipeline).to_list(20)

    # --- Daily spending trend ---
    daily_pipeline = [
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"_id": 1}},
    ]
    daily_raw = await db.transactions.aggregate(daily_pipeline).to_list(31)

    # Cumulative daily
    cumulative = 0
    daily_trend = []
    for d in daily_raw:
        cumulative += d["total"]
        daily_trend.append({"date": d["_id"], "amount": cumulative})

    # Budget limit line
    budget_limit = budget_doc["income_baseline"] * 0.8 if budget_doc else 0

    # Top expense categories
    top_categories = [{"category": c["_id"], "amount": c["total"]} for c in cat_breakdown[:3] if c["_id"]]

    # --- Asset Portfolio Summary ---
    assets_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_current": {"$sum": "$current_value"},
            "total_purchase": {"$sum": "$purchase_value"},
            "count": {"$sum": 1}
        }}
    ]
    assets_res = await db.assets.aggregate(assets_pipeline).to_list(1)
    
    assets_summary = None
    if assets_res:
        total_current = assets_res[0].get("total_current", 0)
        total_purchase = assets_res[0].get("total_purchase", 0)
        gain_loss = total_current - total_purchase
        assets_summary = {
            "total_assets": assets_res[0].get("count", 0),
            "total_value": total_current,
            "total_gain_loss": gain_loss,
            "gain_loss_pct": round((gain_loss / total_purchase * 100), 1) if total_purchase > 0 else 0
        }

    # --- Piggy Bank Summary ---
    piggy_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_saved": {"$sum": "$current_amount"},
            "count": {"$sum": 1}
        }}
    ]
    piggy_res = await db.piggy_banks.aggregate(piggy_pipeline).to_list(1)
    
    piggy_summary = None
    if piggy_res:
        piggy_summary = {
            "total_banks": piggy_res[0].get("count", 0),
            "total_saved": piggy_res[0].get("total_saved", 0)
        }

    return {
        "balance": balance,
        "income": income,
        "expenses": expenses,
        "savings": savings,
        "savings_pct": round((savings / income * 100), 1) if income > 0 else 0,
        "health_score": health,
        "budget_status": budget_status,
        "six_month_chart": six_months,
        "expense_breakdown": [{"category": c["_id"], "amount": c["total"]} for c in cat_breakdown if c["_id"]],
        "daily_trend": daily_trend,
        "budget_limit": budget_limit,
        "top_categories": top_categories,
        "assets_summary": assets_summary,
        "piggy_bank_summary": piggy_summary,
        "month": month,
        "days_remaining": days_remaining(month),
        "days_elapsed": days_elapsed(month),
    }


@router.get("/leak-detector")
async def leak_detector(current_user=Depends(get_current_user)):
    """Detect recurring small expenses."""
    db = get_db()
    user_id = current_user["id"]
    pipeline = [
        {"$match": {"user_id": user_id, "category_type": "expense", "status": "categorized", "note": {"$ne": None, "$ne": ""}, "amount": {"$lt": 1000}}},
        {"$group": {
            "_id": "$note",
            "count": {"$sum": 1},
            "total": {"$sum": "$amount"},
            "avg": {"$avg": "$amount"},
            "category": {"$first": "$expense_category"},
        }},
        {"$match": {"count": {"$gte": 3}}},
        {"$sort": {"total": -1}},
    ]
    leaks = await db.transactions.aggregate(pipeline).to_list(20)
    result = []
    total_monthly = 0
    for l in leaks:
        monthly = l["total"]
        annual = monthly * 12
        total_monthly += monthly
        result.append({
            "name": l["_id"],
            "category": l.get("category", "Others"),
            "avg_amount": round(l["avg"], 2),
            "times_per_month": l["count"],
            "monthly_cost": round(monthly, 2),
            "annual_cost": round(annual, 2),
            "save_per_year": round(annual, 2),
        })
    return {
        "leaks": result,
        "total_monthly_drain": round(total_monthly, 2),
        "total_annual_drain": round(total_monthly * 12, 2),
    }
