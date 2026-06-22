from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import asyncio
import json
from datetime import datetime

from database import connect_db, close_db, get_db
from bank_watcher import watch_bank
from asset_value_tracker import background_asset_updater
from routers import transactions, budget, dashboard, alerts, advisor, settings as settings_router, auth as auth_router, bank as bank_router, coach as coach_router, assets as assets_router, piggybank as piggybank_router
from routers.auth import get_current_user
import os
from dotenv import load_dotenv

load_dotenv()


class BalanceUpdate(BaseModel):
    balance: float


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    asyncio.create_task(watch_bank())
    asyncio.create_task(background_asset_updater())
    yield
    await close_db()


app = FastAPI(title="FIN TRACKER API", version="1.0.0", lifespan=lifespan)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
_allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if _frontend_url and _frontend_url not in _allowed_origins:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(budget.router, prefix="/api/budget", tags=["Budget"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(advisor.router, prefix="/api/advisor", tags=["Advisor"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])
app.include_router(bank_router.router, prefix="/api/bank", tags=["Bank"])
app.include_router(coach_router.router, prefix="/api/coach", tags=["Coach"])
app.include_router(assets_router.router, prefix="/api/assets", tags=["Assets"])
app.include_router(piggybank_router.router, prefix="/api/piggybank", tags=["PiggyBank"])


@app.get("/")
async def root():
    return {"status": "FIN TRACKER API running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check database connectivity
        db = get_db()
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "ok",
        "database": db_status,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/balance")
async def get_balance(current_user=Depends(get_current_user)):
    """Get user's bank balance from database (user-isolated)"""
    from routers.auth import get_current_user
    db = get_db()
    user_id = current_user["id"]
    
    # Get user's bank account from database
    bank_account = await db.bank_accounts.find_one({"user_id": user_id})
    
    if not bank_account:
        # Initialize with zero balance if no account exists
        await db.bank_accounts.insert_one({
            "user_id": user_id,
            "balance": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        return {"balance": 0.0}
    
    return {"balance": bank_account.get("balance", 0.0)}


@app.post("/api/bank/balance")
async def update_balance(req: BalanceUpdate, current_user=Depends(get_current_user)):
    """Update user's bank balance in database (user-isolated)"""
    from routers.auth import get_current_user
    from datetime import datetime
    
    db = get_db()
    user_id = current_user["id"]
    
    # Update user's bank balance in database
    await db.bank_accounts.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "balance": req.balance,
                "updated_at": datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {"success": True, "balance": req.balance}
