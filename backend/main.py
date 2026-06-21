from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import asyncio
import json

from database import connect_db, close_db, get_db
from bank_watcher import watch_bank
from asset_value_tracker import background_asset_updater
from routers import transactions, budget, dashboard, alerts, advisor, settings as settings_router, auth as auth_router, bank as bank_router, coach as coach_router, assets as assets_router, piggybank as piggybank_router
import os
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    asyncio.create_task(watch_bank())
    asyncio.create_task(background_asset_updater())
    yield
    await close_db()


app = FastAPI(title="FAB Finance API", version="1.0.0", lifespan=lifespan)

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
    return {"status": "FAB Finance API running", "version": "1.0.0"}


@app.get("/api/balance")
async def get_balance():
    from pathlib import Path
    bank_path = Path(os.getenv("BANK_JSON_PATH", "../bank.json"))
    try:
        with open(bank_path) as f:
            data = json.load(f)
        return {"balance": data.get("balance", 0)}
    except Exception:
        return {"balance": 0}


class BalanceUpdate(BaseModel):
    balance: float


@app.post("/api/bank/balance")
async def update_balance(req: BalanceUpdate):
    """Update bank.json balance — the watcher will pick up the change automatically."""
    from pathlib import Path
    bank_path = Path(os.getenv("BANK_JSON_PATH", "../bank.json"))
    try:
        with open(bank_path, "w") as f:
            json.dump({"balance": req.balance}, f)
        return {"success": True, "balance": req.balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not write bank.json: {e}")
