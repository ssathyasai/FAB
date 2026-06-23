from fastapi import APIRouter, HTTPException, Query, Depends
from models import (
    AssetAdvisorRequest, SavingAdvisorRequest, DebtAdvisorRequest,
    InvestmentAdvisorRequest, EmergencyAdvisorRequest
)
from ai_service import (
    get_budget_insights, get_asset_recommendations,
    get_saving_recommendations, get_debt_recommendations,
    get_investment_recommendations, get_emergency_recommendations
)
from database import get_db
from utils import current_month, serialize_doc, serialize_docs
from routers.auth import get_current_user
from datetime import datetime

router = APIRouter()


@router.get("/insights")
async def get_insights(current_user=Depends(get_current_user)):
    """AI Budget Insights for current month."""
    db = get_db()
    month = current_month()
    user_id = current_user["id"]

    income_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "income", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    expense_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    cat_pipeline = [
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": "$expense_category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}}, {"$limit": 3},
    ]
    cats = await db.transactions.aggregate(cat_pipeline).to_list(3)

    # Previous month
    from datetime import date
    d = date.today()
    pm = d.month - 1
    py = d.year
    if pm <= 0:
        pm += 12
        py -= 1
    prev_month = f"{py}-{pm:02d}"
    prev_exp = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": prev_month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)

    income = income_res[0]["total"] if income_res else 0
    expenses = expense_res[0]["total"] if expense_res else 0

    data = {
        "income": income,
        "expenses": expenses,
        "savings": income - expenses,
        "top_categories": [{"category": c["_id"], "amount": c["total"]} for c in cats if c["_id"]],
        "prev_month": {"expenses": prev_exp[0]["total"] if prev_exp else 0},
    }
    return await get_budget_insights(data)


@router.post("/asset")
async def asset_advisor(req: AssetAdvisorRequest):
    return await get_asset_recommendations(req.dict())


@router.post("/savings")
async def savings_advisor(req: SavingAdvisorRequest, current_user=Depends(get_current_user)):
    """Savings Advisor - uses user's transaction data"""
    db = get_db()
    month = current_month()
    user_id = current_user["id"]
    
    income_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "income", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    expense_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    income = income_res[0]["total"] if income_res else 0
    expenses = expense_res[0]["total"] if expense_res else 0

    data = req.dict()
    data["income"] = income
    data["expenses"] = expenses
    
    result = await get_saving_recommendations(data)
    return result


@router.post("/debt")
async def debt_advisor(req: DebtAdvisorRequest, current_user=Depends(get_current_user)):
    """Debt Advisor - uses income from user's settings"""
    import logging
    logger = logging.getLogger(__name__)
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get user's income from settings
    settings = await db.settings.find_one({"user_id": user_id})
    logger.info(f"[DEBT ADVISOR] User ID: {user_id}")
    logger.info(f"[DEBT ADVISOR] Settings found: {settings is not None}")
    
    if settings:
        income = settings.get("income_baseline", 0)
        logger.info(f"[DEBT ADVISOR] Income from settings: ₹{income:,}")
    else:
        income = 0
        logger.warning(f"[DEBT ADVISOR] No settings found for user {user_id}, using income=0")
    
    data = req.dict()
    data["income"] = income
    logger.info(f"[DEBT ADVISOR] Sending to AI - Income: ₹{income:,}, Loans: {len(data.get('loans', []))}")
    
    result = await get_debt_recommendations(data)
    return result


@router.post("/investment")
async def investment_advisor(req: InvestmentAdvisorRequest, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    
    data = req.dict()
    result = await get_investment_recommendations(data)
    return result


@router.post("/emergency")
async def emergency_advisor(req: EmergencyAdvisorRequest, current_user=Depends(get_current_user)):
    """Emergency Advisor - automatically includes user's income and expenses"""
    import logging
    logger = logging.getLogger(__name__)
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get user's income from settings
    settings = await db.settings.find_one({"user_id": user_id})
    income = settings.get("income_baseline", 0) if settings else 0
    savings = settings.get("bank_balance", 0) if settings else 0
    
    # Get user's monthly expenses from current month transactions
    from utils import current_month
    month = current_month()
    
    expense_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    
    monthly_expenses = expense_res[0]["total"] if expense_res else 0
    
    # Get user's assets
    assets = await db.assets.find({"user_id": user_id}).to_list(100)
    total_assets_value = sum(a.get("current_value", a.get("value", 0)) for a in assets)
    
    logger.info(f"[EMERGENCY ADVISOR] User: {user_id}, Income: ₹{income:,}, Expenses: ₹{monthly_expenses:,}, Savings: ₹{savings:,}, Assets Value: ₹{total_assets_value:,}")
    
    # Build request data
    data = req.dict()
    data["income"] = income
    data["monthly_expenses"] = monthly_expenses
    data["savings"] = savings
    data["assets"] = [{"name": a.get("name"), "type": a.get("asset_type"), "value": a.get("current_value", a.get("value", 0))} for a in assets]
    
    # Add user context to emergency details
    if "emergency_details" not in data:
        data["emergency_details"] = {}
    
    data["emergency_details"]["monthly_income"] = income
    data["emergency_details"]["monthly_expenses"] = monthly_expenses
    data["emergency_details"]["monthly_surplus"] = income - monthly_expenses if income > monthly_expenses else 0
    data["emergency_details"]["available_savings"] = savings
    data["emergency_details"]["total_assets_value"] = total_assets_value
    data["emergency_details"]["assets"] = data["assets"]
    
    logger.info(f"[EMERGENCY ADVISOR] Emergency Type: {data.get('emergency_type')}")
    
    result = await get_emergency_recommendations(data)
    return result


@router.get("/what-if")
async def what_if_analysis(
    salary_change: float = Query(default=0),
    rent_change: float = Query(default=0),
    discretionary_change: float = Query(default=0),
    all_expenses_change: float = Query(default=0),
    current_user=Depends(get_current_user)
):
    """What-If Analysis - uses user's transaction data"""
    db = get_db()
    month = current_month()
    user_id = current_user["id"]

    income_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "income", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    expense_res = await db.transactions.aggregate([
        {"$match": {"user_id": user_id, "month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)

    income = income_res[0]["total"] if income_res else 0
    expenses = expense_res[0]["total"] if expense_res else 0
    
    settings = await db.settings.find_one({"user_id": user_id})
    if income == 0 and settings:
        income = settings.get("income_baseline", 0)
        
    savings = income - expenses

    # Apply scenarios
    new_income = income * (1 + salary_change / 100)
    new_expenses = expenses

    if all_expenses_change != 0:
        new_expenses += expenses * (all_expenses_change / 100)

    if rent_change != 0:
        housing_res = await db.transactions.aggregate([
            {"$match": {"user_id": user_id, "month": month, "expense_category": "Housing", "status": "categorized"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(1)
        housing = housing_res[0]["total"] if housing_res else 0
        new_expenses += housing * (rent_change / 100)

    if discretionary_change != 0:
        disc_res = await db.transactions.aggregate([
            {"$match": {"user_id": user_id, "month": month, "expense_category": {"$in": ["Shopping", "Entertainment"]}, "status": "categorized"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(1)
        disc = disc_res[0]["total"] if disc_res else 0
        new_expenses += disc * (discretionary_change / 100)

    new_savings = new_income - new_expenses
    new_savings_rate = (new_savings / new_income * 100) if new_income > 0 else 0
    old_savings_rate = (savings / income * 100) if income > 0 else 0

    return {
        "before": {"income": income, "expenses": expenses, "savings": savings, "savings_rate": round(old_savings_rate, 1)},
        "after": {"income": new_income, "expenses": new_expenses, "savings": new_savings, "savings_rate": round(new_savings_rate, 1)},
        "savings_diff_monthly": round(new_savings - savings, 2),
        "savings_diff_annual": round((new_savings - savings) * 12, 2),
        "warning": new_savings_rate < 10,
    }

