"""
Input validation utilities for FAB Finance API
"""
from fastapi import HTTPException
from typing import Optional


def validate_transaction_amount(amount: float, allow_zero: bool = False) -> float:
    """Validate transaction amount"""
    if amount < 0:
        raise HTTPException(status_code=400, detail="Transaction amount cannot be negative")
    
    if not allow_zero and amount == 0:
        raise HTTPException(status_code=400, detail="Transaction amount cannot be zero")
    
    if amount > 1_000_000_000:  # 1 billion limit
        raise HTTPException(status_code=400, detail="Transaction amount exceeds maximum limit")
    
    return round(amount, 2)


def validate_budget_allocation(percentage: float) -> float:
    """Validate budget allocation percentage"""
    if percentage < 0:
        raise HTTPException(status_code=400, detail="Budget allocation cannot be negative")
    
    if percentage > 100:
        raise HTTPException(status_code=400, detail="Budget allocation cannot exceed 100%")
    
    return round(percentage, 2)


def validate_month_format(month: str) -> str:
    """Validate month format (YYYY-MM)"""
    import re
    if not re.match(r'^\d{4}-\d{2}$', month):
        raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
    
    year, month_num = month.split('-')
    if not (1 <= int(month_num) <= 12):
        raise HTTPException(status_code=400, detail="Invalid month number")
    
    return month


def validate_asset_value(value: float) -> float:
    """Validate asset value"""
    if value < 0:
        raise HTTPException(status_code=400, detail="Asset value cannot be negative")
    
    if value > 10_000_000_000:  # 10 billion limit
        raise HTTPException(status_code=400, detail="Asset value exceeds maximum limit")
    
    return round(value, 2)


def validate_piggybank_name(name: str) -> str:
    """Validate piggy bank name"""
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Piggy bank name cannot be empty")
    
    if len(name) > 100:
        raise HTTPException(status_code=400, detail="Piggy bank name too long (max 100 characters)")
    
    return name.strip()


def sanitize_html(text: Optional[str]) -> Optional[str]:
    """Sanitize HTML content to prevent XSS"""
    if not text:
        return text
    
    # Remove potentially dangerous HTML tags
    import re
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<iframe[^>]*>.*?</iframe>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    
    return text
