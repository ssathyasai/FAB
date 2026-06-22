from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fab_finance")

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    print(f"Connected to MongoDB: {DB_NAME}")

    # Create indexes for better query performance
    try:
        # TTL index for pending OTP registrations — auto-delete after 10 min
        await db.pending_registrations.create_index(
            "otp_expiry",
            expireAfterSeconds=0,
            name="otp_expiry_ttl"
        )
        print("[DB] ✅ TTL index on pending_registrations.otp_expiry")
        
        # TTL index for login OTPs
        await db.login_otps.create_index(
            "otp_expiry",
            expireAfterSeconds=0,
            name="login_otp_expiry_ttl"
        )
        print("[DB] ✅ TTL index on login_otps.otp_expiry")
        
        # TTL index for password reset OTPs
        await db.password_resets.create_index(
            "otp_expiry",
            expireAfterSeconds=0,
            name="password_reset_expiry_ttl"
        )
        print("[DB] ✅ TTL index on password_resets.otp_expiry")
        
        # Transaction indexes
        await db.transactions.create_index([("user_id", 1), ("month", 1)])
        print("[DB] ✅ Index on transactions(user_id, month)")
        
        await db.transactions.create_index([("user_id", 1), ("status", 1)])
        print("[DB] ✅ Index on transactions(user_id, status)")
        
        await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
        print("[DB] ✅ Index on transactions(user_id, created_at)")
        
        # Budget indexes
        await db.budgets.create_index([("user_id", 1), ("month", 1)], unique=True)
        print("[DB] ✅ Unique index on budgets(user_id, month)")
        
        # Alert indexes
        await db.alerts.create_index([("user_id", 1), ("dismissed", 1)])
        print("[DB] ✅ Index on alerts(user_id, dismissed)")
        
        await db.alerts.create_index([("user_id", 1), ("month", 1)])
        print("[DB] ✅ Index on alerts(user_id, month)")
        
        # Asset indexes
        await db.assets.create_index([("user_id", 1), ("asset_type", 1)])
        print("[DB] ✅ Index on assets(user_id, asset_type)")
        
        # Piggy bank indexes
        await db.piggybanks.create_index("user_id")
        print("[DB] ✅ Index on piggybanks(user_id)")
        
        await db.piggybank_transactions.create_index([("user_id", 1), ("piggy_bank_id", 1)])
        print("[DB] ✅ Index on piggybank_transactions(user_id, piggy_bank_id)")
        
        # Bank account indexes
        await db.bank_accounts.create_index("user_id", unique=True)
        print("[DB] ✅ Unique index on bank_accounts(user_id)")
        
        # Settings indexes
        await db.settings.create_index("user_id", unique=True)
        print("[DB] ✅ Unique index on settings(user_id)")
        
        # User indexes
        await db.users.create_index("email", unique=True)
        print("[DB] ✅ Unique index on users(email)")
        
        print("[DB] 🎉 All database indexes created successfully!")
        
    except Exception as e:
        print(f"[DB] ⚠️ Index creation warning: {e}")


async def close_db():
    global client
    # Don't close during development to avoid connection issues
    pass
    # if client:
    #     client.close()


def get_db():
    return db
