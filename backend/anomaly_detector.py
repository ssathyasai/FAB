"""
AI/ML-based Transaction Anomaly Detection
Detects unusual spending patterns and potential fraud
"""
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
from collections import defaultdict


class SpendingAnomalyDetector:
    """
    Detects anomalies in spending patterns using statistical methods
    and machine learning techniques (can be enhanced with sklearn/tensorflow)
    """
    
    def __init__(self, sensitivity: float = 2.5):
        """
        Args:
            sensitivity: Number of standard deviations for anomaly threshold (default 2.5)
        """
        self.sensitivity = sensitivity
    
    def detect_anomalies(
        self,
        transactions: List[Dict],
        user_profile: Dict = None
    ) -> List[Dict]:
        """
        Detect anomalous transactions
        
        Args:
            transactions: List of transaction dicts with amount, category, timestamp
            user_profile: Optional user profile for personalized detection
        
        Returns:
            List of anomalies with details and severity
        """
        if len(transactions) < 10:
            return []  # Need at least 10 transactions for pattern detection
        
        anomalies = []
        
        # 1. Amount-based anomalies per category
        category_anomalies = self._detect_category_amount_anomalies(transactions)
        anomalies.extend(category_anomalies)
        
        # 2. Frequency-based anomalies
        frequency_anomalies = self._detect_frequency_anomalies(transactions)
        anomalies.extend(frequency_anomalies)
        
        # 3. Time-based anomalies (unusual transaction times)
        time_anomalies = self._detect_time_anomalies(transactions)
        anomalies.extend(time_anomalies)
        
        # 4. Merchant/pattern anomalies (new merchants with high amounts)
        merchant_anomalies = self._detect_new_merchant_anomalies(transactions)
        anomalies.extend(merchant_anomalies)
        
        return anomalies
    
    def _detect_category_amount_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        """Detect transactions that are significantly higher than usual for that category"""
        anomalies = []
        
        # Group by category
        by_category = defaultdict(list)
        for txn in transactions:
            category = txn.get('expense_category') or txn.get('category_type', 'Others')
            amount = abs(float(txn.get('amount', 0)))
            if amount > 0:
                by_category[category].append({
                    'amount': amount,
                    'txn': txn
                })
        
        # Analyze each category
        for category, txns in by_category.items():
            if len(txns) < 5:
                continue
            
            amounts = [t['amount'] for t in txns]
            mean = np.mean(amounts)
            std = np.std(amounts)
            
            if std == 0:
                continue
            
            # Find outliers (Z-score > sensitivity)
            for txn_data in txns:
                amount = txn_data['amount']
                z_score = (amount - mean) / std
                
                if z_score > self.sensitivity:
                    anomalies.append({
                        'transaction': txn_data['txn'],
                        'anomaly_type': 'high_amount',
                        'category': category,
                        'amount': amount,
                        'typical_amount': round(mean, 2),
                        'deviation': round(z_score, 2),
                        'severity': 'high' if z_score > 3.5 else 'medium',
                        'message': f"Unusually high {category} expense: ₹{amount:,.0f} (typical: ₹{mean:,.0f})",
                        'recommendation': f"Review this {category} transaction. It's {z_score:.1f}x above your average."
                    })
        
        return anomalies
    
    def _detect_frequency_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        """Detect sudden spikes in transaction frequency"""
        anomalies = []
        
        # Group by date
        by_date = defaultdict(list)
        for txn in transactions:
            created_at = txn.get('created_at')
            if isinstance(created_at, str):
                date = created_at[:10]  # YYYY-MM-DD
            elif hasattr(created_at, 'date'):
                date = created_at.date().isoformat()
            else:
                continue
            by_date[date].append(txn)
        
        # Calculate daily transaction counts
        daily_counts = [len(txns) for txns in by_date.values()]
        if len(daily_counts) < 5:
            return anomalies
        
        mean_count = np.mean(daily_counts)
        std_count = np.std(daily_counts)
        
        if std_count == 0:
            return anomalies
        
        # Find days with unusual activity
        for date, txns in by_date.items():
            count = len(txns)
            z_score = (count - mean_count) / std_count
            
            if z_score > self.sensitivity:
                total_amount = sum(abs(float(t.get('amount', 0))) for t in txns)
                anomalies.append({
                    'transaction': txns[0],  # Reference first transaction of the day
                    'anomaly_type': 'high_frequency',
                    'date': date,
                    'transaction_count': count,
                    'typical_count': round(mean_count, 1),
                    'total_amount': round(total_amount, 2),
                    'severity': 'medium',
                    'message': f"Unusual transaction activity on {date}: {count} transactions (typical: {mean_count:.1f})",
                    'recommendation': "Review all transactions from this day for any unauthorized activity."
                })
        
        return anomalies
    
    def _detect_time_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        """Detect transactions at unusual hours (potential fraud)"""
        anomalies = []
        
        # Extract transaction hours
        hours = []
        for txn in transactions:
            created_at = txn.get('created_at')
            if isinstance(created_at, str):
                try:
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    hours.append({'hour': dt.hour, 'txn': txn})
                except:
                    continue
            elif hasattr(created_at, 'hour'):
                hours.append({'hour': created_at.hour, 'txn': txn})
        
        if len(hours) < 20:
            return anomalies
        
        # Most people transact between 6 AM - 11 PM
        # Flag transactions outside typical hours (midnight to 5 AM)
        for h in hours:
            hour = h['hour']
            txn = h['txn']
            amount = abs(float(txn.get('amount', 0)))
            
            if 0 <= hour <= 5 and amount > 1000:  # Large transaction at odd hours
                anomalies.append({
                    'transaction': txn,
                    'anomaly_type': 'unusual_time',
                    'hour': hour,
                    'amount': amount,
                    'severity': 'high',
                    'message': f"Transaction at unusual hour: {hour}:00 (₹{amount:,.0f})",
                    'recommendation': "Verify this transaction. Late-night transactions can indicate fraud."
                })
        
        return anomalies
    
    def _detect_new_merchant_anomalies(self, transactions: List[Dict]) -> List[Dict]:
        """Detect first-time large transactions (potential fraud)"""
        anomalies = []
        
        # Track merchant transaction history
        merchant_history = defaultdict(list)
        
        for txn in transactions:
            note = txn.get('note', '') or ''
            amount = abs(float(txn.get('amount', 0)))
            merchant_history[note].append(amount)
        
        # Check for first large transactions with new merchants
        for merchant, amounts in merchant_history.items():
            if len(amounts) == 1 and amounts[0] > 5000:  # Single high-value transaction
                anomalies.append({
                    'transaction': [t for t in transactions if t.get('note') == merchant][0],
                    'anomaly_type': 'new_merchant_high_amount',
                    'merchant': merchant or 'Unknown',
                    'amount': amounts[0],
                    'severity': 'medium',
                    'message': f"First transaction with new merchant: ₹{amounts[0]:,.0f}",
                    'recommendation': "Verify this is a legitimate transaction with a new merchant."
                })
        
        return anomalies
    
    def get_spending_insights(self, transactions: List[Dict]) -> Dict:
        """
        Get overall spending insights with ML-based analysis
        """
        if len(transactions) < 5:
            return {"error": "Not enough transaction data"}
        
        # Calculate statistics
        amounts = [abs(float(t.get('amount', 0))) for t in transactions]
        
        insights = {
            "total_transactions": len(transactions),
            "total_amount": round(sum(amounts), 2),
            "average_transaction": round(np.mean(amounts), 2),
            "median_transaction": round(np.median(amounts), 2),
            "largest_transaction": round(max(amounts), 2),
            "smallest_transaction": round(min(amounts), 2),
            "std_deviation": round(np.std(amounts), 2),
        }
        
        # Category breakdown
        by_category = defaultdict(float)
        for txn in transactions:
            category = txn.get('expense_category') or 'Others'
            amount = abs(float(txn.get('amount', 0)))
            by_category[category] += amount
        
        insights["top_categories"] = sorted(
            [{"category": k, "amount": round(v, 2)} for k, v in by_category.items()],
            key=lambda x: x['amount'],
            reverse=True
        )[:5]
        
        # Spending trend (comparing first half vs second half)
        mid = len(amounts) // 2
        first_half_avg = np.mean(amounts[:mid]) if mid > 0 else 0
        second_half_avg = np.mean(amounts[mid:]) if mid > 0 else 0
        
        if first_half_avg > 0:
            trend_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100
            insights["spending_trend"] = {
                "direction": "increasing" if trend_pct > 5 else "decreasing" if trend_pct < -5 else "stable",
                "change_percent": round(trend_pct, 1)
            }
        
        return insights


# Global instance
_detector = SpendingAnomalyDetector(sensitivity=2.5)


def detect_spending_anomalies(transactions: List[Dict], user_profile: Dict = None) -> List[Dict]:
    """
    Main function to detect anomalies in user's spending
    
    Args:
        transactions: List of transaction dictionaries
        user_profile: Optional user profile for personalized detection
    
    Returns:
        List of detected anomalies with severity and recommendations
    """
    return _detector.detect_anomalies(transactions, user_profile)


def get_ml_spending_insights(transactions: List[Dict]) -> Dict:
    """
    Get ML-based spending insights
    """
    return _detector.get_spending_insights(transactions)
