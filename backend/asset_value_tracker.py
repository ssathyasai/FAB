"""
Asset Value Tracker
Automatically updates asset values using AI and market data
User enters: Asset Type, Name, Purchase Value, Location
System fetches: Current Market Value automatically
"""
import asyncio
import json
import requests
from datetime import datetime, timedelta
from database import get_db
from ai_service import call_ai
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# All asset types can be tracked (not just specific ones)
# AI will determine current value based on type
ALWAYS_TRACKABLE = True


def _sync_get_usdinr_rate() -> float:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    try:
        url = "https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X"
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            meta = data['chart']['result'][0]['meta']
            return float(meta['regularMarketPrice'])
    except Exception as e:
        logger.warning(f"Error fetching USDINR rate: {e}")
    return 83.5


def _sync_fetch_yahoo_price(symbol: str) -> tuple:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            meta = data['chart']['result'][0]['meta']
            price = meta['regularMarketPrice']
            currency = meta.get('currency', 'INR')
            prev_close = meta.get('chartPreviousClose') or meta.get('previousClose')
            
            change_24h = 0.0
            if prev_close and float(prev_close) > 0:
                change_24h = ((float(price) - float(prev_close)) / float(prev_close)) * 100
                
            return float(price), currency, change_24h
    except Exception as e:
        logger.warning(f"Error fetching yahoo price for {symbol}: {e}")
    return None, None, 0.0


def _sync_search_yahoo_ticker(query: str, asset_type: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    try:
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={requests.utils.quote(query)}"
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            quotes = data.get("quotes", [])
            if not quotes:
                return None
            
            target_types = []
            if asset_type.lower() in ["stocks", "stock", "equity"]:
                target_types = ["EQUITY"]
            elif asset_type.lower() in ["mutual funds", "mutual fund", "mf"]:
                target_types = ["MUTUALFUND"]
            elif asset_type.lower() in ["cryptocurrency", "crypto"]:
                target_types = ["CRYPTOCURRENCY"]
            
            for quote in quotes:
                qtype = quote.get("quoteType", "")
                if qtype in target_types:
                    symbol = quote.get("symbol")
                    if symbol:
                        if "EQUITY" in target_types and (symbol.endswith(".NS") or symbol.endswith(".BO")):
                            return symbol
            
            for quote in quotes:
                symbol = quote.get("symbol")
                if symbol:
                    return symbol
    except Exception as e:
        logger.warning(f"Error searching ticker for {query}: {e}")
    return None


def _sync_fetch_coingecko_price(name: str) -> tuple:
    crypto_map = {
        "bitcoin": "bitcoin",
        "btc": "bitcoin",
        "ethereum": "ethereum",
        "eth": "ethereum",
        "solana": "solana",
        "sol": "solana",
        "tether": "tether",
        "usdt": "tether",
        "dogecoin": "dogecoin",
        "doge": "dogecoin",
        "ripple": "ripple",
        "xrp": "ripple",
        "cardano": "cardano",
        "ada": "cardano",
        "binance": "binancecoin",
        "bnb": "binancecoin",
    }
    
    coin_id = None
    name_lower = name.lower()
    for k, v in crypto_map.items():
        if k in name_lower:
            coin_id = v
            break
            
    if not coin_id:
        return None, 0.0
        
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=inr&include_24hr_change=true"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            price = float(data[coin_id]['inr'])
            change_24h = float(data[coin_id].get('inr_24h_change', 0.0))
            return price, change_24h
    except Exception as e:
        logger.warning(f"Error fetching coingecko price for {coin_id}: {e}")
    return None, 0.0


def _sync_fetch_commodity_price(commodity_type: str) -> tuple:
    ticker = "GC=F" if commodity_type.lower() == "gold" else "SI=F"
    price, currency, change_24h = _sync_fetch_yahoo_price(ticker)
    if price:
        rate = _sync_get_usdinr_rate()
        price_inr_per_gram = (price * rate) / 31.1034768
        return price_inr_per_gram, change_24h
    return None, 0.0


async def get_asset_value_via_api(asset_type: str, asset_name: str, purchase_value: float, quantity: float = None) -> dict:
    """Resolve and fetch real-time asset market rate via Yahoo Finance or CoinGecko API"""
    try:
        usdinr_rate = await asyncio.to_thread(_sync_get_usdinr_rate)
        price_per_unit = None
        change_24h = 0.0
        source = "API"
        
        # 1. Commodities (Gold/Silver)
        if asset_type.lower() in ["gold", "silver"]:
            price_per_unit, change_24h = await asyncio.to_thread(_sync_fetch_commodity_price, asset_type)
            if price_per_unit:
                source = f"Live COMEX {asset_type.capitalize()} Rate via Yahoo Finance"
                
        # 2. Cryptocurrency
        elif asset_type.lower() in ["cryptocurrency", "crypto"]:
            price_per_unit, change_24h = await asyncio.to_thread(_sync_fetch_coingecko_price, asset_name)
            if price_per_unit:
                source = "Live Crypto Rate via CoinGecko"
            else:
                ticker = await asyncio.to_thread(_sync_search_yahoo_ticker, asset_name, asset_type)
                if ticker:
                    price, currency, change_24h = await asyncio.to_thread(_sync_fetch_yahoo_price, ticker)
                    if price:
                        price_per_unit = price if currency == "INR" else price * usdinr_rate
                        source = f"Live Crypto Rate ({ticker}) via Yahoo Finance"
                        
        # 3. Stocks / Mutual Funds
        elif asset_type.lower() in ["stocks", "stock", "mutual funds", "mutual fund", "mf"]:
            ticker = await asyncio.to_thread(_sync_search_yahoo_ticker, asset_name, asset_type)
            if ticker:
                price, currency, change_24h = await asyncio.to_thread(_sync_fetch_yahoo_price, ticker)
                if price:
                    price_per_unit = price if currency == "INR" else price * usdinr_rate
                    source = f"Live Market Rate ({ticker}) via Yahoo Finance"
                    
        if price_per_unit is not None:
            qty = quantity if quantity else (purchase_value / price_per_unit if price_per_unit > 0 else 1.0)
            current_value = price_per_unit * qty
            return {
                "current_market_value": round(current_value, 2),
                "estimated_quantity": round(qty, 4),
                "price_per_unit": round(price_per_unit, 2),
                "market_rate_source": source,
                "confidence": "high",
                "is_api_resolved": True,
                "price_change_24h": round(change_24h, 2)
            }
    except Exception as e:
        logger.warning(f"Error in get_asset_value_via_api for {asset_name}: {e}")
        
    return None



async def get_initial_asset_value(asset_type: str, asset_name: str, purchase_value: float, location: str = None, purchase_date: str = None) -> dict:
    """
    Get initial market value for a new asset when user adds it
    User only provides: type, name, purchase value, location
    System fetches: current market value automatically
    """
    try:
        api_data = await get_asset_value_via_api(asset_type, asset_name, purchase_value)
        if api_data:
            logger.info(f"API resolved initial value for {asset_name}: ₹{api_data['current_market_value']:,.2f}")
            return api_data
    except Exception as e:
        logger.error(f"API resolution failed for initial value of {asset_name}: {e}. Falling back to AI.")

    try:
        location_info = location if location else "India"
        purchase_date_info = purchase_date if purchase_date else "unknown"
        
        prompt = f"""You are a financial market valuation expert for Indian assets. Estimate the current market value.

Asset Information:
- Type: {asset_type}
- Name: {asset_name}
- Purchase Value: ₹{purchase_value:,.2f}
- Purchase Date: {purchase_date_info}
- Location: {location_info}

Based on current market conditions in India, provide the estimated current market value.

Return ONLY valid JSON:
{{
  "current_market_value": 72500.00,
  "estimated_quantity": 10.0,
  "price_per_unit": 7250.00,
  "market_rate_source": "Current Indian market rate for gold",
  "confidence": "high",
  "change_since_purchase_percent": 20.83
}}

Guidelines:
- Gold/Silver: Use current gram price in India (e.g., ₹7250/gram for gold)
- Stocks: Use current NSE/BSE market price
- Mutual Funds: Use latest NAV
- Real Estate: Use {location_info} property rates per sqft
- Vehicles: Apply depreciation based on age
- Cryptocurrency: Use current INR rate
- Business: Estimate based on type and market
- Other assets: Reasonable market-based estimate

If exact data unavailable, provide best estimate with "medium" confidence."""

        response = await call_ai(prompt, max_tokens=600)
        
        # Extract JSON
        start = response.find("{")
        end = response.rfind("}") + 1
        if start == -1 or end == 0:
            logger.warning("No JSON in AI response, using purchase value")
            return {
                "current_market_value": purchase_value,
                "estimated_quantity": 1.0,
                "price_per_unit": purchase_value,
                "market_rate_source": "Using purchase value (AI response invalid)",
                "confidence": "low",
                "change_since_purchase_percent": 0
            }
        
        json_str = response[start:end]
        data = json.loads(json_str)
        
        logger.info(f"Initial value for {asset_name}: ₹{data.get('current_market_value', 0):,.2f}")
        return data
        
    except Exception as e:
        logger.error(f"Error getting initial value: {e}")
        return {
            "current_market_value": purchase_value,
            "estimated_quantity": 1.0,
            "price_per_unit": purchase_value,
            "market_rate_source": f"Using purchase value (Error: {str(e)[:50]})",
            "confidence": "low",
            "change_since_purchase_percent": 0
        }


async def get_live_price_from_ai(asset_type: str, asset_name: str, quantity: float, location: str = None) -> dict:
    """
    Get updated market value for an existing asset
    Used for ongoing updates (background tracker)
    """
    try:
        location_info = location if location else "India"
        
        prompt = f"""You are a financial market data assistant. Provide current market value for this asset.

Asset: {asset_name}
Type: {asset_type}
Quantity/Size: {quantity}
Location: {location_info}

Return ONLY valid JSON with current market data:
{{
  "price_per_unit": 7250.00,
  "total_value": 72500.00,
  "currency": "INR",
  "change_24h_percent": 1.5,
  "last_updated": "2026-06-21 15:30:00",
  "source": "Current Indian market rate"
}}

Provide current market rates for {location_info}:
- Gold/Silver: Current per gram rate
- Stocks: NSE/BSE current price
- Real Estate: Per sqft rate for {location_info}
- Vehicles: Current resale value
- Other: Current market value

If unavailable, set total_value to 0 and explain in source."""

        response = await call_ai(prompt, max_tokens=500)
        
        start = response.find("{")
        end = response.rfind("}") + 1
        if start == -1 or end == 0:
            return None
        
        json_str = response[start:end]
        data = json.loads(json_str)
        return data
        
    except Exception as e:
        logger.error(f"Error getting live price: {e}")
        return None


async def update_asset_value(asset_id: str, user_id: str) -> bool:
    """Update a single asset's current value"""
    db = get_db()
    
    try:
        from bson import ObjectId
        asset = await db.assets.find_one({"_id": ObjectId(asset_id), "user_id": user_id})
        
        if not asset:
            return False
        
        asset_type = asset.get("asset_type")
        name = asset.get("name", "")
        quantity = asset.get("quantity", 1.0) or asset.get("estimated_quantity", 1.0)
        purchase_value = asset.get("purchase_value", 0.0)
        location = asset.get("location")
        
        # 1. Try API resolution first
        api_data = None
        try:
            api_data = await get_asset_value_via_api(asset_type, name, purchase_value, quantity)
        except Exception as e:
            logger.error(f"API lookup failed for update on {name}: {e}")
            
        if api_data:
            new_value = api_data.get("current_market_value", 0.0)
            price_per_unit = api_data.get("price_per_unit")
            source = api_data.get("market_rate_source", "API")
            change_24h = api_data.get("price_change_24h", 0.0)
        else:
            # 2. Fallback to AI price fetching
            price_data = await get_live_price_from_ai(asset_type, name, quantity, location)
            
            if not price_data or price_data.get("total_value", 0) == 0:
                logger.warning(f"Could not get price for {name}")
                return False
            
            new_value = price_data.get("total_value", 0)
            price_per_unit = price_data.get("price_per_unit")
            source = price_data.get("source", "AI")
            change_24h = price_data.get("change_24h_percent", 0)
        
        await db.assets.update_one(
            {"_id": ObjectId(asset_id)},
            {
                "$set": {
                    "current_value": new_value,
                    "price_per_unit": price_per_unit,
                    "last_price_update": datetime.utcnow(),
                    "price_change_24h": change_24h,
                    "price_source": source,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        logger.info(f"Updated {name}: ₹{new_value:,.2f} (Change: {price_data.get('change_24h_percent', 0)}%)")
        return True
        
    except Exception as e:
        logger.error(f"Error updating asset {asset_id}: {e}")
        return False


async def update_user_assets(user_id: str) -> dict:
    """Update all assets for a user"""
    db = get_db()
    
    try:
        # Get ALL user assets (all types are trackable)
        assets = await db.assets.find({"user_id": user_id}).to_list(100)
        
        updated = 0
        failed = 0
        skipped = 0
        
        for asset in assets:
            asset_id = str(asset["_id"])
            
            # Check if already updated recently (within 5 minutes)
            last_update = asset.get("last_price_update")
            if last_update and datetime.utcnow() - last_update < timedelta(minutes=5):
                skipped += 1
                continue
            
            success = await update_asset_value(asset_id, user_id)
            if success:
                updated += 1
            else:
                failed += 1
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
        
        return {
            "total": len(assets),
            "updated": updated,
            "failed": failed,
            "skipped": skipped,
        }
        
    except Exception as e:
        logger.error(f"Error updating user assets: {e}")
        return {"error": str(e)}


async def background_asset_updater():
    """
    Background task that updates all user assets periodically
    Runs every 30 minutes
    """
    logger.info("🔄 Asset Value Tracker started")
    
    while True:
        try:
            db = get_db()
            
            # Get all unique user IDs who have assets
            pipeline = [
                {"$group": {"_id": "$user_id"}},
            ]
            
            user_ids = await db.assets.aggregate(pipeline).to_list(1000)
            
            logger.info(f"📊 Updating assets for {len(user_ids)} users")
            
            for user_doc in user_ids:
                user_id = user_doc["_id"]
                result = await update_user_assets(user_id)
                logger.info(f"User {user_id}: {result}")
                
                # Delay between users
                await asyncio.sleep(2)
            
            logger.info("✅ Asset update cycle complete")
            
        except Exception as e:
            logger.error(f"❌ Error in background updater: {e}")
        
        # Wait 30 minutes before next update cycle
        await asyncio.sleep(1800)


# Manual update endpoint helper
async def trigger_manual_update(user_id: str) -> dict:
    """Manually trigger asset update for a user"""
    logger.info(f"🔄 Manual update triggered for user {user_id}")
    return await update_user_assets(user_id)
