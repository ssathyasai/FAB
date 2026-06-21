"""
ML-Based Expense Forecasting
Predicts future expenses using time series analysis and trend detection
"""
import numpy as np
from typing import Dict, List, Tuple
from collections import defaultdict
from datetime import datetime, timedelta


class ExpenseForecaster:
    """
    Time series forecasting for expenses
    Uses moving averages, trend analysis, and seasonal patterns
    """
    
    def __init__(self):
        self.min_months_for_forecast = 3
    
    def _parse_month(self, month_str: str) -> datetime:
        """Parse month string (YYYY-MM) to datetime"""
        try:
            return datetime.strptime(month_str, "%Y-%m")
        except:
            return datetime.now()
    
    def _calculate_trend(self, values: List[float]) -> float:
        """
        Calculate linear trend using simple linear regression
        Returns slope (positive = increasing, negative = decreasing)
        """
        if len(values) < 2:
            return 0.0
        
        n = len(values)
        x = np.arange(n)
        y = np.array(values)
        
        # Simple linear regression: y = mx + b
        x_mean = np.mean(x)
        y_mean = np.mean(y)
        
        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)
        
        if denominator == 0:
            return 0.0
        
        slope = numerator / denominator
        return slope
    
    def _exponential_smoothing(
        self,
        values: List[float],
        alpha: float = 0.3
    ) -> float:
        """
        Exponential smoothing for time series forecasting
        Alpha: smoothing factor (0-1), higher = more weight to recent values
        """
        if not values:
            return 0.0
        
        smoothed = values[0]
        for value in values[1:]:
            smoothed = alpha * value + (1 - alpha) * smoothed
        
        return smoothed
    
    def _detect_seasonality(
        self,
        monthly_data: Dict[str, float]
    ) -> Dict[int, float]:
        """
        Detect seasonal patterns (e.g., higher spending in Dec, lower in Feb)
        Returns monthly multipliers
        """
        month_totals = defaultdict(list)
        
        for month_str, amount in monthly_data.items():
            dt = self._parse_month(month_str)
            month_num = dt.month  # 1-12
            month_totals[month_num].append(amount)
        
        # Calculate average for each month
        overall_avg = np.mean(list(monthly_data.values()))
        seasonal_factors = {}
        
        for month_num, amounts in month_totals.items():
            month_avg = np.mean(amounts)
            # Seasonal factor: how much this month deviates from overall average
            seasonal_factors[month_num] = month_avg / overall_avg if overall_avg > 0 else 1.0
        
        return seasonal_factors
    
    def forecast_next_month(
        self,
        historical_data: Dict[str, float],
        category: str = "Total"
    ) -> Dict:
        """
        Forecast next month's expenses using multiple ML techniques
        
        Args:
            historical_data: {month: amount} e.g., {"2024-01": 45000, "2024-02": 48000}
            category: Category name for context
        
        Returns:
            {
                'forecast': 50000,
                'confidence_interval': (45000, 55000),
                'trend': 'increasing',
                'method': 'exponential_smoothing',
                'confidence': 0.75
            }
        """
        if len(historical_data) < self.min_months_for_forecast:
            return {
                'forecast': 0,
                'error': f'Need at least {self.min_months_for_forecast} months of data',
                'confidence': 0.0
            }
        
        # Sort by month
        sorted_months = sorted(historical_data.items(), key=lambda x: x[0])
        values = [v for _, v in sorted_months]
        months = [m for m, _ in sorted_months]
        
        # Method 1: Moving Average (simple baseline)
        window = min(3, len(values))
        moving_avg = np.mean(values[-window:])
        
        # Method 2: Exponential Smoothing (gives more weight to recent)
        exp_smooth = self._exponential_smoothing(values, alpha=0.3)
        
        # Method 3: Trend-based forecast
        trend = self._calculate_trend(values)
        last_value = values[-1]
        trend_forecast = last_value + trend
        
        # Combine forecasts (ensemble method)
        weights = [0.3, 0.4, 0.3]  # Moving avg, exp smooth, trend
        forecast = (
            weights[0] * moving_avg +
            weights[1] * exp_smooth +
            weights[2] * trend_forecast
        )
        
        # Apply seasonal adjustment if enough data
        if len(values) >= 6:
            seasonal_factors = self._detect_seasonality(historical_data)
            next_month = self._parse_month(months[-1]) + timedelta(days=32)
            next_month_num = next_month.month
            seasonal_factor = seasonal_factors.get(next_month_num, 1.0)
            forecast *= seasonal_factor
        
        # Calculate confidence interval (based on historical variance)
        std_dev = np.std(values)
        confidence_interval = (
            max(0, forecast - 1.5 * std_dev),
            forecast + 1.5 * std_dev
        )
        
        # Determine trend
        if trend > 100:
            trend_label = "increasing"
        elif trend < -100:
            trend_label = "decreasing"
        else:
            trend_label = "stable"
        
        # Calculate confidence score based on data consistency
        coefficient_of_variation = (std_dev / np.mean(values)) if np.mean(values) > 0 else 1.0
        confidence = max(0.3, min(1.0, 1.0 - coefficient_of_variation))
        
        return {
            'category': category,
            'forecast': round(forecast, 2),
            'confidence_interval': {
                'lower': round(confidence_interval[0], 2),
                'upper': round(confidence_interval[1], 2)
            },
            'trend': trend_label,
            'trend_amount': round(trend, 2),
            'method': 'ensemble',
            'confidence': round(confidence, 2),
            'data_points': len(values),
            'last_actual': round(last_value, 2)
        }
    
    def forecast_multiple_months(
        self,
        historical_data: Dict[str, float],
        months_ahead: int = 3
    ) -> List[Dict]:
        """
        Forecast multiple months ahead (recursive forecasting)
        """
        forecasts = []
        current_data = historical_data.copy()
        
        # Get last month
        last_month_str = max(current_data.keys())
        last_month = self._parse_month(last_month_str)
        
        for i in range(months_ahead):
            # Forecast next month
            forecast_result = self.forecast_next_month(current_data)
            
            if 'error' in forecast_result:
                break
            
            # Calculate next month string
            next_month = last_month + timedelta(days=32 * (i + 1))
            next_month_str = next_month.strftime("%Y-%m")
            
            forecast_result['month'] = next_month_str
            forecasts.append(forecast_result)
            
            # Add forecast to data for next iteration (recursive)
            current_data[next_month_str] = forecast_result['forecast']
        
        return forecasts
    
    def analyze_spending_patterns(
        self,
        historical_data: Dict[str, float]
    ) -> Dict:
        """
        Comprehensive ML analysis of spending patterns
        """
        if len(historical_data) < 3:
            return {'error': 'Not enough data for analysis'}
        
        sorted_months = sorted(historical_data.items(), key=lambda x: x[0])
        values = [v for _, v in sorted_months]
        
        # Statistical features
        mean_spending = np.mean(values)
        median_spending = np.median(values)
        std_dev = np.std(values)
        min_spending = np.min(values)
        max_spending = np.max(values)
        
        # Trend analysis
        trend = self._calculate_trend(values)
        
        # Volatility (coefficient of variation)
        cv = (std_dev / mean_spending) if mean_spending > 0 else 0
        
        if cv < 0.15:
            volatility = "Low - Very consistent spending"
        elif cv < 0.30:
            volatility = "Medium - Some variation in spending"
        else:
            volatility = "High - Highly variable spending"
        
        # Month-over-month changes
        mom_changes = []
        for i in range(1, len(values)):
            change_pct = ((values[i] - values[i-1]) / values[i-1] * 100) if values[i-1] > 0 else 0
            mom_changes.append(change_pct)
        
        avg_monthly_change = np.mean(mom_changes) if mom_changes else 0
        
        return {
            'summary': {
                'mean': round(mean_spending, 2),
                'median': round(median_spending, 2),
                'std_dev': round(std_dev, 2),
                'min': round(min_spending, 2),
                'max': round(max_spending, 2),
                'range': round(max_spending - min_spending, 2)
            },
            'trend': {
                'direction': 'increasing' if trend > 100 else 'decreasing' if trend < -100 else 'stable',
                'monthly_change': round(trend, 2),
                'avg_monthly_growth': round(avg_monthly_change, 2)
            },
            'volatility': {
                'level': volatility,
                'coefficient': round(cv, 2)
            },
            'insights': self._generate_insights(mean_spending, trend, cv, values)
        }
    
    def _generate_insights(
        self,
        mean: float,
        trend: float,
        cv: float,
        values: List[float]
    ) -> List[str]:
        """Generate actionable insights from analysis"""
        insights = []
        
        # Trend insights
        if trend > 200:
            insights.append(f"⚠️ Spending increasing by ₹{trend:.0f}/month on average. Review and control expenses.")
        elif trend < -200:
            insights.append(f"✅ Great! Spending decreasing by ₹{abs(trend):.0f}/month. Keep it up!")
        else:
            insights.append("📊 Spending is relatively stable month-over-month.")
        
        # Volatility insights
        if cv > 0.3:
            insights.append("💡 High spending variation detected. Consider setting category-wise budgets.")
        elif cv < 0.15:
            insights.append("✅ Very consistent spending pattern. Easy to plan and budget!")
        
        # Recent trend (last 3 months)
        if len(values) >= 3:
            recent_avg = np.mean(values[-3:])
            overall_avg = np.mean(values)
            if recent_avg > overall_avg * 1.1:
                insights.append("📈 Recent 3 months: Spending above average. Time to cut back?")
            elif recent_avg < overall_avg * 0.9:
                insights.append("📉 Recent 3 months: Spending below average. Good control!")
        
        return insights


# Global instance
_forecaster = ExpenseForecaster()


def forecast_expenses(
    historical_data: Dict[str, float],
    category: str = "Total",
    months_ahead: int = 1
) -> Dict:
    """
    Forecast future expenses using ML time series analysis
    
    Args:
        historical_data: {month: amount} dictionary
        category: Category name
        months_ahead: Number of months to forecast (1-3)
    
    Returns:
        Forecast with confidence intervals and trends
    """
    if months_ahead == 1:
        return _forecaster.forecast_next_month(historical_data, category)
    else:
        forecasts = _forecaster.forecast_multiple_months(historical_data, months_ahead)
        return {'forecasts': forecasts, 'category': category}


def analyze_patterns(historical_data: Dict[str, float]) -> Dict:
    """
    Analyze spending patterns using statistical ML
    """
    return _forecaster.analyze_spending_patterns(historical_data)
