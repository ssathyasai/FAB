"""
ML-based Budget Allocation Model
Predicts optimal category allocation based on user profile
"""
import numpy as np
from typing import Dict

# Rule-based ML model (can be replaced with actual trained model)
class BudgetAllocator:
    """
    Allocates budget based on:
    - Monthly Income
    - Family Type (nuclear/joint/single)
    - Family Members (1-10+)
    - City Type (metro/tier1/tier2/tier3)
    - Lifestyle (minimalist/moderate/lavish)
    - Earning Members (1-5)
    """
    
    # Base allocation percentages (middle-class, moderate lifestyle, tier2 city)
    BASE_ALLOCATION = {
        "Housing": 25,
        "Food": 15,
        "Transport": 8,
        "Utilities": 5,
        "Healthcare": 5,
        "Education": 8,
        "Shopping": 7,
        "Entertainment": 5,
        "Others": 5,
        "Savings": 17,
    }
    
    def __init__(self):
        self.city_multipliers = {
            "metro": {"Housing": 1.3, "Transport": 1.2, "Food": 1.1},
            "tier1": {"Housing": 1.15, "Transport": 1.1, "Food": 1.05},
            "tier2": {"Housing": 1.0, "Transport": 1.0, "Food": 1.0},
            "tier3": {"Housing": 0.85, "Transport": 0.9, "Food": 0.95},
        }
        
        self.lifestyle_multipliers = {
            "minimalist": {"Shopping": 0.6, "Entertainment": 0.6, "Savings": 1.4},
            "moderate": {"Shopping": 1.0, "Entertainment": 1.0, "Savings": 1.0},
            "lavish": {"Shopping": 1.5, "Entertainment": 1.5, "Savings": 0.7},
        }
        
        self.family_type_adjustments = {
            "single": {"Food": 0.6, "Utilities": 0.7, "Healthcare": 0.8, "Savings": 1.2},
            "nuclear": {"Food": 1.0, "Utilities": 1.0, "Healthcare": 1.0, "Savings": 1.0},
            "joint": {"Food": 1.3, "Utilities": 1.2, "Healthcare": 1.2, "Savings": 0.9},
        }
    
    def allocate(
        self,
        monthly_income: float,
        family_type: str,
        family_members: int,
        city_type: str,
        lifestyle: str,
        earning_members: int
    ) -> Dict[str, float]:
        """
        Returns optimal budget allocation in rupees per category
        """
        
        # Start with base allocation
        allocation = self.BASE_ALLOCATION.copy()
        
        # Apply city adjustments
        city_adj = self.city_multipliers.get(city_type.lower(), self.city_multipliers["tier2"])
        for category, multiplier in city_adj.items():
            if category in allocation:
                allocation[category] *= multiplier
        
        # Apply lifestyle adjustments
        lifestyle_adj = self.lifestyle_multipliers.get(lifestyle.lower(), self.lifestyle_multipliers["moderate"])
        for category, multiplier in lifestyle_adj.items():
            if category in allocation:
                allocation[category] *= multiplier
        
        # Apply family type adjustments
        family_adj = self.family_type_adjustments.get(family_type.lower(), self.family_type_adjustments["nuclear"])
        for category, multiplier in family_adj.items():
            if category in allocation:
                allocation[category] *= multiplier
        
        # Adjust for family members (more members = more food, utilities, healthcare)
        member_factor = min(family_members / 4, 1.5)  # Cap at 1.5x
        allocation["Food"] *= member_factor
        allocation["Utilities"] *= (1 + (family_members - 4) * 0.05) if family_members > 4 else 1.0
        allocation["Healthcare"] *= member_factor
        
        # Adjust for earning members (more earners = more savings potential)
        if earning_members > 1:
            earnings_boost = 1 + (earning_members - 1) * 0.1
            allocation["Savings"] *= earnings_boost
        
        # Adjust Education based on family members
        if family_members > 2:  # Likely has children
            allocation["Education"] *= 1.3
        elif family_members == 1:  # Single person
            allocation["Education"] *= 0.5
        
        # Normalize to 100%
        total = sum(allocation.values())
        allocation = {k: (v / total) * 100 for k, v in allocation.items()}
        
        # Convert percentages to rupee amounts
        rupee_allocation = {k: round((v / 100) * monthly_income, 2) for k, v in allocation.items()}
        
        return rupee_allocation
    
    def get_recommendations(
        self,
        monthly_income: float,
        family_type: str,
        family_members: int,
        city_type: str,
        lifestyle: str,
        earning_members: int
    ) -> Dict:
        """
        Get allocation with explanations and recommendations
        """
        allocation = self.allocate(
            monthly_income, family_type, family_members,
            city_type, lifestyle, earning_members
        )
        
        # Generate insights
        insights = []
        
        # Savings rate check
        savings_pct = (allocation["Savings"] / monthly_income) * 100
        if savings_pct < 15:
            insights.append("⚠️ Savings rate is low. Aim for at least 20% of income.")
        elif savings_pct >= 20:
            insights.append("✅ Excellent savings rate! You're on track for financial security.")
        else:
            insights.append("💡 Good savings rate. Consider increasing to 20% for better security.")
        
        # City-based insight
        if city_type.lower() == "metro":
            insights.append("🏙️ Metro city: Higher housing costs. Consider roommates or suburbs to save more.")
        elif city_type.lower() == "tier1":
            insights.append("🏙️ Tier-1 city: Moderate cost of living with good opportunities.")
        elif city_type.lower() == "tier3":
            insights.append("🏘️ Tier-3 city: Lower costs = higher savings potential!")
        else:
            insights.append("🏘️ Tier-2 city: Balanced cost of living, ideal for steady savings.")
        
        # Family-based insight
        if family_members > 4:
            insights.append("👨‍👩‍👧‍👦 Large family: Focus on bulk buying and meal planning to optimize costs.")
        elif family_members == 1:
            insights.append("👤 Single person: Great opportunity to maximize savings!")
        else:
            insights.append("👨‍👩‍👧 Nuclear family: Balanced allocation for comfort and savings.")
        
        # Lifestyle insight
        if lifestyle.lower() == "lavish":
            insights.append("💰 Lavish lifestyle: Review discretionary spending regularly.")
        elif lifestyle.lower() == "minimalist":
            insights.append("🌱 Minimalist approach: Excellent for long-term wealth building!")
        else:
            insights.append("⚖️ Moderate lifestyle: Good balance between comfort and savings.")
        
        # Earning members insight
        if earning_members > 1:
            insights.append(f"💼 {earning_members} earners: Great potential to boost savings and investments!")
        
        return {
            "allocation": allocation,
            "insights": insights,
            "savings_rate": round(savings_pct, 1),
            "profile_summary": f"{family_type.title()} family with {family_members} members in {city_type} city"
        }


# Global instance
_allocator = BudgetAllocator()


def get_smart_allocation(profile: Dict) -> Dict:
    """
    Main function to get ML-based budget allocation
    
    Args:
        profile: {
            "monthly_income": 80000,
            "family_type": "nuclear",
            "family_members": 4,
            "city_type": "tier1",
            "lifestyle": "moderate",
            "earning_members": 2
        }
    
    Returns:
        {
            "allocation": {"Housing": 25000, ...},
            "insights": ["...", "..."],
            "savings_rate": 18.5,
            "profile_summary": "..."
        }
    """
    return _allocator.get_recommendations(
        monthly_income=profile.get("monthly_income", 50000),
        family_type=profile.get("family_type", "nuclear"),
        family_members=profile.get("family_members", 4),
        city_type=profile.get("city_type", "tier2"),
        lifestyle=profile.get("lifestyle", "moderate"),
        earning_members=profile.get("earning_members", 1)
    )
