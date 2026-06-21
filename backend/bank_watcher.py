"""
Watches bank.json every 5 seconds.
When balance changes → creates a pending transaction in MongoDB.
"""
import asyncio
import json
import os
from datetime import datetime
from pathlib import Path

from database import get_db
from utils import current_month


BANK_JSON_PATH = Path(os.getenv("BANK_JSON_PATH", "../bank.json"))
_last_balance: float = None


async def read_balance() -> float | None:
    try:
        with open(BANK_JSON_PATH, "r") as f:
            data = json.load(f)
        return float(data.get("balance", 0))
    except Exception:
        return None


async def watch_bank():
    global _last_balance
    db = get_db()

    # Initialize from last known balance in DB
    last_tx = await db.transactions.find_one(
        {}, sort=[("created_at", -1)]
    )
    if last_tx:
        _last_balance = last_tx.get("balance_after", None)
    else:
        _last_balance = await read_balance()

    while True:
        await asyncio.sleep(5)
        try:
            # Check if bank integration is enabled
            settings = await db.settings.find_one({})
            bank_enabled = settings.get("bank_enabled", True) if settings else True
            
            if not bank_enabled:
                # Skip watching if bank is disabled
                continue
            
            current_balance = await read_balance()
            if current_balance is None:
                continue

            if _last_balance is None:
                _last_balance = current_balance
                continue

            if current_balance != _last_balance:
                diff = current_balance - _last_balance
                tx_type = "credit" if diff > 0 else "debit"
                amount = abs(diff)

                # Auto-categorize: credit = income, debit = pending
                if tx_type == "credit":
                    category_type = "income"
                    income_type = "other"
                    status = "categorized"
                else:
                    category_type = "uncategorized"
                    income_type = None
                    status = "pending"

                tx_doc = {
                    "amount": amount,
                    "transaction_type": tx_type,
                    "category_type": category_type,
                    "expense_category": None,
                    "income_type": income_type,
                    "note": None,
                    "status": status,
                    "balance_before": _last_balance,
                    "balance_after": current_balance,
                    "created_at": datetime.utcnow(),
                    "month": current_month(),
                }
                await db.transactions.insert_one(tx_doc)
                print(f"[BankWatcher] New {tx_type}: ₹{amount:,.2f} | Balance: {current_balance:,.2f}")
                _last_balance = current_balance
        except Exception as e:
            print(f"[BankWatcher] Error: {e}")
