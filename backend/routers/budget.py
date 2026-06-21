from fastapi import APIRouter, HTTPException, Query, Depends
from database import get_db
from models import BudgetSetupRequest
from utils import serialize_doc, serialize_docs, current_month, days_in_month, days_elapsed, days_remaining
from datetime import datetime
from bson import ObjectId
from routers.auth import get_current_user

router = APIRouter()

DEFAULT_ALLOCATIONS = {
    "Housing": 25, "Food": 15, "Transport": 8, "Utilities": 5,
    "Healthcare": 5, "Education": 5, "Shopping": 8,
    "Entertainment": 4, "Others": 5, "Savings": 20,
}


@router.get("/defaults")
async def get_defaults():
    return {"allocations": DEFAULT_ALLOCATIONS}


@router.get("/current")
async def get_current_budget(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    month = current_month()
    doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    if not doc:
        return {"budget": None, "month": month}
    # Attach days info
    result = serialize_doc(doc)
    result["days_remaining"] = days_remaining(month)
    result["days_elapsed"] = days_elapsed(month)
    result["days_in_month"] = days_in_month(month)
    return {"budget": result, "month": month}


@router.get("/month/{month}")
async def get_budget_by_month(month: str, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    if not doc:
        raise HTTPException(status_code=404, detail="Budget not found for this month")
    return serialize_doc(doc)


@router.post("/setup")
async def setup_budget(req: BudgetSetupRequest, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    month = current_month()

    # Build categories list
    total_pct = sum(req.allocations.values())
    allocations = dict(req.allocations)

    # If total < 100, remainder goes to Savings
    remainder = 100 - total_pct
    if remainder > 0:
        allocations["Savings"] = allocations.get("Savings", 0) + remainder

    categories = []
    for name, pct in allocations.items():
        amount = (pct / 100) * req.income_baseline
        categories.append({
            "name": name,
            "allocated": round(amount, 2),
            "spent": 0.0,
            "percentage": pct,
        })

    budget_doc = {
        "user_id": user_id,
        "month": month,
        "income_baseline": req.income_baseline,
        "income_type": req.income_type,
        "categories": categories,
        "created_at": datetime.utcnow(),
        "rolled_over": False,
    }

    # Upsert
    await db.budgets.update_one(
        {"user_id": user_id, "month": month},
        {"$set": budget_doc},
        upsert=True
    )

    # Save user settings
    await db.settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "income_baseline": req.income_baseline,
            "income_type": req.income_type,
            "onboarding_complete": True,
        }},
        upsert=True
    )

    doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    return serialize_doc(doc)


@router.put("/category/{month}/{category_name}")
async def update_category_amount(month: str, category_name: str, body: dict, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    new_amount = body.get("allocated")
    if new_amount is None:
        raise HTTPException(status_code=400, detail="allocated amount required")

    await db.budgets.update_one(
        {"user_id": user_id, "month": month, "categories.name": category_name},
        {"$set": {"categories.$.allocated": new_amount}}
    )
    doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    return serialize_doc(doc)


@router.post("/rollover")
async def rollover_budget(current_user=Depends(get_current_user)):
    """Copy previous month budget to new month."""
    db = get_db()
    user_id = current_user["id"]
    month = current_month()

    # Check if current month already has budget
    existing = await db.budgets.find_one({"user_id": user_id, "month": month})
    if existing:
        return {"message": "Budget already exists for current month", "rolled_over": False}

    # Get previous month budget
    from datetime import date
    today = date.today()
    if today.month == 1:
        prev_month = f"{today.year - 1}-12"
    else:
        prev_month = f"{today.year}-{today.month - 1:02d}"

    prev_budget = await db.budgets.find_one({"user_id": user_id, "month": prev_month})
    if not prev_budget:
        return {"message": "No previous budget found to roll over", "rolled_over": False}

    # Reset spent to 0
    new_categories = []
    for cat in prev_budget.get("categories", []):
        new_categories.append({
            "name": cat["name"],
            "allocated": cat["allocated"],
            "spent": 0.0,
            "percentage": cat.get("percentage", 0),
        })

    new_budget = {
        "user_id": user_id,
        "month": month,
        "income_baseline": prev_budget["income_baseline"],
        "income_type": prev_budget.get("income_type", "fixed"),
        "categories": new_categories,
        "created_at": datetime.utcnow(),
        "rolled_over": True,
    }
    await db.budgets.insert_one(new_budget)
    doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    return {"message": "Budget rolled over successfully", "rolled_over": True, "budget": serialize_doc(doc)}


@router.get("/history")
async def budget_history(months: int = Query(default=6), current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    cursor = db.budgets.find({"user_id": user_id}).sort("month", -1).limit(months)
    docs = await cursor.to_list(length=months)
    return {"budgets": serialize_docs(docs)}


@router.get("/leak-detector")
async def leak_detector(current_user=Depends(get_current_user)):
    """Detect spending leaks - unnecessary or excessive expenses"""
    db = get_db()
    user_id = current_user["id"]
    month = current_month()
    
    # Get current budget and transactions
    budget = await db.budgets.find_one({"user_id": user_id, "month": month})
    transactions = await db.transactions.find({
        "user_id": user_id,
        "month": month,
        "transaction_type": "debit",
        "category_type": "expense"
    }).to_list(None)
    
    leaks = []
    
    if not transactions:
        return {"leaks": [], "total_potential_savings": 0}
    
    # Build category map from budget
    budget_map = {}
    if budget and "categories" in budget:
        for cat in budget["categories"]:
            budget_map[cat["name"]] = cat["allocated"]
    
    # Analyze spending patterns
    category_spending = {}
    for txn in transactions:
        cat = txn.get("expense_category", "Others")
        if cat not in category_spending:
            category_spending[cat] = []
        category_spending[cat].append(txn)
    
    # Check for various leak patterns
    for category, txns in category_spending.items():
        total = sum(t["amount"] for t in txns)
        allocated = budget_map.get(category, 0)
        
        # Leak 1: Over-budget spending
        if allocated > 0 and total > allocated * 1.2:  # 20% over
            leaks.append({
                "category": category,
                "issue": f"Overspending in {category}",
                "amount": total,
                "frequency": f"{len(txns)} transactions",
                "potential_savings": total - allocated,
                "recommendation": f"Reduce {category} spending to stay within budget of ₹{allocated:.0f}. Consider tracking each expense.",
                "severity": "high",
                "transactions": [serialize_doc(t) for t in txns[:5]]
            })
        
        # Leak 2: Frequent small transactions (subscription leak)
        if len(txns) > 15:  # More than 15 transactions in a month
            avg = total / len(txns)
            if avg < 500:  # Small transactions
                leaks.append({
                    "category": category,
                    "issue": f"Too many small {category} transactions",
                    "amount": total,
                    "frequency": f"{len(txns)} transactions (avg ₹{avg:.0f})",
                    "potential_savings": total * 0.15,  # Estimate 15% savings
                    "recommendation": "Review subscriptions and recurring payments. Cancel unused services. Consolidate purchases.",
                    "severity": "medium",
                    "transactions": [serialize_doc(t) for t in txns[:5]]
                })
        
        # Leak 3: High discretionary spending
        if category in ["Shopping", "Entertainment"] and total > 10000:
            leaks.append({
                "category": category,
                "issue": f"High {category} expenses",
                "amount": total,
                "frequency": f"{len(txns)} transactions",
                "potential_savings": total * 0.25,
                "recommendation": f"Set a weekly limit for {category}. Use cash instead of cards. Wait 24 hours before non-essential purchases.",
                "severity": "medium" if total < 20000 else "high",
                "transactions": [serialize_doc(t) for t in txns[:5]]
            })
    
    # Leak 4: Large uncategorized transactions
    uncategorized = [t for t in transactions if t.get("category_type") == "uncategorized"]
    if len(uncategorized) > 5:
        total_uncat = sum(t["amount"] for t in uncategorized)
        leaks.append({
            "category": "Uncategorized",
            "issue": "Many uncategorized expenses",
            "amount": total_uncat,
            "frequency": f"{len(uncategorized)} transactions",
            "potential_savings": total_uncat * 0.10,
            "recommendation": "Categorize all transactions to track spending better. Hidden expenses add up quickly!",
            "severity": "low",
            "transactions": [serialize_doc(t) for t in uncategorized[:5]]
        })
    
    # Sort by severity and potential savings
    severity_order = {"high": 0, "medium": 1, "low": 2}
    leaks.sort(key=lambda x: (severity_order[x["severity"]], -x["potential_savings"]))
    
    total_savings = sum(leak["potential_savings"] for leak in leaks)
    
    return {
        "leaks": leaks,
        "total_potential_savings": total_savings,
        "analysis_date": datetime.utcnow().isoformat()
    }


@router.post("/analyze-leaks")
async def analyze_leaks(current_user=Depends(get_current_user)):
    """Run leak detection analysis"""
    return await leak_detector(current_user)


@router.post("/optimize")
async def optimize_budget(current_user=Depends(get_current_user)):
    """AI-powered budget optimization"""
    from ai_service import get_gemini_response
    import json
    import re
    
    db = get_db()
    user_id = current_user["id"]
    month = current_month()
    
    # Get current budget
    budget = await db.budgets.find_one({"user_id": user_id, "month": month})
    if not budget:
        raise HTTPException(status_code=404, detail="No budget found. Set up a budget first.")
    
    # Get spending history
    transactions = await db.transactions.find({
        "user_id": user_id,
        "month": month,
        "transaction_type": "debit",
        "category_type": "expense"
    }).to_list(None)
    
    # Calculate actual spending per category
    actual_spending = {}
    for txn in transactions:
        cat = txn.get("expense_category", "Others")
        actual_spending[cat] = actual_spending.get(cat, 0) + txn["amount"]
    
    income = budget["income_baseline"]
    
    # Build current allocation map
    current_allocation = {}
    for cat in budget.get("categories", []):
        current_allocation[cat["name"]] = cat["allocated"]
    
    # Try AI optimization first
    try:
        prompt = f"""As a financial advisor, optimize this monthly budget:

Income: ₹{income}
Current Allocation: {current_allocation}
Actual Spending (this month): {actual_spending}

Provide an optimized budget that:
1. Maximizes savings (aim for 20-30% of income)
2. Keeps essential expenses (Housing, Food, Utilities, Healthcare) adequately funded
3. Reduces discretionary spending if overspending
4. Follows the 50/30/20 rule (50% needs, 30% wants, 20% savings)

Return ONLY a JSON object with:
- "optimized_budget": dict with category allocations
- "insights": string explaining key changes
- "projected_savings": number

Format: {{"optimized_budget": {{"Housing": 25000, ...}}, "insights": "...", "projected_savings": 15000}}
"""
        
        response = await get_gemini_response(prompt)
        
        # Try to parse JSON from response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            raise Exception("No JSON in response")
            
    except Exception:
        # Fallback: Rule-based optimization
        optimized = {}
        
        # Essential categories (50% of income)
        essentials = ["Housing", "Food", "Transport", "Utilities", "Healthcare"]
        
        # Wants (30% of income)
        wants = ["Shopping", "Entertainment", "Education", "Others"]
        
        # Savings (20% of income)
        savings_total = income * 0.20
        
        # Distribute essentials
        for cat in essentials:
            if cat == "Housing":
                optimized[cat] = income * 0.25
            elif cat == "Food":
                optimized[cat] = income * 0.15
            elif cat in ["Transport", "Utilities", "Healthcare"]:
                optimized[cat] = income * 0.05
        
        # Distribute wants
        for cat in wants:
            if cat == "Shopping":
                optimized[cat] = income * 0.10
            elif cat == "Education":
                optimized[cat] = income * 0.08
            elif cat == "Entertainment":
                optimized[cat] = income * 0.06
            else:
                optimized[cat] = income * 0.06
        
        optimized["Savings"] = savings_total
        
        insights = f"""Optimized using the 50/30/20 rule:
• 50% (₹{income * 0.5:.0f}) for essentials (Housing, Food, Transport, etc.)
• 30% (₹{income * 0.3:.0f}) for discretionary spending
• 20% (₹{savings_total:.0f}) for savings

Key changes:
• Increased savings allocation to 20% of income
• Balanced essential expenses
• Reduced discretionary spending if over budget"""
        
        return {
            "optimized_budget": optimized,
            "insights": insights,
            "projected_savings": savings_total,
            "ai_unavailable": True
        }



# ─── ML-Based Smart Allocation ─────────────────────────────────

@router.post("/smart-allocation")
async def smart_allocation(profile: dict):
    """
    Get ML-based budget allocation based on user profile
    """
    from budget_ml_model import get_smart_allocation
    
    try:
        result = get_smart_allocation(profile)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/setup-complete")
async def setup_complete(data: dict, current_user=Depends(get_current_user)):
    """
    Complete budget setup with profile and allocation
    Saves: bank balance, user profile, budget allocation
    """
    db = get_db()
    user_id = current_user["id"]
    month = current_month()
    
    # Save bank balance
    bank_balance = data.get("bank_balance", 0)
    profile = data.get("profile", {})
    allocation = data.get("allocation", {})
    
    # Save user profile
    await db.settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "bank_balance": bank_balance,
            "monthly_income": profile.get("monthly_income"),
            "family_type": profile.get("family_type"),
            "family_members": profile.get("family_members"),
            "city_type": profile.get("city_type"),
            "lifestyle": profile.get("lifestyle"),
            "earning_members": profile.get("earning_members"),
            "setup_complete": True,
            "setup_date": datetime.utcnow(),
        }},
        upsert=True
    )
    
    # Create budget with ML allocation
    categories = []
    for name, amount in allocation.items():
        categories.append({
            "name": name,
            "allocated": float(amount),
            "spent": 0.0,
            "percentage": (float(amount) / profile["monthly_income"]) * 100,
        })
    
    budget_doc = {
        "user_id": user_id,
        "month": month,
        "income_baseline": profile["monthly_income"],
        "income_type": "fixed",
        "categories": categories,
        "created_at": datetime.utcnow(),
        "ml_generated": True,
        "profile": profile,
    }
    
    await db.budgets.update_one(
        {"user_id": user_id, "month": month},
        {"$set": budget_doc},
        upsert=True
    )
    
    return {"success": True, "message": "Budget setup complete!"}
