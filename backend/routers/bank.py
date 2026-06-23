"""
Bank Section — replaces bank.json manual editing.
Users manage their bank accounts directly in the app.
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from database import get_db
from utils import serialize_doc, serialize_docs, current_month
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from routers.auth import get_current_user
import json, os
from pathlib import Path

router = APIRouter()

BANK_JSON = Path(os.getenv("BANK_JSON_PATH", "../bank.json"))


class AccountCreate(BaseModel):
    name: str           # e.g. "HDFC Savings", "SBI Current"
    account_type: str   # savings / current / wallet / credit
    bank_name: str
    balance: float
    account_number: str = ""  # last 4 digits only (optional)
    is_primary: bool = False


class BalanceUpdate(BaseModel):
    amount: float
    note: str = ""
    update_type: str = "set"  # set | add | subtract


# ── Accounts CRUD ──────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts():
    db = get_db()
    docs = await db.bank_accounts.find({}).sort("is_primary", -1).to_list(50)
    total = sum(d["balance"] for d in docs if d.get("account_type") != "credit")
    return {"accounts": serialize_docs(docs), "total_balance": total}


@router.post("/accounts")
async def create_account(req: AccountCreate):
    db = get_db()
    # If primary, unset others
    if req.is_primary:
        await db.bank_accounts.update_many({}, {"$set": {"is_primary": False}})
    doc = {
        **req.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.bank_accounts.insert_one(doc)
    # Sync bank.json with primary balance
    await _sync_bank_json(db)
    return serialize_doc(await db.bank_accounts.find_one({"_id": result.inserted_id}))


@router.put("/accounts/{account_id}")
async def update_account(account_id: str, req: AccountCreate):
    db = get_db()
    if req.is_primary:
        await db.bank_accounts.update_many({}, {"$set": {"is_primary": False}})
    await db.bank_accounts.update_one(
        {"_id": ObjectId(account_id)},
        {"$set": {**req.dict(), "updated_at": datetime.utcnow()}}
    )
    await _sync_bank_json(db)
    return serialize_doc(await db.bank_accounts.find_one({"_id": ObjectId(account_id)}))


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    db = get_db()
    await db.bank_accounts.delete_one({"_id": ObjectId(account_id)})
    await _sync_bank_json(db)
    return {"success": True}


# ── Balance Update (the main action replacing bank.json edits) ──

@router.post("/accounts/{account_id}/update-balance")
async def update_balance(account_id: str, req: BalanceUpdate):
    db = get_db()
    account = await db.bank_accounts.find_one({"_id": ObjectId(account_id)})
    if not account:
        raise HTTPException(404, "Account not found")

    old_balance = account["balance"]

    if req.update_type == "set":
        new_balance = req.amount
    elif req.update_type == "add":
        new_balance = old_balance + req.amount
    elif req.update_type == "subtract":
        new_balance = old_balance - req.amount
    else:
        raise HTTPException(400, "Invalid update_type")

    await db.bank_accounts.update_one(
        {"_id": ObjectId(account_id)},
        {"$set": {"balance": new_balance, "updated_at": datetime.utcnow()}}
    )

    # Auto-create transaction if balance changed
    if new_balance != old_balance:
        diff = new_balance - old_balance
        tx_type = "credit" if diff > 0 else "debit"
        
        # Auto-categorize: credit = income, debit = pending (needs categorization)
        if tx_type == "credit":
            category_type = "income"
            income_type = "other"
            status = "categorized"
        else:
            category_type = "uncategorized"
            income_type = None
            status = "pending"
        
        await db.transactions.insert_one({
            "amount": abs(diff),
            "transaction_type": tx_type,
            "category_type": category_type,
            "expense_category": None,
            "income_type": income_type,
            "note": req.note or None,
            "status": status,
            "balance_before": old_balance,
            "balance_after": new_balance,
            "account_id": account_id,
            "account_name": account["name"],
            "created_at": datetime.utcnow(),
            "month": current_month(),
        })

    # Sync bank.json
    await _sync_bank_json(db)
    return {
        "account": serialize_doc(await db.bank_accounts.find_one({"_id": ObjectId(account_id)})),
        "old_balance": old_balance,
        "new_balance": new_balance,
        "difference": new_balance - old_balance,
    }


# ── Quick transfer between accounts ────────────────────────────

@router.post("/transfer")
async def transfer(body: dict):
    db = get_db()
    from_id = body.get("from_account_id")
    to_id   = body.get("to_account_id")
    amount  = float(body.get("amount", 0))
    note    = body.get("note", "Internal transfer")

    if not from_id or not to_id or amount <= 0:
        raise HTTPException(400, "Invalid transfer details")

    src = await db.bank_accounts.find_one({"_id": ObjectId(from_id)})
    dst = await db.bank_accounts.find_one({"_id": ObjectId(to_id)})
    if not src or not dst:
        raise HTTPException(404, "Account not found")
    if src["balance"] < amount:
        raise HTTPException(400, "Insufficient balance")

    new_src = src["balance"] - amount
    new_dst = dst["balance"] + amount

    await db.bank_accounts.update_one({"_id": ObjectId(from_id)}, {"$set": {"balance": new_src}})
    await db.bank_accounts.update_one({"_id": ObjectId(to_id)},   {"$set": {"balance": new_dst}})

    # Log as transfer transactions
    now = datetime.utcnow()
    month = current_month()
    for tx_type, acct, old, new_, acct_id in [
        ("debit",  src, src["balance"], new_src, from_id),
        ("credit", dst, dst["balance"], new_dst, to_id),
    ]:
        await db.transactions.insert_one({
            "amount": amount, "transaction_type": tx_type,
            "category_type": "transfer",
            "expense_category": None, "income_type": None,
            "note": note, "status": "categorized",
            "balance_before": old, "balance_after": new_,
            "account_id": acct_id, "account_name": acct["name"],
            "created_at": now, "month": month,
        })

    await _sync_bank_json(db)
    return {"success": True, "transferred": amount}


# ── Summary ────────────────────────────────────────────────────

@router.get("/summary")
async def bank_summary():
    db = get_db()
    accounts = await db.bank_accounts.find({}).to_list(50)
    total_assets = sum(a["balance"] for a in accounts if a.get("account_type") != "credit")
    total_credit = sum(a["balance"] for a in accounts if a.get("account_type") == "credit")

    # Monthly inflow/outflow
    month = current_month()
    inc_r = await db.transactions.aggregate([
        {"$match": {"month": month, "category_type": "income", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    exp_r = await db.transactions.aggregate([
        {"$match": {"month": month, "category_type": "expense", "status": "categorized"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)

    # Recent transactions across all accounts
    recent = await db.transactions.find({}).sort("created_at", -1).limit(5).to_list(5)

    return {
        "accounts": serialize_docs(accounts),
        "total_assets": total_assets,
        "total_credit_used": total_credit,
        "net_worth": total_assets - total_credit,
        "monthly_inflow":  inc_r[0]["total"] if inc_r else 0,
        "monthly_outflow": exp_r[0]["total"] if exp_r else 0,
        "recent_transactions": serialize_docs(recent),
    }


# ── Internal: sync primary account balance → bank.json ─────────

async def _sync_bank_json(db):
    try:
        primary = await db.bank_accounts.find_one({"is_primary": True})
        if not primary:
            primary = await db.bank_accounts.find_one({})
        if primary:
            with open(BANK_JSON, "w") as f:
                json.dump({"balance": primary["balance"]}, f)
    except Exception:
        pass



# ─── Manual Bank Balance Management ────────────────────────────

@router.post("/set-balance")
async def set_bank_balance(data: dict, current_user=Depends(get_current_user)):
    """
    Set bank balance manually (creates transaction for the difference)
    """
    db = get_db()
    user_id = current_user["id"]
    new_balance = data.get("balance", 0)
    
    # Get current balance
    settings = await db.settings.find_one({"user_id": user_id})
    old_balance = settings.get("bank_balance", 0) if settings else 0
    
    # Save new balance to settings
    await db.settings.update_one(
        {"user_id": user_id},
        {"$set": {
            "bank_balance": new_balance,
            "last_balance_update": datetime.utcnow(),
        }},
        upsert=True
    )
    
    # If balance changed, create transaction
    if new_balance != old_balance:
        diff = new_balance - old_balance
        amount = abs(diff)
        tx_type = "credit" if diff > 0 else "debit"
        
        # Auto-categorize: credit = income, debit = pending
        if tx_type == "credit":
            category_type = "income"
            income_type = "other"
            status = "categorized"
            expense_category = None
        else:
            category_type = "uncategorized"
            income_type = None
            status = "pending"
            expense_category = None
        
        # Create transaction record
        tx_doc = {
            "user_id": user_id,
            "amount": amount,
            "transaction_type": tx_type,
            "category_type": category_type,
            "expense_category": expense_category,
            "income_type": income_type,
            "note": "Balance update",
            "status": status,
            "balance_before": old_balance,
            "balance_after": new_balance,
            "created_at": datetime.utcnow(),
            "month": current_month(),
        }
        
        result = await db.transactions.insert_one(tx_doc)
        
        return {
            "success": True,
            "balance": new_balance,
            "transaction_created": True,
            "transaction_id": str(result.inserted_id),
            "transaction_type": tx_type,
            "amount": amount,
        }
    
    return {"success": True, "balance": new_balance, "transaction_created": False}


@router.get("/balance")
async def get_bank_balance(current_user=Depends(get_current_user)):
    """
    Get current bank balance from database
    """
    db = get_db()
    user_id = current_user["id"]
    settings = await db.settings.find_one({"user_id": user_id})
    balance = settings.get("bank_balance", 0) if settings else 0
    return {"balance": balance}


@router.post("/record-transaction")
async def record_transaction(txn: dict):
    """
    Record a manual transaction
    Updates bank balance and creates transaction record
    
    Body: {
        "amount": 5000,
        "type": "debit" or "credit",
        "category": "Food",
        "note": "Groceries",
        "actual_price": 4500  # Optional: for leak detection
    }
    """
    db = get_db()
    
    # Get current balance
    settings = await db.settings.find_one({})
    current_balance = settings.get("bank_balance", 0) if settings else 0
    
    amount = txn.get("amount", 0)
    txn_type = txn.get("type", "debit")
    category = txn.get("category")
    note = txn.get("note", "")
    actual_price = txn.get("actual_price")  # For leak detection
    
    # Calculate new balance
    if txn_type == "debit":
        new_balance = current_balance - amount
    else:
        new_balance = current_balance + amount
    
    # Update balance
    await db.settings.update_one(
        {},
        {"$set": {"bank_balance": new_balance, "last_balance_update": datetime.utcnow()}},
        upsert=True
    )
    
    # Create transaction record
    tx_doc = {
        "amount": amount,
        "transaction_type": txn_type,
        "category_type": "income" if txn_type == "credit" else ("expense" if category else "uncategorized"),
        "expense_category": category if txn_type == "debit" else None,
        "income_type": "other" if txn_type == "credit" else None,
        "note": note,
        "status": "categorized" if txn_type == "credit" or category else "pending",
        "balance_before": current_balance,
        "balance_after": new_balance,
        "created_at": datetime.utcnow(),
        "month": current_month(),
        "actual_price": actual_price,  # Store for leak detection
    }
    
    result = await db.transactions.insert_one(tx_doc)
    
    # Check for leak if actual_price is different
    leak_detected = False
    if actual_price and actual_price != amount:
        leak_amount = amount - actual_price
        leak_detected = True
        
        # Create alert for suspicious transaction
        alert_doc = {
            "type": "suspicious_transaction",
            "severity": "high" if leak_amount > 1000 else "medium",
            "title": f"Suspicious Transaction Detected",
            "message": f"You were charged ₹{amount:,.0f} but actual price was ₹{actual_price:,.0f}. Difference: ₹{leak_amount:,.0f}",
            "category": category,
            "transaction_id": str(result.inserted_id),
            "created_at": datetime.utcnow(),
            "dismissed": False,
        }
        await db.alerts.insert_one(alert_doc)
    
    # Update budget category spending
    if category and txn_type == "debit":
        month = current_month()
        await db.budgets.update_one(
            {"month": month, "categories.name": category},
            {"$inc": {"categories.$.spent": amount}}
        )
        
        # Check if over budget
        budget = await db.budgets.find_one({"month": month})
        if budget:
            for cat in budget.get("categories", []):
                if cat["name"] == category:
                    if cat["spent"] > cat["allocated"]:
                        # Create over-budget alert
                        alert_doc = {
                            "type": "over_budget",
                            "severity": "high",
                            "title": f"{category} Budget Exceeded",
                            "message": f"Spent ₹{cat['spent']:,.0f} out of ₹{cat['allocated']:,.0f} allocated",
                            "category": category,
                            "created_at": datetime.utcnow(),
                            "dismissed": False,
                        }
                        await db.alerts.insert_one(alert_doc)
    
    return {
        "success": True,
        "transaction_id": str(result.inserted_id),
        "new_balance": new_balance,
        "leak_detected": leak_detected,
    }



@router.post("/analyze-bill")
async def analyze_bill(file: UploadFile = File(...), amount: float = 0, current_user=None):
    """
    Analyze bill/receipt image and suggest categories for transaction categorization.
    Uses two-step approach: OCR extract text → Text AI analysis (more cost-effective)
    """
    try:
        # Read image
        image_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
        
        # Two-step analysis: Extract text first, then categorize
        from ai_service import analyze_bill_ocr_then_ai
        result = await analyze_bill_ocr_then_ai(image_bytes, mime_type, amount)
        
        return {"success": True, "data": result}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
