from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class TransactionCategory(str, Enum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"
    SAVINGS = "savings"
    UNCATEGORIZED = "uncategorized"


class ExpenseCategory(str, Enum):
    FOOD = "Food"
    TRANSPORT = "Transport"
    HOUSING = "Housing"
    UTILITIES = "Utilities"
    SHOPPING = "Shopping"
    ENTERTAINMENT = "Entertainment"
    HEALTHCARE = "Healthcare"
    EDUCATION = "Education"
    OTHERS = "Others"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    CATEGORIZED = "categorized"


class IncomeType(str, Enum):
    SALARY = "Salary"
    BUSINESS = "Business"
    FREELANCE = "Freelance"


class Transaction(BaseModel):
    id: Optional[str] = None
    amount: float
    transaction_type: TransactionType  # debit / credit
    category_type: TransactionCategory = TransactionCategory.UNCATEGORIZED
    expense_category: Optional[str] = None  # Food, Transport, etc.
    income_type: Optional[str] = None  # Salary, Business, Freelance
    note: Optional[str] = None
    status: TransactionStatus = TransactionStatus.PENDING
    balance_before: float
    balance_after: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    month: Optional[str] = None  # "2026-06"


class CategorizeRequest(BaseModel):
    category_type: TransactionCategory
    expense_category: Optional[str] = None
    income_type: Optional[str] = None
    note: Optional[str] = None


class SplitItem(BaseModel):
    expense_category: str
    amount: float
    note: Optional[str] = None


class SplitCategorizeRequest(BaseModel):
    splits: List[SplitItem]


# ─── Budget Models ───────────────────────────────────────────────

class BudgetCategory(BaseModel):
    name: str
    allocated: float
    spent: float = 0.0
    percentage: float = 0.0


class Budget(BaseModel):
    id: Optional[str] = None
    month: str  # "2026-06"
    income_baseline: float
    income_type: str  # "fixed" or "variable"
    categories: List[BudgetCategory] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    rolled_over: bool = False


class BudgetSetupRequest(BaseModel):
    income_baseline: float
    income_type: str  # fixed/variable
    allocations: dict  # {"Food": 15, "Transport": 8, ...} percentages


# ─── Alert Models ────────────────────────────────────────────────

class Alert(BaseModel):
    id: Optional[str] = None
    alert_type: str  # budget_exceeded, unusual_spending, no_income, savings_low
    severity: str  # warning, critical
    title: str
    message: str
    impact: Optional[str] = None
    suggestion: Optional[str] = None
    category: Optional[str] = None
    dismissed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    month: Optional[str] = None


# ─── User Settings ────────────────────────────────────────────────

class UserSettings(BaseModel):
    income_baseline: float = 0.0
    income_type: str = "fixed"  # fixed / variable
    phone_number: Optional[str] = None
    theme: str = "light"  # light / dark
    gemini_api_key: Optional[str] = None
    onboarding_complete: bool = False
    tour_complete: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── AI Advisor Models ────────────────────────────────────────────

class AssetAdvisorRequest(BaseModel):
    asset_type: str
    asset_details: dict
    user_profile: dict
    risk_tolerance: str
    financial_goal: str


class SavingAdvisorRequest(BaseModel):
    savings_amount: float
    purpose: str
    time_horizon: str
    risk_level: str
    financial_priority: str


class DebtAdvisorRequest(BaseModel):
    loans: List[dict]


class InvestmentAdvisorRequest(BaseModel):
    investment_amount: float
    investment_mode: str
    existing_investments: List[str]
    investment_experience: str
    preferred_style: str


# ─── Piggy Bank Models ───────────────────────────────────────────

class PiggyBank(BaseModel):
    id: Optional[str] = None
    user_id: str
    name: str
    goal_amount: Optional[float] = None
    current_amount: float = 0.0
    color: str = "#f59e0b"  # amber default
    icon: str = "fas fa-piggy-bank"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PiggyBankTransaction(BaseModel):
    id: Optional[str] = None
    piggy_bank_id: str
    user_id: str
    amount: float  # positive = add, negative = withdraw
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PiggyBankCreateRequest(BaseModel):
    name: str
    goal_amount: Optional[float] = None
    color: Optional[str] = "#f59e0b"
    icon: Optional[str] = "fas fa-piggy-bank"


class PiggyBankTransactionRequest(BaseModel):
    amount: float
    note: Optional[str] = None


# ─── Asset Management Models ─────────────────────────────────────

class Asset(BaseModel):
    id: Optional[str] = None
    user_id: str
    asset_type: str  # Land, House, Gold, Vehicle, Business, etc.
    name: str
    description: Optional[str] = None
    purchase_value: float
    current_value: float
    purchase_date: Optional[datetime] = None
    location: Optional[str] = None  # Only for real estate
    quantity: Optional[float] = None  # For gold, silver, stocks
    details: Optional[dict] = {}  # Additional metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AssetCreateRequest(BaseModel):
    asset_type: str
    name: str
    description: Optional[str] = None
    purchase_value: float
    current_value: Optional[float] = None  # Optional - AI will fetch if not provided
    purchase_date: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[float] = None
    details: Optional[dict] = {}


class AssetUpdateRequest(BaseModel):
    current_value: float
    description: Optional[str] = None
    location: Optional[str] = None
    quantity: Optional[float] = None
    details: Optional[dict] = {}
