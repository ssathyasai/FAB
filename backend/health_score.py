"""
Financial Health Score Calculator (0-100)
Pillars:
  1. Savings Rate      — 30 pts
  2. Budget Adherence  — 25 pts
  3. Income Stability  — 20 pts
  4. Spending Discipline — 25 pts
"""
from typing import Optional


def calc_savings_rate_points(savings_rate_pct: float) -> int:
    """savings_rate_pct = (savings / income) * 100"""
    if savings_rate_pct >= 30:
        return 30
    elif savings_rate_pct >= 20:
        return 22
    elif savings_rate_pct >= 10:
        return 15
    else:
        return 5


def calc_budget_adherence_points(categories_within_budget: int, total_categories: int) -> int:
    if total_categories == 0:
        return 25
    ratio = categories_within_budget / total_categories
    return round(ratio * 25)


def calc_income_stability_points(income_type: str) -> int:
    if income_type == "fixed":
        return 20
    elif income_type == "mixed":
        return 14
    else:  # variable
        return 10


def calc_spending_discipline_points(expenses: float, income: float) -> int:
    if income <= 0:
        return 0
    ratio = expenses / income
    if ratio < 0.50:
        return 25
    elif ratio < 0.65:
        return 20
    elif ratio < 0.75:
        return 15
    elif ratio < 0.85:
        return 10
    else:
        return 2


def calculate_health_score(
    income: float,
    expenses: float,
    savings: float,
    income_type: str,
    categories_within_budget: int,
    total_categories: int,
) -> dict:
    if income <= 0:
        savings_rate_pct = 0
    else:
        savings_rate_pct = (savings / income) * 100

    sr_pts = calc_savings_rate_points(savings_rate_pct)
    ba_pts = calc_budget_adherence_points(categories_within_budget, total_categories)
    is_pts = calc_income_stability_points(income_type)
    sd_pts = calc_spending_discipline_points(expenses, income)

    total = sr_pts + ba_pts + is_pts + sd_pts

    if total >= 80:
        status = "Excellent Financial Health"
        color = "green"
    elif total >= 65:
        status = "Good Financial Discipline"
        color = "blue"
    elif total >= 45:
        status = "Fair — Needs Attention"
        color = "amber"
    else:
        status = "Poor — Immediate Action Needed"
        color = "red"

    recommendations = []
    pillars = [
        ("Savings Rate", sr_pts, 30),
        ("Budget Adherence", ba_pts, 25),
        ("Income Stability", is_pts, 20),
        ("Spending Discipline", sd_pts, 25),
    ]
    pillars_sorted = sorted(pillars, key=lambda x: x[1] / x[2])
    for name, pts, max_pts in pillars_sorted[:3]:
        if name == "Savings Rate" and pts < 22:
            recommendations.append("Increase your savings to at least 20% of income")
        elif name == "Budget Adherence" and pts < 20:
            recommendations.append("Stick to your budget — reduce overspending categories")
        elif name == "Income Stability" and pts < 20:
            recommendations.append("Work towards a fixed, stable income source")
        elif name == "Spending Discipline" and pts < 15:
            recommendations.append("Keep expenses below 75% of income for financial safety")

    return {
        "score": total,
        "status": status,
        "color": color,
        "savings_rate_pct": round(savings_rate_pct, 1),
        "pillars": [
            {"name": n, "points": p, "max_points": m}
            for n, p, m in pillars
        ],
        "recommendations": recommendations[:3],
    }
