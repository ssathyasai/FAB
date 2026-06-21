from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from utils import serialize_doc
from routers.auth import get_current_user
from models import ChangePasswordRequest
from passlib.context import CryptContext

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.get("/")
async def get_settings(current_user=Depends(get_current_user)):
    import os
    db = get_db()
    user_id = current_user["id"]
    doc = await db.settings.find_one({"user_id": user_id})
    
    # Get API keys from .env file
    env_gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    env_groq_key   = os.getenv("GROQ_API_KEY",   "").strip()
    env_openai_key = os.getenv("OPENAI_API_KEY",  "").strip()
    
    if not doc:
        return {
            "income_baseline": 0,
            "income_type": "fixed",
            "phone_number": "",
            "theme": "light",
            "gemini_api_key": env_gemini_key if env_gemini_key else "",
            "groq_api_key":   env_groq_key   if env_groq_key   else "",
            "openai_api_key": env_openai_key if env_openai_key else "",
            "bank_enabled": True,
            "onboarding_complete": False,
        }
    result = serialize_doc(doc)
    
    # If no API key in database but exists in .env, use .env value
    if not result.get("gemini_api_key") and env_gemini_key:
        result["gemini_api_key"] = env_gemini_key
    if not result.get("groq_api_key") and env_groq_key:
        result["groq_api_key"] = env_groq_key
    if not result.get("openai_api_key") and env_openai_key:
        result["openai_api_key"] = env_openai_key
    
    # Ensure bank_enabled defaults to True if not set
    if "bank_enabled" not in result:
        result["bank_enabled"] = True
    
    # Mask keys in response — just expose presence
    if result.get("gemini_api_key"):
        result["gemini_api_key"] = "***configured***"
    if result.get("groq_api_key"):
        result["groq_api_key"] = "***configured***"
    if result.get("openai_api_key"):
        result["openai_api_key"] = "***configured***"
    
    return result


@router.put("/")
async def update_settings(body: dict, current_user=Depends(get_current_user)):
    db = get_db()
    user_id = current_user["id"]
    # Never store full key in response
    await db.settings.update_one({"user_id": user_id}, {"$set": body}, upsert=True)
    doc = await db.settings.find_one({"user_id": user_id})
    result = serialize_doc(doc)

    # Update .env file with new Gemini key if provided
    if "gemini_api_key" in body and body["gemini_api_key"]:
        import os
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        try:
            with open(env_path, "r") as f:
                lines = f.readlines()
            new_lines = []
            found = False
            for line in lines:
                if line.startswith("GEMINI_API_KEY="):
                    new_lines.append(f"GEMINI_API_KEY={body['gemini_api_key']}\n")
                    found = True
                else:
                    new_lines.append(line)
            if not found:
                new_lines.append(f"GEMINI_API_KEY={body['gemini_api_key']}\n")
            with open(env_path, "w") as f:
                f.writelines(new_lines)
            # Reload env
            import importlib
            import ai_service
            os.environ["GEMINI_API_KEY"] = body["gemini_api_key"]
        except Exception:
            pass

    # Mask key in response
    if result.get("gemini_api_key"):
        result["gemini_api_key"] = "***configured***"
    return result


@router.post("/reset-all-data")
async def reset_all_data(current_user=Depends(get_current_user)):
    """
    Reset all data in the database for the current user - DANGER ZONE
    Clears: transactions, budgets, alerts, settings for THIS user only
    """
    db = get_db()
    user_id = current_user["id"]
    
    try:
        # Clear all collections FOR THIS USER ONLY
        transactions_deleted = await db.transactions.delete_many({"user_id": user_id})
        budgets_deleted = await db.budgets.delete_many({"user_id": user_id})
        alerts_deleted = await db.alerts.delete_many({"user_id": user_id})
        settings_deleted = await db.settings.delete_many({"user_id": user_id})
        bank_accounts_deleted = await db.bank_accounts.delete_many({"user_id": user_id})
        
        return {
            "success": True,
            "message": "All your data has been reset",
            "deleted": {
                "transactions": transactions_deleted.deleted_count,
                "budgets": budgets_deleted.deleted_count,
                "alerts": alerts_deleted.deleted_count,
                "settings": settings_deleted.deleted_count,
                "bank_accounts": bank_accounts_deleted.deleted_count,
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to reset data: {str(e)}"
        }


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user=Depends(get_current_user)):
    """Change user password"""
    from bson import ObjectId
    db = get_db()
    user_id = current_user["id"]
    
    # Get current user from database
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not user.get("password") or not pwd.verify(req.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash and update new password
    new_hashed = pwd.hash(req.new_password)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": new_hashed}}
    )
    
    return {"success": True, "message": "Password changed successfully"}
