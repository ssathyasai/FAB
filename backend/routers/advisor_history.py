from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from routers.auth import get_current_user
from utils import serialize_docs
from datetime import datetime
from bson import ObjectId

router = APIRouter()


@router.get("/history/{advisor_type}")
async def get_advisor_history(advisor_type: str, current_user=Depends(get_current_user)):
    """
    Get last 3 advice history for specific advisor type
    advisor_type: asset, debt, savings, investment
    """
    db = get_db()
    user_id = current_user["id"]
    
    # Validate advisor type
    valid_types = ["asset", "debt", "savings", "investment"]
    if advisor_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid advisor type. Must be one of: {', '.join(valid_types)}")
    
    # Get last 3 advice records for this user and advisor type
    history = await db.advisor_history.find(
        {"user_id": user_id, "advisor_type": advisor_type}
    ).sort("created_at", -1).limit(3).to_list(3)
    
    return {"history": serialize_docs(history)}


@router.post("/history/save")
async def save_advisor_history(
    advisor_type: str,
    input_summary: dict,
    response_summary: dict,
    full_response: dict,
    current_user=Depends(get_current_user)
):
    """
    Save advice history
    """
    db = get_db()
    user_id = current_user["id"]
    
    # Validate advisor type
    valid_types = ["asset", "debt", "savings", "investment"]
    if advisor_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid advisor type. Must be one of: {', '.join(valid_types)}")
    
    # Create history document
    doc = {
        "user_id": user_id,
        "advisor_type": advisor_type,
        "input_summary": input_summary,
        "response_summary": response_summary,
        "full_response": full_response,
        "created_at": datetime.utcnow()
    }
    
    result = await db.advisor_history.insert_one(doc)
    
    # Keep only last 10 records per advisor type (cleanup old ones)
    all_records = await db.advisor_history.find(
        {"user_id": user_id, "advisor_type": advisor_type}
    ).sort("created_at", -1).to_list(100)
    
    if len(all_records) > 10:
        # Delete records beyond 10
        ids_to_delete = [r["_id"] for r in all_records[10:]]
        await db.advisor_history.delete_many({"_id": {"$in": ids_to_delete}})
    
    return {"status": "saved", "id": str(result.inserted_id)}


@router.delete("/history/{history_id}")
async def delete_advisor_history(history_id: str, current_user=Depends(get_current_user)):
    """Delete a specific history item"""
    db = get_db()
    user_id = current_user["id"]
    
    try:
        result = await db.advisor_history.delete_one({
            "_id": ObjectId(history_id),
            "user_id": user_id  # Ensure user owns this record
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="History not found")
        
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history/{advisor_type}/{history_id}")
async def get_full_advice(advisor_type: str, history_id: str, current_user=Depends(get_current_user)):
    """Get full advice details for a specific history item"""
    db = get_db()
    user_id = current_user["id"]
    
    try:
        history = await db.advisor_history.find_one({
            "_id": ObjectId(history_id),
            "user_id": user_id,
            "advisor_type": advisor_type
        })
        
        if not history:
            raise HTTPException(status_code=404, detail="History not found")
        
        from utils import serialize_doc
        return serialize_doc(history)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
