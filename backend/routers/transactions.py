from fastapi import APIRouter, HTTPException, Query, Depends
from database import get_db
from models import CategorizeRequest, TransactionStatus, SplitCategorizeRequest
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


@router.put("/{tx_id}/split-categorize")
async def split_categorize_transaction(tx_id: str, req: SplitCategorizeRequest, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    doc = await db.transactions.find_one({"_id": ObjectId(tx_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Validate that the sum of splits equals the original transaction amount
    total_splits = sum(split.amount for split in req.splits)
    if abs(total_splits - doc["amount"]) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Total split amount ({total_splits}) does not equal transaction amount ({doc['amount']})"
        )

    month = doc.get("month", current_month())
    current_balance = doc["balance_before"]
    inserted_ids = []

    for split in req.splits:
        if doc["transaction_type"] == "debit":
            balance_after = current_balance - split.amount
        else:
            balance_after = current_balance + split.amount

        parent_note = doc.get("note")
        split_note = f"Split: {parent_note} - {split.note}" if (parent_note and split.note) else (split.note or parent_note or "Split transaction")

        split_doc = {
            "user_id": user_id,
            "amount": split.amount,
            "transaction_type": doc["transaction_type"],
            "category_type": "expense",
            "expense_category": split.expense_category,
            "income_type": None,
            "note": split_note,
            "status": "categorized",
            "balance_before": current_balance,
            "balance_after": balance_after,
            "created_at": datetime.utcnow(),
            "month": month,
        }

        res = await db.transactions.insert_one(split_doc)
        inserted_ids.append(str(res.inserted_id))

        await db.budgets.update_one(
            {"user_id": user_id, "month": month, "categories.name": split.expense_category},
            {"$inc": {"categories.$.spent": split.amount}},
        )

        budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
        if budget_doc:
            for cat in budget_doc.get("categories", []):
                if cat["name"] == split.expense_category:
                    spent = cat["spent"]
                    allocated = cat["allocated"]
                    pct = (spent / allocated * 100) if allocated > 0 else 0
                    if pct >= 100:
                        await _create_alert(db, user_id, month, "budget_exceeded", "critical",
                            f"{split.expense_category} Budget Exceeded",
                            f"{split.expense_category} budget exceeded by ₹{spent - allocated:,.0f}",
                            split.expense_category)
                    elif pct >= 80:
                        await _create_alert(db, user_id, month, "budget_exceeded", "warning",
                            f"{split.expense_category} at 80%",
                            f"{split.expense_category} budget is {pct:.0f}% used",
                            split.expense_category)

        current_balance = balance_after

    await db.transactions.delete_one({"_id": ObjectId(tx_id), "user_id": user_id})

    created = await db.transactions.find({"_id": {"$in": [ObjectId(i) for i in inserted_ids]}}).to_list(length=100)
    return {"success": True, "splits": serialize_docs(created)}


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


@router.get("/ml/anomalies")
async def detect_anomalies(
    month: str = Query(default=None),
    limit: int = Query(default=100),
    current_user=Depends(get_current_user)
):
    """
    AI/ML-based anomaly detection in transactions
    Detects unusual spending patterns, potential fraud, and outliers
    """
    from anomaly_detector import detect_spending_anomalies
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get recent transactions
    query = {"user_id": user_id, "category_type": "expense"}
    if month:
        query["month"] = month
    
    cursor = db.transactions.find(query).sort("created_at", -1).limit(limit)
    transactions = await cursor.to_list(length=limit)
    
    if len(transactions) < 10:
        return {
            "anomalies": [],
            "message": "Need at least 10 transactions for anomaly detection",
            "transaction_count": len(transactions)
        }
    
    # Detect anomalies
    anomalies = detect_spending_anomalies(serialize_docs(transactions))
    
    # Sort by severity
    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    anomalies_sorted = sorted(
        anomalies,
        key=lambda x: severity_order.get(x.get('severity', 'low'), 3)
    )
    
    return {
        "anomalies": anomalies_sorted,
        "total_anomalies": len(anomalies),
        "high_severity": len([a for a in anomalies if a.get('severity') == 'high']),
        "medium_severity": len([a for a in anomalies if a.get('severity') == 'medium']),
        "transactions_analyzed": len(transactions)
    }


@router.get("/ml/insights")
async def get_ml_insights(
    month: str = Query(default=None),
    limit: int = Query(default=100),
    current_user=Depends(get_current_user)
):
    """
    ML-based spending insights with statistical analysis
    """
    from anomaly_detector import get_ml_spending_insights
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get recent transactions
    query = {"user_id": user_id, "category_type": "expense"}
    if month:
        query["month"] = month
    
    cursor = db.transactions.find(query).sort("created_at", -1).limit(limit)
    transactions = await cursor.to_list(length=limit)
    
    if len(transactions) < 5:
        return {
            "error": "Not enough transaction data for insights",
            "transaction_count": len(transactions)
        }
    
    insights = get_ml_spending_insights(serialize_docs(transactions))
    
    return insights



@router.post("/ml/auto-categorize")
async def ml_auto_categorize(
    transaction_id: str,
    current_user=Depends(get_current_user)
):
    """
    ML-based automatic categorization for a transaction
    Uses pattern matching and user learning
    """
    from ml_categorizer import auto_categorize_transaction
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get transaction
    txn = await db.transactions.find_one({
        "_id": ObjectId(transaction_id),
        "user_id": user_id
    })
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Auto-categorize using ML
    result = auto_categorize_transaction(
        description=txn.get('note', ''),
        amount=abs(float(txn.get('amount', 0))),
        user_id=user_id
    )
    
    return {
        "transaction_id": transaction_id,
        "suggested_category": result['category'],
        "confidence": result['confidence'],
        "alternatives": result['suggestions'],
        "needs_review": result['needs_review'],
        "description": txn.get('note', '')
    }


@router.post("/ml/batch-categorize")
async def ml_batch_categorize(
    limit: int = Query(default=50),
    current_user=Depends(get_current_user)
):
    """
    ML-based batch categorization for pending transactions
    """
    from ml_categorizer import batch_categorize
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get pending transactions
    cursor = db.transactions.find({
        "user_id": user_id,
        "status": "pending"
    }).sort("created_at", -1).limit(limit)
    
    transactions = await cursor.to_list(length=limit)
    
    if not transactions:
        return {
            "message": "No pending transactions to categorize",
            "predictions": []
        }
    
    # Batch predict using ML
    predictions = batch_categorize(serialize_docs(transactions))
    
    return {
        "predictions": predictions,
        "total_predictions": len(predictions),
        "high_confidence": len([p for p in predictions if p['confidence'] > 0.7]),
        "needs_review": len([p for p in predictions if p['confidence'] < 0.6])
    }


@router.get("/ml/forecast")
async def ml_forecast_expenses(
    months_ahead: int = Query(default=1, ge=1, le=6),
    category: str = Query(default=None),
    current_user=Depends(get_current_user)
):
    """
    ML-based expense forecasting using time series analysis
    Predicts future expenses based on historical patterns
    """
    from ml_forecaster import forecast_expenses, analyze_patterns
    
    db = get_db()
    user_id = current_user["id"]
    
    # Get historical data (last 12 months)
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "category_type": "expense",
            "status": "categorized"
        }}
    ]
    
    if category:
        pipeline[0]["$match"]["expense_category"] = category
    
    pipeline.extend([
        {"$group": {
            "_id": "$month",
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"_id": 1}}
    ])
    
    results = await db.transactions.aggregate(pipeline).to_list(length=100)
    
    if len(results) < 3:
        return {
            "error": "Not enough historical data. Need at least 3 months of transactions.",
            "data_points": len(results)
        }
    
    # Prepare data
    historical_data = {r["_id"]: abs(r["total"]) for r in results}
    
    # Forecast using ML
    forecast_result = forecast_expenses(
        historical_data,
        category=category or "Total Expenses",
        months_ahead=months_ahead
    )
    
    # Add pattern analysis
    if months_ahead == 1:
        pattern_analysis = analyze_patterns(historical_data)
        forecast_result['pattern_analysis'] = pattern_analysis
    
    return forecast_result
