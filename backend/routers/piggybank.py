from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import PiggyBankCreateRequest, PiggyBankTransactionRequest
from routers.auth import get_current_user
from utils import serialize_doc, serialize_docs
from datetime import datetime
from bson import ObjectId

router = APIRouter()


@router.get("/")
async def get_piggy_banks(current_user=Depends(get_current_user)):
    """Get all piggy banks for current user"""
    db = get_db()
    user_id = current_user["id"]
    
    piggy_banks = await db.piggy_banks.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return {"piggy_banks": serialize_docs(piggy_banks)}


@router.post("/")
async def create_piggy_bank(req: PiggyBankCreateRequest, current_user=Depends(get_current_user)):
    """Create a new piggy bank"""
    db = get_db()
    user_id = current_user["id"]
    
    piggy_bank = {
        "user_id": user_id,
        "name": req.name,
        "goal_amount": req.goal_amount,
        "current_amount": 0.0,
        "color": req.color or "#f59e0b",
        "icon": req.icon or "fas fa-piggy-bank",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await db.piggy_banks.insert_one(piggy_bank)
    piggy_bank["_id"] = result.inserted_id
    
    return {"piggy_bank": serialize_doc(piggy_bank)}


@router.delete("/{piggy_bank_id}")
async def delete_piggy_bank(piggy_bank_id: str, current_user=Depends(get_current_user)):
    """Delete a piggy bank"""
    db = get_db()
    user_id = current_user["id"]
    
    # Check ownership
    piggy_bank = await db.piggy_banks.find_one({"_id": ObjectId(piggy_bank_id), "user_id": user_id})
    if not piggy_bank:
        raise HTTPException(status_code=404, detail="Piggy bank not found")
    
    # Delete transactions
    await db.piggy_bank_transactions.delete_many({"piggy_bank_id": piggy_bank_id, "user_id": user_id})
    
    # Delete piggy bank
    await db.piggy_banks.delete_one({"_id": ObjectId(piggy_bank_id), "user_id": user_id})
    
    return {"success": True}


@router.post("/{piggy_bank_id}/transaction")
async def add_transaction(piggy_bank_id: str, req: PiggyBankTransactionRequest, current_user=Depends(get_current_user)):
    """Add or withdraw money from piggy bank
    - Adding money: Deducts from bank balance and creates transaction
    - Withdrawing money: Adds to bank balance and creates transaction
    """
    db = get_db()
    user_id = current_user["id"]
    
    # Check ownership
    piggy_bank = await db.piggy_banks.find_one({"_id": ObjectId(piggy_bank_id), "user_id": user_id})
    if not piggy_bank:
        raise HTTPException(status_code=404, detail="Piggy bank not found")
    
    # Check if withdrawal is valid
    if req.amount < 0 and abs(req.amount) > piggy_bank["current_amount"]:
        raise HTTPException(status_code=400, detail="Insufficient funds in piggy bank")
    
    # Get current bank balance
    settings = await db.settings.find_one({"user_id": user_id})
    current_balance = settings.get("bank_balance", 0) if settings else 0
    
    # Check if user has sufficient balance when adding money to piggy bank
    if req.amount > 0 and current_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient bank balance")
    
    # Calculate new balances
    new_piggy_amount = piggy_bank["current_amount"] + req.amount
    
    # Update bank balance
    if req.amount > 0:
        # Adding to piggy bank - deduct from bank balance
        new_bank_balance = current_balance - req.amount
        transaction_type = "debit"
        category_type = "expense"
        expense_category = "Savings"
        note = req.note or f"Added to {piggy_bank['name']} piggy bank"
    else:
        # Withdrawing from piggy bank - add to bank balance
        new_bank_balance = current_balance + abs(req.amount)
        transaction_type = "credit"
        category_type = "income"
        expense_category = None
        note = req.note or f"Withdrawn from {piggy_bank['name']} piggy bank"
    
    # Update bank balance in settings
    await db.settings.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "bank_balance": new_bank_balance,
                "last_balance_update": datetime.utcnow(),
            }
        },
        upsert=True
    )
    
    # Update primary bank account if exists
    primary_account = await db.bank_accounts.find_one({"is_primary": True})
    if not primary_account:
        primary_account = await db.bank_accounts.find_one({})
        
    account_id = None
    account_name = None
    
    if primary_account:
        if req.amount > 0:
            new_primary_balance = primary_account["balance"] - req.amount
        else:
            new_primary_balance = primary_account["balance"] + abs(req.amount)
            
        await db.bank_accounts.update_one(
            {"_id": primary_account["_id"]},
            {"$set": {"balance": new_primary_balance, "updated_at": datetime.utcnow()}}
        )
        
        account_id = str(primary_account["_id"])
        account_name = primary_account["name"]
    
    # Create piggy bank transaction
    piggy_transaction = {
        "piggy_bank_id": piggy_bank_id,
        "user_id": user_id,
        "amount": req.amount,
        "note": req.note,
        "created_at": datetime.utcnow(),
    }
    await db.piggy_bank_transactions.insert_one(piggy_transaction)
    
    # Create main transaction record
    from utils import current_month
    main_transaction = {
        "user_id": user_id,
        "amount": abs(req.amount),
        "transaction_type": transaction_type,
        "category_type": category_type,
        "expense_category": expense_category,
        "income_type": "Savings Withdrawal" if transaction_type == "credit" else None,
        "note": note,
        "status": "categorized",  # Auto-categorized
        "balance_before": current_balance,
        "balance_after": new_bank_balance,
        "piggy_bank_id": piggy_bank_id,
        "piggy_bank_name": piggy_bank["name"],
        "account_id": account_id,
        "account_name": account_name,
        "created_at": datetime.utcnow(),
        "month": current_month(),
    }
    result = await db.transactions.insert_one(main_transaction)
    
    # Update piggy bank amount
    await db.piggy_banks.update_one(
        {"_id": ObjectId(piggy_bank_id)},
        {"$set": {"current_amount": new_piggy_amount, "updated_at": datetime.utcnow()}}
    )
    
    # Update budget if adding to piggy bank (expense in Savings category)
    if req.amount > 0:
        month = current_month()
        budget = await db.budgets.find_one({"user_id": user_id, "month": month})
        if budget:
            # Update Savings category spending
            await db.budgets.update_one(
                {"user_id": user_id, "month": month, "categories.name": "Savings"},
                {"$inc": {"categories.$.spent": abs(req.amount)}}
            )
    
    return {
        "success": True,
        "piggy_bank": {
            "new_amount": new_piggy_amount,
            "goal_amount": piggy_bank.get("goal_amount"),
            "progress": (new_piggy_amount / piggy_bank["goal_amount"] * 100) if piggy_bank.get("goal_amount") else 0,
        },
        "bank_balance": {
            "old_balance": current_balance,
            "new_balance": new_bank_balance,
            "difference": new_bank_balance - current_balance,
        },
        "transaction_id": str(result.inserted_id),
    }


@router.get("/{piggy_bank_id}/transactions")
async def get_transactions(piggy_bank_id: str, current_user=Depends(get_current_user)):
    """Get transaction history for a piggy bank"""
    db = get_db()
    user_id = current_user["id"]
    
    # Check ownership
    piggy_bank = await db.piggy_banks.find_one({"_id": ObjectId(piggy_bank_id), "user_id": user_id})
    if not piggy_bank:
        raise HTTPException(status_code=404, detail="Piggy bank not found")
    
    transactions = await db.piggy_bank_transactions.find(
        {"piggy_bank_id": piggy_bank_id, "user_id": user_id}
    ).sort("created_at", -1).to_list(100)
    
    return {"transactions": serialize_docs(transactions)}
