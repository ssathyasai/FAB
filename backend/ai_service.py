"""
Multi-Provider AI Service
Supports: Gemini, OpenAI, Groq with automatic fallback
Priority: Groq (free) → Gemini (free) → OpenAI (paid)
"""
import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()


# ─── Provider Configuration ─────────────────────────────────────

def _get_provider_config():
    """Get available AI providers in priority order"""
    providers = []
    
    # Groq (highest priority - free & unlimited)
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        providers.append({
            "name": "groq",
            "key": groq_key,
            "free": True
        })
    
    # Gemini (second priority - free with quota)
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key:
        providers.append({
            "name": "gemini",
            "key": gemini_key,
            "free": True
        })
    
    # OpenAI (lowest priority - paid)
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key:
        providers.append({
            "name": "openai",
            "key": openai_key,
            "free": False
        })
    
    return providers


def _has_any_provider():
    """Check if any AI provider is configured"""
    return len(_get_provider_config()) > 0


# ─── Universal AI Call with Fallback ───────────────────────────

async def call_ai(prompt: str, max_tokens: int = 1500) -> str:
    """
    Call AI with automatic provider fallback
    Tries providers in order: Groq → Gemini → OpenAI
    """
    providers = _get_provider_config()
    
    if not providers:
        raise ValueError("No AI provider configured. Add GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to .env")
    
    last_error = None
    
    # Try each provider in order
    for provider in providers:
        try:
            if provider["name"] == "groq":
                return await _call_groq(prompt, provider["key"], max_tokens)
            elif provider["name"] == "gemini":
                return await _call_gemini(prompt, provider["key"])
            elif provider["name"] == "openai":
                return await _call_openai(prompt, provider["key"], max_tokens)
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
            # If quota/rate limit error, try next provider
            if any(x in error_msg for x in ["quota", "429", "rate limit", "resource_exhausted"]):
                continue
            
            # If auth error, try next provider
            if any(x in error_msg for x in ["401", "403", "invalid", "authentication"]):
                continue
            
            # Other errors, continue to next provider
            continue
    
    # All providers failed
    raise ValueError(f"All AI providers failed. Last error: {str(last_error)[:200]}")


# ─── Groq Implementation ────────────────────────────────────────

async def _call_groq(prompt: str, api_key: str, max_tokens: int = 1500) -> str:
    """Call Groq API (Free & Fast)"""
    try:
        from groq import Groq
        
        client = Groq(api_key=api_key)
        loop = asyncio.get_event_loop()
        
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="llama-3.3-70b-versatile",  # Updated model (current)
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.7,
            )
        )
        
        return response.choices[0].message.content
    except ImportError:
        raise ValueError("Groq library not installed. Run: pip install groq")
    except Exception as e:
        raise ValueError(f"Groq error: {str(e)[:200]}")


# ─── Gemini Implementation ──────────────────────────────────────

async def _call_gemini(prompt: str, api_key: str) -> str:
    """Call Google Gemini API"""
    try:
        from google import genai
        
        client = genai.Client(api_key=api_key)
        loop = asyncio.get_event_loop()
        
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=prompt
            )
        )
        
        return response.text
    except ImportError:
        raise ValueError("Google GenAI library not installed. Run: pip install google-genai")
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            raise ValueError("Gemini quota exceeded")
        if "401" in err or "API_KEY_INVALID" in err:
            raise ValueError("Invalid Gemini API key")
        raise ValueError(f"Gemini error: {err[:200]}")


# ─── OpenAI Implementation ──────────────────────────────────────

async def _call_openai(prompt: str, api_key: str, max_tokens: int = 1500) -> str:
    """Call OpenAI API"""
    try:
        from openai import OpenAI
        
        # Create client without proxies parameter (not needed)
        client = OpenAI(api_key=api_key)
        loop = asyncio.get_event_loop()
        
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model="gpt-4o-mini",  # Affordable & good quality
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.7,
            )
        )
        
        return response.choices[0].message.content
    except ImportError:
        raise ValueError("OpenAI library not installed. Run: pip install openai")
    except Exception as e:
        error_msg = str(e)
        # Better error handling
        if "401" in error_msg or "Incorrect API key" in error_msg:
            raise ValueError("Invalid OpenAI API key")
        if "429" in error_msg or "rate_limit" in error_msg.lower():
            raise ValueError("OpenAI rate limit exceeded")
        if "insufficient_quota" in error_msg.lower():
            raise ValueError("OpenAI quota exhausted - add credits or wait")
        raise ValueError(f"OpenAI error: {str(e)[:200]}")


# ─── JSON Parser ────────────────────────────────────────────────

def _parse_json(text: str) -> dict:
    """Extract and parse JSON from AI response"""
    # Try to find JSON in response
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON found in AI response")
    
    json_str = text[start:end]
    return json.loads(json_str)


# ─── High-Level Functions (for backward compatibility) ──────────

async def get_gemini_response(prompt: str) -> str:
    """
    Generic AI response (backward compatible)
    Now uses multi-provider with fallback
    """
    return await call_ai(prompt)


# ─── Budget Insights ────────────────────────────────────────────

async def get_budget_insights(data: dict) -> dict:
    if not _has_any_provider():
        return _rule_based_insights(data)
    
    prompt = f"""You are a personal finance advisor for an Indian user. Analyze this monthly financial data:

Income: ₹{data.get('income', 0):,.0f}
Expenses: ₹{data.get('expenses', 0):,.0f}
Savings: ₹{data.get('savings', 0):,.0f}
Top categories: {json.dumps(data.get('top_categories', []))}
Previous month expenses: ₹{data.get('prev_month', {}).get('expenses', 0):,.0f}

Return ONLY valid JSON:
{{"spending_pattern":"brief classification","top_3_insights":["insight1","insight2","insight3"],"month_comparison":"better or worse vs last month","personalized_advice":["advice1","advice2","advice3"]}}"""
    
    try:
        text = await call_ai(prompt)
        return _parse_json(text)
    except ValueError as e:
        return {**_rule_based_insights(data), "_ai_error": str(e)}
    except Exception:
        return _rule_based_insights(data)


def _rule_based_insights(data: dict) -> dict:
    """Fallback rule-based insights"""
    income = data.get("income", 0)
    expenses = data.get("expenses", 0)
    savings = data.get("savings", 0)
    top_cats = data.get("top_categories", [])
    prev_exp = data.get("prev_month", {}).get("expenses", 0)

    ratio = expenses / income if income > 0 else 0
    if ratio < 0.5:   pattern = "Excellent Saver — spending well below income"
    elif ratio < 0.7: pattern = "Balanced Spender — good control over expenses"
    elif ratio < 0.9: pattern = "Active Spender — monitor discretionary expenses"
    else:             pattern = "High Spender — expenses consuming most income"

    insights = []
    if top_cats:
        insights.append(f"Top expense: {top_cats[0].get('category','N/A')} at ₹{top_cats[0].get('amount',0):,.0f}")
    if income > 0 and savings > 0:
        insights.append(f"Saving ₹{savings:,.0f}/month — {savings/income*100:.1f}% of income")
    insights.append("Review your top 3 categories for savings opportunities")

    if prev_exp > 0:
        diff = expenses - prev_exp
        comp = f"Expenses {'↑ increased' if diff > 0 else '↓ decreased'} by ₹{abs(diff):,.0f} vs last month"
    else:
        comp = "No prior month data for comparison"

    return {
        "spending_pattern": pattern,
        "top_3_insights": insights,
        "month_comparison": comp,
        "personalized_advice": [
            "Set up automatic savings transfer at month start",
            "Review subscriptions and recurring small expenses",
            "Build a 3-month emergency fund as your first savings goal",
        ],
    }


# ─── Asset Advisor ──────────────────────────────────────────────

async def get_asset_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return {"error": "no_key"}
    
    prompt = f"""You are an Expert AI Asset Management Advisor for India.
Asset Type: {req.get('asset_type')}
Details: {json.dumps(req.get('asset_details', {}))}
User: {json.dumps(req.get('user_profile', {}))}
Risk: {req.get('risk_tolerance')} | Goal: {req.get('financial_goal')}

Return ONLY valid JSON:
{{"asset_health_score":75,"market_outlook":"string","top_5_recommendations":[{{"rank":1,"title":"","description":"","why_recommended":"","expected_benefits":[],"estimated_cost":"","estimated_return_potential":"","risk_level":"","time_horizon":"","difficulty_level":"","action_plan":[]}}],"next_steps":[]}}"""
    
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}


# ─── Other Advisor Functions (similar pattern) ─────────────────

async def get_saving_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return {"error": "no_key"}
    prompt = f"""Saving Advisor. User has ₹{req.get('savings_amount',0):,.0f}.
Purpose: {req.get('purpose')} | Horizon: {req.get('time_horizon')} | Risk: {req.get('risk_level')} | Priority: {req.get('financial_priority')}
Income: ₹{req.get('income',0):,.0f} | Expenses: ₹{req.get('expenses',0):,.0f}

Return ONLY valid JSON:
{{"summary":"","top_5_recommendations":[{{"rank":1,"title":"","description":"","expected_return":"","risk":"","time_horizon":"","action_steps":[]}}]}}"""
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except ValueError as e:
        return {"error": str(e)}


async def get_debt_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return {"error": "no_key"}
    prompt = f"""Debt Advisor India. Income: ₹{req.get('income',0):,.0f}/month.
Loans: {json.dumps(req.get('loans',[]), indent=2)}

Return ONLY valid JSON:
{{"debt_health_score":60,"debt_risk_score":40,"total_outstanding":0,"total_monthly_emi":0,"debt_to_income_ratio":0,"loan_priority_ranking":[],"best_strategy":"avalanche","strategy_explanation":"","top_5_actions":[],"debt_free_timeline":""}}"""
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except ValueError as e:
        return {"error": str(e)}


async def get_investment_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return {"error": "no_key"}
    prompt = f"""Investment Advisor India. Amount: ₹{req.get('investment_amount',0):,.0f} | Mode: {req.get('investment_mode')} | Existing: {req.get('existing_investments')} | Experience: {req.get('investment_experience')} | Style: {req.get('preferred_style')}

Return ONLY valid JSON:
{{"investor_profile":"moderate","profile_reasoning":"","risk_analysis":{{"major_risks":[],"precautions":[]}},"portfolio_allocation":[{{"asset":"","percentage":0,"amount":0,"explanation":""}}],"top_5_recommendations":[{{"name":"","type":"","risk":"","expected_return":"","horizon":"","why_suitable":""}}],"example_funds":[{{"name":"","category":"","why_suitable":""}}],"action_plan":{{"immediate":[],"short_term":[],"long_term":[]}}}}"""
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except ValueError as e:
        return {"error": str(e)}


async def get_emergency_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return {"error": "No AI provider configured. Please add API key in Settings."}
    
    emergency_type = req.get('emergency_type', 'Unknown')
    income = req.get('income', 0)
    details = req.get('emergency_details', {})
    
    # Extract savings
    savings = float(details.get('savings', 0))
    
    # Build context
    context_lines = [
        f"Emergency Type: {emergency_type}",
        f"Monthly Income: ₹{income:,.0f}",
        f"Available Savings: ₹{savings:,.0f}"
    ]
    
    # Add only filled details
    for key, value in details.items():
        if value and str(value).strip() and key != 'savings':
            label = key.replace('_', ' ').title()
            context_lines.append(f"{label}: {value}")
    
    context = "\n".join(context_lines)
    
    prompt = f"""You are an Emergency Financial Advisor in India. Provide SPECIFIC, ACTIONABLE recovery plan.

SITUATION:
{context}

Return ONLY valid JSON:
{{
  "financial_summary": {{
    "income": {income},
    "expenses": 0,
    "savings": {savings},
    "gap": 0
  }},
  "situation_assessment": {{
    "severity": "Critical/High/Moderate",
    "assessment": "2-3 line situation analysis"
  }},
  "immediate_actions": [
    "Contact insurance company within 24 hours",
    "Visit nearest bank branch for emergency loan",
    "Apply for personal loan on MoneyTap app"
  ],
  "funding_sources": [
    {{
      "source": "Personal Loan",
      "description": "Quick unsecured loan from banks/NBFCs",
      "where_to_approach": [
        "HDFC Bank - InstaCash (Visit branch or HDFC Mobile App)",
        "ICICI Bank - PayLater (ICICI Mobile Banking)",
        "MoneyTap App - Download from Play Store",
        "Bajaj Finserv App - Personal Loan section",
        "Credi Health App - For medical emergencies"
      ],
      "timeline": "2-4 days for approval"
    }},
    {{
      "source": "Gold Loan",
      "description": "Instant loan against gold jewelry",
      "where_to_approach": [
        "Muthoot Finance - Visit nearest branch",
        "Manappuram Finance - Walk-in facility",
        "HDFC Bank Gold Loan Counter",
        "Rupeek App - Doorstep gold loan service",
        "IIFL Gold Loan - Online application"
      ],
      "timeline": "Same day - within 30 minutes"
    }}
  ],
  "asset_liquidation": [
    {{
      "asset_type": "Fixed Deposit (FD)",
      "expected_value": 100000,
      "how_to_sell": "Break FD online via net banking or visit branch. Penalty: Loss of 1% interest. Get money same day.",
      "where_to_sell": [
        "Your bank's mobile app - FD section",
        "Net banking - Fixed Deposits tab",
        "Visit bank branch with FD receipt",
        "Call customer care for online FD break"
      ]
    }},
    {{
      "asset_type": "Gold Jewelry",
      "expected_value": 75000,
      "how_to_sell": "Visit gold buyers with jewelry. Get 3 quotes. Current rate: ₹6,500/gram approx.",
      "where_to_sell": [
        "Tanishq Goldexchange - Buyback at stores",
        "Muthoot Finance - Gold buying counter",
        "Manappuram - Gold purchase service",
        "Local jewelry shops - Get competitive quotes",
        "PaytmMoney Gold - Online selling"
      ]
    }},
    {{
      "asset_type": "Mutual Funds",
      "expected_value": 50000,
      "how_to_sell": "Redeem units online. Money in 3-4 business days for equity, 1-2 days for debt funds.",
      "where_to_sell": [
        "Zerodha Coin - Mutual funds section",
        "Groww App - Holdings → Redeem",
        "PaytmMoney - Mutual funds",
        "Fund house website (e.g., HDFC MF, ICICI Prudential)",
        "Your bank's MF portal"
      ]
    }}
  ],
  "recommendations": [
    "Use savings first before taking loans - avoid interest burden",
    "Break FD only if penalty is less than loan interest",
    "Gold loan better than selling gold - can reclaim later",
    "Compare personal loan rates: HDFC (10-15%), Bajaj (13-16%)",
    "For medical: Check Ayushman Bharat eligibility (free for eligible families)"
  ],
  "recovery_timeline": {{
    "week_1": [
      "Arrange immediate funds from savings/FD",
      "Apply for loans if needed",
      "File insurance claims"
    ],
    "month_1": [
      "Receive loan disbursement",
      "Start recovery process",
      "Cut non-essential expenses"
    ],
    "month_3": [
      "Begin loan repayment",
      "Rebuild emergency fund",
      "Return to normal budget"
    ]
  }}
}}

CRITICAL: 
- "where_to_approach" and "where_to_sell" MUST have 4-5 SPECIFIC places
- Include apps (MoneyTap, Groww, Rupeek), banks (HDFC, ICICI), companies (Muthoot, Tanishq)
- Give EXACT steps: "Download X app → KYC → Apply → Get money in Y hours"
- Be PRACTICAL for Indian context"""
    
    try:
        text = await call_ai(prompt, max_tokens=3000)
        return _parse_json(text)
    except ValueError as e:
        return {"error": str(e)}
