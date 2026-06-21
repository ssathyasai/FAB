from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai_service import get_gemini_response

router = APIRouter()


class CoachRequest(BaseModel):
    question: str


@router.post("/ask")
async def ask_coach(req: CoachRequest):
    """AI Financial Coach - answers user questions using Gemini AI"""
    
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # System prompt for the AI coach
    system_context = """You are a professional financial advisor and coach for FAB Finance app.
Your role is to provide helpful, actionable financial advice on:
- Personal budgeting and expense management
- Savings strategies and emergency funds
- Debt repayment and management
- Investment basics and planning
- Financial goal setting
- Income optimization

Guidelines:
- Be concise and practical (2-4 paragraphs max)
- Use simple, easy-to-understand language
- Provide specific, actionable steps when possible
- Consider Indian financial context (INR currency, Indian banking)
- Be encouraging and supportive
- Mention that this is general advice and for major decisions, consult a certified financial planner

User Question: """
    
    full_prompt = system_context + req.question
    
    try:
        answer = await get_gemini_response(full_prompt)
        return {"answer": answer, "question": req.question}
    except Exception as e:
        # Fallback response if Gemini fails
        fallback = """I'm having trouble connecting to my AI service right now. Here's some general advice:

For budgeting questions: Follow the 50/30/20 rule - 50% needs, 30% wants, 20% savings.

For savings: Build an emergency fund of 6 months expenses first, then focus on long-term goals.

For debt: Prioritize high-interest debt first (credit cards), then tackle others.

For investments: Start with low-risk options like FDs and PPF, then gradually diversify.

Please try again in a moment, or rephrase your question!"""
        
        return {"answer": fallback, "question": req.question, "fallback": True}
