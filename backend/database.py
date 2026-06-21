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

    # Create TTL index for pending OTP registrations — auto-delete after 10 min
    try:
        await db.pending_registrations.create_index(
            "otp_expiry",
            expireAfterSeconds=0,
            name="otp_expiry_ttl"
        )
        print("[DB] TTL index on pending_registrations.otp_expiry ready")
    except Exception as e:
        print(f"[DB] TTL index warning: {e}")


async def close_db():
    global client
    # Don't close during development to avoid connection issues
    pass
    # if client:
    #     client.close()


def get_db():
    return db
