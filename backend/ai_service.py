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
        return _rule_based_savings(req)
    
    prompt = f"""Saving Advisor. User has ₹{req.get('savings_amount',0):,.0f}.
Purpose: {req.get('purpose')} | Horizon: {req.get('time_horizon')} | Risk: {req.get('risk_level')} | Priority: {req.get('financial_priority')}
Income: ₹{req.get('income',0):,.0f} | Expenses: ₹{req.get('expenses',0):,.0f}

Return ONLY valid JSON:
{{"summary":"","top_5_recommendations":[{{"rank":1,"title":"","description":"","expected_return":"","risk":"","time_horizon":"","action_steps":[]}}]}}"""
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except Exception:
        return _rule_based_savings(req)


def _rule_based_savings(req: dict) -> dict:
    """Rule-based savings recommendations"""
    amount = req.get('savings_amount', 0)
    purpose = req.get('purpose', 'General Savings')
    risk = req.get('risk_level', 'Low Risk')
    horizon = req.get('time_horizon', '< 1 year')
    
    recommendations = []
    
    if 'Emergency' in purpose:
        recommendations.append({
            "rank": 1,
            "title": "High-Yield Savings Account",
            "description": "Keep emergency funds in liquid savings account for immediate access",
            "expected_return": "3-4% p.a.",
            "risk": "Zero",
            "time_horizon": "Anytime",
            "action_steps": ["Open savings account", "Set up auto-transfer", "Maintain 3-6 months expenses"]
        })
    
    if amount >= 5000:
        recommendations.append({
            "rank": len(recommendations) + 1,
            "title": "Fixed Deposit (FD)",
            "description": "Safe guaranteed returns with flexible tenure options",
            "expected_return": "6-7% p.a.",
            "risk": "Very Low",
            "time_horizon": "1-5 years",
            "action_steps": ["Compare bank FD rates", "Choose tenure matching your goal", "Consider tax-saving FDs"]
        })
    
    if amount >= 5000 and 'Low' not in risk:
        recommendations.append({
            "rank": len(recommendations) + 1,
            "title": "Liquid Mutual Funds",
            "description": "Better than savings account, withdraw anytime",
            "expected_return": "4-6% p.a.",
            "risk": "Very Low",
            "time_horizon": "Short term",
            "action_steps": ["Open Groww/Zerodha account", "Start with ₹5000 minimum", "Redeem anytime needed"]
        })
    
    if amount >= 500 and '5' in horizon:
        recommendations.append({
            "rank": len(recommendations) + 1,
            "title": "Public Provident Fund (PPF)",
            "description": "Tax-free returns, government backed, 15-year lock-in",
            "expected_return": "7.1% p.a. (tax-free)",
            "risk": "Zero",
            "time_horizon": "15 years",
            "action_steps": ["Open PPF account in bank/post office", "Contribute ₹500-₹1.5L/year", "Get tax deduction u/s 80C"]
        })
    
    if amount >= 1000 and 'High' in risk:
        recommendations.append({
            "rank": len(recommendations) + 1,
            "title": "Equity Mutual Funds (SIP)",
            "description": "Long-term wealth creation through stock market",
            "expected_return": "10-12% p.a. (long term)",
            "risk": "Medium-High",
            "time_horizon": "5+ years",
            "action_steps": ["Start SIP in index funds", "Invest monthly, not lump sum", "Stay invested for 5+ years"]
        })
    
    return {
        "summary": f"Based on your ₹{amount:,.0f} savings for {purpose}, here are top recommendations matching your {risk} profile and {horizon} timeline.",
        "top_5_recommendations": recommendations[:5],
        "_note": "AI API limit reached. Using rule-based recommendations. Add GROQ_API_KEY for personalized AI advice."
    }


async def get_debt_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return _rule_based_debt_advisor(req)
    
    prompt = f"""Debt Advisor India. Income: ₹{req.get('income',0):,.0f}/month.
Loans: {json.dumps(req.get('loans',[]), indent=2)}

Return ONLY valid JSON:
{{"debt_health_score":60,"debt_risk_score":40,"total_outstanding":0,"total_monthly_emi":0,"debt_to_income_ratio":0,"loan_priority_ranking":[],"best_strategy":"avalanche","strategy_explanation":"","top_5_actions":[],"debt_free_timeline":""}}"""
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except Exception as e:
        # Fallback to rule-based if AI fails
        return _rule_based_debt_advisor(req)


def _rule_based_debt_advisor(req: dict) -> dict:
    """Fallback rule-based debt advisor"""
    income = req.get('income', 0)
    loans = req.get('loans', [])
    
    if not loans:
        return {"error": "No loans provided"}
    
    total_outstanding = sum(loan.get('outstanding_balance', 0) for loan in loans)
    total_emi = sum(loan.get('emi', 0) for loan in loans)
    dti_ratio = (total_emi / income * 100) if income > 0 else 0
    
    # Calculate scores
    debt_health_score = max(0, 100 - int(dti_ratio))
    debt_risk_score = min(100, int(dti_ratio * 1.5))
    
    # Rank loans by interest rate (avalanche method)
    ranked = sorted(loans, key=lambda x: x.get('interest_rate', 0), reverse=True)
    
    actions = [
        f"Focus on paying off {ranked[0].get('loan_type', 'highest interest loan')} first (highest rate at {ranked[0].get('interest_rate', 0)}%)",
        f"Your debt-to-income ratio is {dti_ratio:.1f}% - {'good' if dti_ratio < 40 else 'needs attention'}",
        "Continue minimum payments on all other loans",
        "Try to increase EMI by 10-20% if possible to reduce interest burden",
        "Avoid taking new loans until existing debt is under control"
    ]
    
    return {
        "debt_health_score": debt_health_score,
        "debt_risk_score": debt_risk_score,
        "total_outstanding": total_outstanding,
        "total_monthly_emi": total_emi,
        "debt_to_income_ratio": round(dti_ratio, 1),
        "loan_priority_ranking": [loan.get('loan_type', 'Loan') for loan in ranked],
        "best_strategy": "avalanche",
        "strategy_explanation": "Pay off highest interest rate loans first to minimize total interest paid",
        "top_5_actions": actions,
        "debt_free_timeline": f"Approximately {int(total_outstanding / (total_emi * 12))}-{int(total_outstanding / (total_emi * 12)) + 1} years with current EMI",
        "_note": "AI API limit reached. Using rule-based calculations. Add GROQ_API_KEY for AI-powered insights."
    }


async def get_investment_recommendations(req: dict) -> dict:
    if not _has_any_provider():
        return _rule_based_investment(req)
    
    prompt = f"""Investment Advisor India. Amount: ₹{req.get('investment_amount',0):,.0f} | Mode: {req.get('investment_mode')} | Existing: {req.get('existing_investments')} | Experience: {req.get('investment_experience')} | Style: {req.get('preferred_style')}

Return ONLY valid JSON:
{{"investor_profile":"moderate","profile_reasoning":"","risk_analysis":{{"major_risks":[],"precautions":[]}},"portfolio_allocation":[{{"asset":"","percentage":0,"amount":0,"explanation":""}}],"top_5_recommendations":[{{"name":"","type":"","risk":"","expected_return":"","horizon":"","why_suitable":""}}],"example_funds":[{{"name":"","category":"","why_suitable":""}}],"action_plan":{{"immediate":[],"short_term":[],"long_term":[]}}}}"""
    try:
        text = await call_ai(prompt, max_tokens=2000)
        return _parse_json(text)
    except Exception:
        return _rule_based_investment(req)


def _rule_based_investment(req: dict) -> dict:
    """Rule-based investment recommendations"""
    amount = req.get('investment_amount', 0)
    experience = req.get('investment_experience', 'Beginner')
    mode = req.get('investment_mode', 'Monthly SIP')
    
    # Determine investor profile
    if experience == 'Beginner':
        profile = "Conservative"
        equity_pct = 40
    elif experience == 'Intermediate':
        profile = "Moderate"
        equity_pct = 60
    else:
        profile = "Aggressive"
        equity_pct = 80
    
    debt_pct = 100 - equity_pct
    
    recommendations = [
        {
            "name": "Nifty 50 Index Fund",
            "type": "Equity - Large Cap",
            "risk": "Medium",
            "expected_return": "10-12% p.a.",
            "horizon": "5+ years",
            "why_suitable": "Low cost, diversified across top 50 companies, good for beginners"
        },
        {
            "name": "Debt Mutual Funds",
            "type": "Debt",
            "risk": "Low",
            "expected_return": "6-8% p.a.",
            "horizon": "1-3 years",
            "why_suitable": "Stable returns, lower risk than equity, better than FD"
        },
        {
            "name": "ELSS Tax Saver Fund",
            "type": "Equity - Tax Saving",
            "risk": "Medium-High",
            "expected_return": "10-14% p.a.",
            "horizon": "3+ years",
            "why_suitable": "Tax deduction u/s 80C, shortest lock-in period (3 years)"
        },
        {
            "name": "Gold ETF",
            "type": "Commodity",
            "risk": "Medium",
            "expected_return": "8-10% p.a.",
            "horizon": "3+ years",
            "why_suitable": "Hedge against inflation, portfolio diversification"
        },
        {
            "name": "Midcap Fund",
            "type": "Equity - Mid Cap",
            "risk": "High",
            "expected_return": "12-15% p.a.",
            "horizon": "7+ years",
            "why_suitable": "Higher growth potential, suitable for long-term aggressive investors"
        }
    ]
    
    return {
        "investor_profile": profile,
        "profile_reasoning": f"Based on your {experience} experience level, we recommend a {profile} portfolio with {equity_pct}% equity and {debt_pct}% debt allocation.",
        "portfolio_allocation": [
            {"asset": "Equity Funds", "percentage": equity_pct, "amount": amount * equity_pct / 100, "explanation": "For long-term growth"},
            {"asset": "Debt Funds", "percentage": debt_pct, "amount": amount * debt_pct / 100, "explanation": "For stability and lower risk"}
        ],
        "top_5_recommendations": recommendations,
        "example_funds": [
            {"name": "HDFC Index Fund - Nifty 50 Plan", "category": "Index Fund", "why_suitable": "Low expense ratio, tracks Nifty 50"},
            {"name": "ICICI Prudential Debt Fund", "category": "Debt", "why_suitable": "Stable returns, good credit quality"}
        ],
        "action_plan": {
            "immediate": [
                "Open demat account on Zerodha/Groww",
                "Complete KYC verification",
                f"Start {'SIP' if mode == 'Monthly SIP' else 'lump sum'} investment"
            ],
            "short_term": [
                "Set up automatic monthly SIP",
                "Track portfolio performance monthly",
                "Rebalance every 6 months"
            ],
            "long_term": [
                "Stay invested for 5+ years",
                "Increase SIP amount with salary hikes",
                "Review and adjust asset allocation yearly"
            ]
        },
        "_note": "AI API limit reached. Using rule-based recommendations. Add GROQ_API_KEY for personalized AI advice."
    }

