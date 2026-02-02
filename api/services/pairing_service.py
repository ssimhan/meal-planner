from collections import Counter
from typing import List, Dict, Any

def get_paired_suggestions(main_id: str, history: Dict[str, Any], limit: int = 5) -> List[str]:
    """
    Analyzes meal history to find recipes frequently paired with the given main_id.
    Standardized to handle the nested {"weeks": [{"dinners": [...]}]} structure.
    """
    if not main_id or not isinstance(history, dict):
        return []

    pairing_counts = Counter()
    
    weeks = history.get('weeks', [])
    for week in weeks:
        if not isinstance(week, dict): continue
        
        dinners = week.get('dinners', [])
        for dinner in dinners:
            recipes = dinner.get('recipe_ids', [])
            if not isinstance(recipes, list) or main_id not in recipes:
                continue
                
            # Add all other recipes in the same meal to pairing counts
            for r_id in recipes:
                if r_id != main_id:
                    pairing_counts[r_id] += 1
                
    # Return most common pairings
    return [r_id for r_id, count in pairing_counts.most_common(limit)]
