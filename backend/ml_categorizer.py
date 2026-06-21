"""
ML-Based Transaction Categorization
Uses pattern matching, keyword analysis, and learning from user behavior
"""
import re
from typing import Dict, List, Tuple
from collections import defaultdict, Counter


class TransactionCategorizer:
    """
    Machine Learning-based transaction categorizer
    Uses TF-IDF-like scoring and pattern recognition
    """
    
    def __init__(self):
        # Keyword patterns for categories (training data)
        self.category_keywords = {
            "Food": [
                "swiggy", "zomato", "restaurant", "cafe", "food", "dominos", "pizza",
                "mcdonald", "kfc", "burger", "subway", "dunkin", "starbucks", "biryani",
                "grocery", "supermarket", "dmart", "bigbasket", "blinkit", "zepto", "instamart"
            ],
            "Transport": [
                "uber", "ola", "rapido", "metro", "bus", "petrol", "fuel", "diesel",
                "parking", "toll", "fastag", "irctc", "train", "flight", "indigo",
                "spicejet", "auto", "cab", "taxi", "railway"
            ],
            "Shopping": [
                "amazon", "flipkart", "myntra", "ajio", "meesho", "shop", "mall",
                "clothing", "fashion", "electronics", "mobile", "laptop", "clothes",
                "shoes", "watch", "bag", "online", "ecommerce"
            ],
            "Entertainment": [
                "movie", "cinema", "pvr", "inox", "netflix", "prime", "hotstar",
                "spotify", "youtube", "game", "gaming", "concert", "event", "ticket",
                "bookmyshow", "theatre", "play", "show"
            ],
            "Utilities": [
                "electricity", "water", "gas", "internet", "wifi", "broadband", "jio",
                "airtel", "vodafone", "bill", "recharge", "mobile", "phone", "postpaid",
                "lpg", "cylinder"
            ],
            "Healthcare": [
                "hospital", "doctor", "clinic", "medicine", "pharmacy", "apollo",
                "medical", "health", "diagnostic", "lab", "test", "checkup", "medico",
                "pharma", "drug", "healthcare"
            ],
            "Housing": [
                "rent", "emi", "home loan", "maintenance", "society", "apartment",
                "flat", "housing", "property", "mortgage", "landlord"
            ],
            "Education": [
                "school", "college", "university", "course", "tuition", "coaching",
                "udemy", "coursera", "book", "education", "learning", "study", "fees"
            ],
        }
        
        # Build reverse index for fast lookup
        self.keyword_to_categories = defaultdict(list)
        for category, keywords in self.category_keywords.items():
            for keyword in keywords:
                self.keyword_to_categories[keyword.lower()].append(category)
        
        # User learning: tracks user's manual categorizations
        self.user_patterns = defaultdict(Counter)  # {user_id: Counter({pattern: category})}
    
    def _extract_features(self, description: str) -> List[str]:
        """
        Extract features from transaction description
        Similar to feature extraction in ML
        """
        if not description:
            return []
        
        # Clean and normalize
        desc = description.lower().strip()
        
        # Remove special characters but keep spaces
        desc = re.sub(r'[^a-z0-9\s]', ' ', desc)
        
        # Extract words (tokens)
        words = desc.split()
        
        # Also extract bigrams (2-word combinations)
        bigrams = [f"{words[i]} {words[i+1]}" for i in range(len(words)-1)]
        
        return words + bigrams
    
    def _calculate_category_scores(self, features: List[str]) -> Dict[str, float]:
        """
        Calculate TF-IDF-like scores for each category
        Similar to text classification ML
        """
        category_scores = defaultdict(float)
        
        for feature in features:
            # Check if feature matches any keyword
            if feature in self.keyword_to_categories:
                categories = self.keyword_to_categories[feature]
                # Each matching category gets a point
                # More specific keywords (fewer categories) get higher weight
                weight = 1.0 / len(categories)
                for category in categories:
                    category_scores[category] += weight
        
        return dict(category_scores)
    
    def predict_category(
        self,
        description: str,
        amount: float = None,
        user_id: str = None
    ) -> Tuple[str, float]:
        """
        Predict category using ML-like approach
        
        Args:
            description: Transaction description
            amount: Transaction amount (optional, for amount-based rules)
            user_id: User ID (optional, for personalized predictions)
        
        Returns:
            (predicted_category, confidence_score)
        """
        if not description:
            return ("Others", 0.0)
        
        # Extract features
        features = self._extract_features(description)
        
        # Calculate scores using keyword matching (like bag-of-words ML)
        category_scores = self._calculate_category_scores(features)
        
        # Check user's historical patterns (personalized ML)
        if user_id and user_id in self.user_patterns:
            desc_pattern = description.lower()[:20]  # First 20 chars as pattern
            if desc_pattern in self.user_patterns[user_id]:
                # User has categorized similar transaction before
                learned_category = self.user_patterns[user_id][desc_pattern]
                category_scores[learned_category] = category_scores.get(learned_category, 0) + 2.0
        
        # Amount-based rules (heuristic ML)
        if amount:
            if amount > 50000:
                category_scores["Housing"] = category_scores.get("Housing", 0) + 0.5
            elif amount < 50:
                category_scores["Others"] = category_scores.get("Others", 0) + 0.3
        
        # Get category with highest score
        if category_scores:
            best_category = max(category_scores.items(), key=lambda x: x[1])
            category, score = best_category
            
            # Normalize confidence (0-1 scale)
            max_possible_score = len(features) * 1.0
            confidence = min(score / max_possible_score, 1.0) if max_possible_score > 0 else 0.0
            
            return (category, confidence)
        
        return ("Others", 0.0)
    
    def learn_from_user(self, user_id: str, description: str, category: str):
        """
        Learn from user's manual categorization (online learning)
        This is like training the model with new data
        """
        if not description or not category:
            return
        
        desc_pattern = description.lower()[:20]
        self.user_patterns[user_id][desc_pattern] = category
    
    def batch_predict(self, transactions: List[Dict]) -> List[Dict]:
        """
        Predict categories for multiple transactions (batch inference)
        
        Args:
            transactions: List of transaction dicts with 'note' and 'amount'
        
        Returns:
            List of predictions with confidence scores
        """
        predictions = []
        
        for txn in transactions:
            description = txn.get('note', '')
            amount = txn.get('amount', 0)
            user_id = txn.get('user_id')
            
            category, confidence = self.predict_category(description, amount, user_id)
            
            predictions.append({
                'transaction_id': txn.get('id'),
                'predicted_category': category,
                'confidence': round(confidence, 2),
                'description': description,
                'amount': amount
            })
        
        return predictions
    
    def get_category_suggestions(
        self,
        description: str,
        top_k: int = 3
    ) -> List[Tuple[str, float]]:
        """
        Get top-K category suggestions with confidence scores
        Similar to multi-class classification with probabilities
        """
        features = self._extract_features(description)
        category_scores = self._calculate_category_scores(features)
        
        if not category_scores:
            return [("Others", 0.0)]
        
        # Sort by score and get top-K
        sorted_categories = sorted(
            category_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_k]
        
        # Normalize scores to probabilities
        total_score = sum(score for _, score in sorted_categories)
        if total_score > 0:
            normalized = [(cat, round(score/total_score, 2)) for cat, score in sorted_categories]
        else:
            normalized = [(cat, 0.0) for cat, _ in sorted_categories]
        
        return normalized


# Global instance
_categorizer = TransactionCategorizer()


def auto_categorize_transaction(
    description: str,
    amount: float = None,
    user_id: str = None
) -> Dict:
    """
    Auto-categorize transaction using ML
    
    Returns:
        {
            'category': 'Food',
            'confidence': 0.85,
            'suggestions': [('Food', 0.85), ('Shopping', 0.10), ...]
        }
    """
    category, confidence = _categorizer.predict_category(description, amount, user_id)
    suggestions = _categorizer.get_category_suggestions(description, top_k=3)
    
    return {
        'category': category,
        'confidence': confidence,
        'suggestions': suggestions,
        'needs_review': confidence < 0.6  # Flag low confidence predictions
    }


def learn_from_categorization(user_id: str, description: str, category: str):
    """
    Update ML model with user's categorization (online learning)
    """
    _categorizer.learn_from_user(user_id, description, category)


def batch_categorize(transactions: List[Dict]) -> List[Dict]:
    """
    Categorize multiple transactions in batch
    """
    return _categorizer.batch_predict(transactions)
