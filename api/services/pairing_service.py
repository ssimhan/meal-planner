def get_paired_suggestions(main_id, history):
    """
    Analyzes meal plan history to find co-occurrences of recipes in the same meal slot.
    Returns a sorted list of suggested recipe IDs based on frequency.
    """
    pairs = {}
    for week in history.get('weeks', []):
        # We check both dinners and lunches if they follow the multi-recipe structure
        
        # Check Dinners
        for dinner in week.get('dinners', []):
            ids = dinner.get('recipe_ids', [])
            # Fallback for old data if any remains un-normalized in the history object
            if not ids and dinner.get('recipe_id'):
                ids = [dinner.get('recipe_id')]
            
            if main_id in ids:
                for side_id in ids:
                    if side_id != main_id:
                        pairs[side_id] = pairs.get(side_id, 0) + 1
                        
        # Check Lunches (some people pair specific things for lunch too)
        lunches = week.get('lunches', {})
        if isinstance(lunches, dict):
            for day, lunch in lunches.items():
                ids = lunch.get('recipe_ids', [])
                if not ids and lunch.get('recipe_id'):
                    ids = [lunch.get('recipe_id')]
                    
                if main_id in ids:
                    for side_id in ids:
                        if side_id != main_id:
                            pairs[side_id] = pairs.get(side_id, 0) + 1
                            
    # Sort by frequency descending
    return sorted(pairs, key=pairs.get, reverse=True)
