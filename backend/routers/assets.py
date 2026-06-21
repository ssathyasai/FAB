from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from models import AssetCreateRequest, AssetUpdateRequest
from routers.auth import get_current_user
from utils import serialize_doc, serialize_docs
from datetime import datetime
from bson import ObjectId
import asset_value_tracker

router = APIRouter()


@router.get("/")
async def get_assets(current_user=Depends(get_current_user)):
    """Get all assets for current user"""
    db = get_db()
    user_id = current_user["id"]
    
    assets = await db.assets.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    
    # Calculate total portfolio value
    total_purchase = sum(a.get("purchase_value", 0) for a in assets)
    total_current = sum(a.get("current_value", 0) for a in assets)
    gain_loss = total_current - total_purchase
    gain_loss_pct = (gain_loss / total_purchase * 100) if total_purchase > 0 else 0
    
    return {
        "assets": serialize_docs(assets),
        "summary": {
            "total_assets": len(assets),
            "total_purchase_value": round(total_purchase, 2),
            "total_current_value": round(total_current, 2),
            "total_gain_loss": round(gain_loss, 2),
            "total_gain_loss_pct": round(gain_loss_pct, 2),
        }
    }


@router.post("/")
async def create_asset(req: AssetCreateRequest, current_user=Depends(get_current_user)):
    """Create a new asset - automatically fetches current market value"""
    db = get_db()
    user_id = current_user["id"]
    
    try:
        # Get initial market value from AI (user doesn't provide current_value)
        initial_value_data = await asset_value_tracker.get_initial_asset_value(
            asset_type=req.asset_type,
            asset_name=req.name,
            purchase_value=req.purchase_value,
            location=req.location,
            purchase_date=req.purchase_date
        )
        
        # Use AI-fetched current value or fallback to purchase value
        current_value = initial_value_data.get("current_market_value", req.purchase_value)
        estimated_quantity = initial_value_data.get("estimated_quantity", req.quantity or 1.0)
        price_per_unit = initial_value_data.get("price_per_unit", 0)
        
    except Exception as e:
        # Fallback if AI fails
        current_value = req.purchase_value
        estimated_quantity = req.quantity or 1.0
        price_per_unit = 0
        initial_value_data = {
            "current_market_value": current_value,
            "estimated_quantity": estimated_quantity,
            "price_per_unit": price_per_unit,
            "market_rate_source": f"Using purchase value (AI error: {str(e)[:50]})",
            "confidence": "low"
        }
    
    asset = {
        "user_id": user_id,
        "asset_type": req.asset_type,
        "name": req.name,
        "description": req.description,
        "purchase_value": req.purchase_value,
        "current_value": current_value,  # AI-fetched value or fallback
        "purchase_date": datetime.fromisoformat(req.purchase_date) if req.purchase_date else None,
        "location": req.location,
        "quantity": req.quantity or estimated_quantity,
        "estimated_quantity": estimated_quantity,
        "price_per_unit": price_per_unit,
        "details": req.details or {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "last_price_update": datetime.utcnow(),
        "price_source": initial_value_data.get("market_rate_source", "Initial estimate"),
        "confidence": initial_value_data.get("confidence", "medium"),
    }
    
    result = await db.assets.insert_one(asset)
    asset["_id"] = result.inserted_id
    
    return {
        "asset": serialize_doc(asset),
        "initial_value_info": {
            "ai_fetched": True,
            "current_value": current_value,
            "confidence": initial_value_data.get("confidence"),
            "source": initial_value_data.get("market_rate_source"),
        }
    }


@router.put("/{asset_id}")
async def update_asset(asset_id: str, req: AssetUpdateRequest, current_user=Depends(get_current_user)):
    """Update an asset's current value and details"""
    db = get_db()
    user_id = current_user["id"]
    
    # Check ownership
    asset = await db.assets.find_one({"_id": ObjectId(asset_id), "user_id": user_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = {
        "current_value": req.current_value,
        "updated_at": datetime.utcnow(),
    }
    
    if req.description is not None:
        update_data["description"] = req.description
    if req.location is not None:
        update_data["location"] = req.location
    if req.quantity is not None:
        update_data["quantity"] = req.quantity
    if req.details is not None:
        update_data["details"] = req.details
    
    await db.assets.update_one(
        {"_id": ObjectId(asset_id)},
        {"$set": update_data}
    )
    
    return {"success": True}


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, current_user=Depends(get_current_user)):
    """Delete an asset"""
    db = get_db()
    user_id = current_user["id"]
    
    # Check ownership
    asset = await db.assets.find_one({"_id": ObjectId(asset_id), "user_id": user_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    await db.assets.delete_one({"_id": ObjectId(asset_id), "user_id": user_id})
    
    return {"success": True}


@router.get("/dashboard")
async def get_asset_dashboard(current_user=Depends(get_current_user)):
    """Get asset dashboard with market value tracking"""
    db = get_db()
    user_id = current_user["id"]
    
    assets = await db.assets.find({"user_id": user_id}).to_list(100)
    
    # Group by asset type
    by_type = {}
    for asset in assets:
        asset_type = asset.get("asset_type", "Other")
        if asset_type not in by_type:
            by_type[asset_type] = {
                "type": asset_type,
                "count": 0,
                "purchase_value": 0,
                "current_value": 0,
            }
        by_type[asset_type]["count"] += 1
        by_type[asset_type]["purchase_value"] += asset.get("purchase_value", 0)
        by_type[asset_type]["current_value"] += asset.get("current_value", 0)
    
    # Calculate gains/losses
    for type_data in by_type.values():
        type_data["gain_loss"] = type_data["current_value"] - type_data["purchase_value"]
        type_data["gain_loss_pct"] = (
            (type_data["gain_loss"] / type_data["purchase_value"] * 100)
            if type_data["purchase_value"] > 0 else 0
        )
    
    # Top performers
    top_performers = sorted(
        [serialize_doc(a) for a in assets],
        key=lambda x: ((x["current_value"] - x["purchase_value"]) / x["purchase_value"] * 100) if x["purchase_value"] > 0 else 0,
        reverse=True
    )[:5]
    
    return {
        "by_type": list(by_type.values()),
        "top_performers": top_performers,
    }


@router.post("/update-values")
async def update_asset_values(current_user=Depends(get_current_user)):
    """Manually trigger asset value update for current user"""
    user_id = current_user["id"]
    result = await asset_value_tracker.trigger_manual_update(user_id)
    return result


@router.get("/trackable")
async def get_trackable_assets(current_user=Depends(get_current_user)):
    """Get list of trackable asset types - ALL types are trackable with AI"""
    return {
        "trackable_types": "ALL",
        "info": "All asset types are automatically tracked using AI market data",
        "includes": [
            "Gold", "Silver", "Stocks", "Mutual Funds", "Cryptocurrency",
            "Real Estate", "Vehicles", "Business", "Jewelry", "and more"
        ]
    }
