"""
Clear all data from MongoDB database
Run this to start fresh
"""
import asyncio
from database import connect_db, close_db, get_db


async def clear_all_data():
    """Clear all collections in the database"""
    await connect_db()
    db = get_db()
    
    collections = [
        "users",
        "transactions",
        "budgets",
        "alerts",
        "settings",
        "bank_accounts",
        "assets",
        "piggybanks",
        "piggybank_transactions",
        "pending_registrations",
    ]
    
    print("Clearing all data from MongoDB...")
    print("=" * 50)
    
    for collection_name in collections:
        collection = db[collection_name]
        result = await collection.delete_many({})
        print(f"  Cleared {collection_name}: {result.deleted_count} documents deleted")
    
    print("=" * 50)
    print("Database cleared successfully!")
    print("\nYou can now start fresh with:")
    print("1. Register a new account")
    print("2. Go to /budget/setup")
    print("3. Complete the setup wizard")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(clear_all_data())
