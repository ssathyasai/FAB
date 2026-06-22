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


# ─── Vision Analysis ─────────────────────────────────────────────

async def analyze_receipt(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Analyze a receipt/bill image and return amount, category, and note."""
    providers = _get_provider_config()
    
    if not providers:
        raise ValueError("No AI provider configured. Add GEMINI_API_KEY or OPENAI_API_KEY.")
        
    import base64
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    prompt = '''You are an expert receipt analyzer.
Analyze the provided receipt/bill image and extract:
1. The total amount paid (as a number).
2. The category of the expense (e.g., Food, Transport, Utilities, Shopping, Entertainment, Healthcare).
3. The merchant or vendor name (as a short note).

Respond ONLY with a valid JSON object matching exactly this schema:
{"amount": 12.50, "category": "Food", "note": "Merchant Name"}
Ensure "amount" is a float, "category" and "note" are strings. Do not include markdown formatting like ```json.
'''

    last_error = None
    
    for provider in providers:
        try:
            if provider["name"] == "gemini":
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=provider["key"])
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model="gemini-2.0-flash-lite",
                        contents=[
                            prompt,
                            types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                        ]
                    )
                )
                return _parse_json(response.text)
                
            elif provider["name"] == "openai":
                from openai import OpenAI
                client = OpenAI(api_key=provider["key"])
                loop = asyncio.get_event_loop()
                
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ]
                
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        max_tokens=300,
                        temperature=0.0
                    )
                )
                return _parse_json(response.choices[0].message.content)
                
        except Exception as e:
            last_error = e
            continue
            
    if last_error:
        raise ValueError(f"Receipt analysis failed. (Note: Ensure GEMINI or OPENAI keys are valid). Last Error: {last_error}")
    raise ValueError("No vision-capable AI provider configured. Add GEMINI_API_KEY or OPENAI_API_KEY.")

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


async def get_emergency_recommendations(req: dict) -> dict:
    """Emergency recommendations with fallback"""
    emergency_type = req.get('emergency_type', 'Unknown')
    income = req.get('income', 0)
    details = req.get('emergency_details', {})
    
    # Extract savings and assets
    savings = float(details.get('available_savings', details.get('savings', 0)))
    monthly_expenses = float(details.get('monthly_expenses', 0))
    assets = details.get('assets', [])
    assets_str = json.dumps(assets) if assets else "None"
    
    # If no AI provider, use rule-based
    if not _has_any_provider():
        return _rule_based_emergency(req)
    
    # Build context
    context_lines = [
        f"Emergency Type: {emergency_type}",
        f"Monthly Income: ₹{income:,.0f}",
        f"Monthly Expenses: ₹{monthly_expenses:,.0f}",
        f"Available Savings: ₹{savings:,.0f}",
        f"User Assets: {assets_str}"
    ]
    
    # Add only filled details
    for key, value in details.items():
        if value and str(value).strip() and key not in ['savings', 'available_savings', 'monthly_income', 'monthly_expenses', 'monthly_surplus', 'total_assets_value', 'assets']:
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
    "expenses": {monthly_expenses},
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
      "asset_type": "Name/Type of user's asset to sell",
      "expected_value": 0,
      "how_to_sell": "How to sell this specific asset",
      "where_to_sell": [
        "Place 1 to sell",
        "Place 2 to sell"
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
- ONLY suggest liquidating assets that are explicitly listed in "User Assets" above. Do not invent assets they do not own. If they have no assets, return an empty array [] for asset_liquidation.
- Be PRACTICAL for Indian context"""
    
    try:
        text = await call_ai(prompt, max_tokens=3000)
        return _parse_json(text)
    except Exception as e:
        # Fallback to rule-based on error
        return _rule_based_emergency(req)


def _rule_based_emergency(req: dict) -> dict:
    """Rule-based emergency recommendations when AI is unavailable"""
    emergency_type = req.get('emergency_type', 'Unknown')
    income = req.get('income', 0)
    details = req.get('emergency_details', {})
    savings = float(details.get('savings', 0))
    
    # Determine severity
    monthly_expenses = details.get('monthly_expenses', income * 0.6)
    if emergency_type in ['Medical Emergency', 'Job Loss']:
        severity = "Critical"
    elif emergency_type in ['Home Repair', 'Vehicle Repair']:
        severity = "High"
    else:
        severity = "Moderate"
    
    return {
        "financial_summary": {
            "income": income,
            "expenses": monthly_expenses,
            "savings": savings,
            "gap": max(0, monthly_expenses - savings)
        },
        "situation_assessment": {
            "severity": severity,
            "assessment": f"You have ₹{savings:,.0f} in savings. For {emergency_type}, immediate action is needed to arrange funds and minimize financial impact."
        },
        "immediate_actions": [
            "Use available savings for immediate needs",
            "Contact your bank for emergency loan options",
            "Check if you have insurance coverage for this emergency",
            "Cut non-essential expenses immediately",
            "Inform family members about the situation"
        ],
        "funding_sources": [
            {
                "source": "Personal Loan",
                "description": "Quick unsecured loan from banks/NBFCs",
                "where_to_approach": [
                    "HDFC Bank - InstaCash (Visit branch or HDFC Mobile App)",
                    "ICICI Bank - PayLater (ICICI Mobile Banking)",
                    "MoneyTap App - Download from Play Store",
                    "Bajaj Finserv App - Personal Loan section",
                    "Credi Health App - For medical emergencies"
                ],
                "timeline": "2-4 days for approval",
                "interest_rate": "10-15% p.a."
            },
            {
                "source": "Gold Loan",
                "description": "Instant loan against gold jewelry (75% of gold value)",
                "where_to_approach": [
                    "Muthoot Finance - Visit nearest branch with gold",
                    "Manappuram Finance - Walk-in facility available",
                    "HDFC Bank Gold Loan Counter",
                    "Rupeek App - Doorstep gold loan service",
                    "IIFL Gold Loan - Online application with branch visit"
                ],
                "timeline": "Same day - within 30 minutes",
                "interest_rate": "7-12% p.a."
            },
            {
                "source": "Emergency Credit Card",
                "description": "Use existing credit card or apply for new one",
                "where_to_approach": [
                    "Your existing credit card - Check available limit",
                    "HDFC Bank Instant Credit Card - Via app",
                    "OneCard - Apply via OneCard app",
                    "ICICI Bank Instant Credit Card",
                    "Axis Bank Instant Credit Card"
                ],
                "timeline": "Instant (existing) or 3-7 days (new)",
                "interest_rate": "18-36% p.a. if unpaid"
            },
            {
                "source": "Salary Advance",
                "description": "Request advance from employer",
                "where_to_approach": [
                    "Contact your HR department",
                    "Submit written request with emergency details",
                    "Check company policy on salary advance",
                    "Usually repaid from next 2-3 salaries"
                ],
                "timeline": "1-5 days based on company policy",
                "interest_rate": "Usually interest-free"
            }
        ],
        "asset_liquidation": [
            {
                "asset_type": "Fixed Deposit (FD)",
                "expected_value": "Full FD amount minus penalty",
                "how_to_sell": "Break FD online via net banking or visit branch. Penalty: Loss of 1% interest. Get money same day.",
                "where_to_sell": [
                    "Your bank's mobile app - FD section → Break FD",
                    "Net banking - Fixed Deposits tab → Premature withdrawal",
                    "Visit bank branch with FD receipt and ID",
                    "Call customer care number for online FD break",
                    "Money credited to account within hours"
                ]
            },
            {
                "asset_type": "Gold Jewelry",
                "expected_value": "₹6,000-6,500 per gram (current rate)",
                "how_to_sell": "Visit gold buyers with jewelry. Get 3 quotes before selling. Carry purchase bill if available.",
                "where_to_sell": [
                    "Tanishq Goldexchange - Buyback at any Tanishq store",
                    "Muthoot Finance - Gold buying counter at branches",
                    "Manappuram - Gold purchase service",
                    "Local trusted jewelry shops - Get competitive quotes",
                    "PaytmMoney Gold - Online selling (for digital gold only)"
                ]
            },
            {
                "asset_type": "Mutual Funds",
                "expected_value": "Current NAV value of units",
                "how_to_sell": "Redeem units online. Money in 3-4 business days for equity, 1-2 days for debt/liquid funds.",
                "where_to_sell": [
                    "Zerodha Coin - Mutual funds section → Redeem",
                    "Groww App - Holdings → Select fund → Redeem",
                    "PaytmMoney - Mutual funds → Redeem",
                    "Fund house website (e.g., HDFC MF, ICICI Prudential MF)",
                    "Your bank's MF portal - Mutual funds section"
                ]
            },
            {
                "asset_type": "Stocks/Shares",
                "expected_value": "Current market price",
                "how_to_sell": "Sell during market hours (9:15 AM - 3:30 PM). Money in T+2 days (2 working days).",
                "where_to_sell": [
                    "Zerodha Kite App - Holdings → Sell",
                    "Groww Stocks - Portfolio → Sell",
                    "Upstox App - Holdings section",
                    "Angel One App - Portfolio → Sell",
                    "ICICI Direct / HDFC Securities apps"
                ]
            },
            {
                "asset_type": "PPF/EPF (Partial Withdrawal)",
                "expected_value": "Up to 50% of balance (if eligible)",
                "how_to_sell": "Partial withdrawal allowed after 5 years for medical/education/home. Full withdrawal at maturity only.",
                "where_to_sell": [
                    "PPF: Visit bank/post office with passbook and withdrawal form",
                    "EPF: Apply online via EPFO portal - Partial withdrawal",
                    "Submit necessary documents (medical bills, etc.)",
                    "Processing takes 7-15 days",
                    "For emergencies, contact EPFO helpline"
                ]
            }
        ],
        "recommendations": [
            "Priority order: Use savings → Break FD/Liquidate investments → Take loan → Sell assets",
            "Gold loan is better than selling gold - you can reclaim it later",
            "Compare personal loan interest rates before applying",
            "For medical emergencies, check government schemes (Ayushman Bharat, state schemes)",
            "Keep credit card as last resort due to high interest (18-36%)",
            "Document all expenses for potential insurance claims",
            "Start rebuilding emergency fund immediately after crisis is resolved"
        ],
        "recovery_timeline": {
            "week_1": [
                "Use available savings for immediate needs",
                "Apply for loans/break FD if savings insufficient",
                "File insurance claims if applicable",
                "Cut all non-essential expenses",
                "Inform family and close friends for support"
            ],
            "month_1": [
                "Receive loan disbursement if applied",
                "Complete emergency-related payments",
                "Start tracking all expenses strictly",
                "Create minimal survival budget",
                "Begin side income if possible (freelance, part-time)"
            ],
            "month_3": [
                "Start loan EMI repayment",
                "Rebuild emergency fund with 10-20% of income",
                "Return to normal budget gradually",
                "Review and update insurance coverage",
                "Plan long-term financial recovery"
            ],
            "month_6": [
                "Have at least 1-month expenses as emergency fund",
                "Clear high-interest debt (credit card) if any",
                "Resume regular savings and investments",
                "Document lessons learned for future planning"
            ]
        },
        "_note": "AI service unavailable. Using rule-based emergency recommendations. For personalized AI advice, add GROQ_API_KEY (free) or GEMINI_API_KEY to .env file."
    }
