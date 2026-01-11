import re
import os
from api.utils.storage import StorageEngine

def normalize_ingredient(name):
    """Normalize ingredient name for matching."""
    if not name: return ""
    name = name.lower().strip()
    # Remove contents in parens
    name = re.sub(r'\s*\(.*?\)', '', name)
    # Remove everything after comma
    name = re.sub(r',.*', '', name)
    # Singularize crude approach
    if name.endswith('oes'): name = name[:-2]
    elif name.endswith('ies'): name = name[:-3] + 'y'
    elif name.endswith('s') and not name.endswith('ss'): name = name[:-1]
    
    return name.replace(' ', '_')

def get_inventory_items():
    """Load all items from inventory via StorageEngine."""
    try:
        data = StorageEngine.get_inventory()
        items = set()
        
        # Add fridge items
        for item in data.get('fridge', []):
            if isinstance(item, dict) and item.get('item'):
                items.add(normalize_ingredient(item['item']))
                
        # Add pantry items
        for item in data.get('pantry', []):
            if isinstance(item, dict) and item.get('item'):
                items.add(normalize_ingredient(item['item']))
                
        # Add freezer ingredients
        if 'freezer' in data and 'ingredients' in data['freezer']:
            for item in data['freezer']['ingredients']:
                if isinstance(item, dict) and item.get('item'):
                    items.add(normalize_ingredient(item['item']))
                    
        return items, data
    except Exception as e:
        print(f"Error loading inventory from DB: {e}")
        return set(), {}

def get_substitutions(limit=3):
    """
    Find recipe suggestions based on current inventory.
    Returns: {
        'fridge_shop': [recipes using inventory],
        'freezer_stash': [complete freezer meals],
        'quick_fix': [fast recipes]
    }
    """
    inventory_set, inventory_data = get_inventory_items()
    
    # Load recipes via StorageEngine
    try:
        recipes = StorageEngine.get_recipes()
    except Exception:
        recipes = []
        
    suggestions = {
        'fridge_shop': [],
        'freezer_stash': [],
        'quick_fix': []
    }
    
    # 1. Freezer Stash (Backups)
    if 'freezer' in inventory_data and 'backups' in inventory_data['freezer']:
        for meal in inventory_data['freezer']['backups']:
            suggestions['freezer_stash'].append({
                'id': f"freezer_{normalize_ingredient(meal['meal'])}",
                'name': meal['meal'],
                'type': 'freezer_meal',
                'servings': meal.get('servings'),
                'frozen_date': meal.get('frozen_date')
            })
            
    # 2. Fridge Shop (Match ingredients)
    scored_recipes = []
    for recipe in recipes:
        score = 0
        matches = []
        
        # Check main veg
        for veg in recipe.get('main_veg', []):
            norm_veg = normalize_ingredient(veg)
            if norm_veg in inventory_set:
                score += 2
                matches.append(veg)
                
        # Check title content (heuristic)
        norm_title = normalize_ingredient(recipe.get('name', ''))
        for item in inventory_set:
            if item in norm_title and len(item) > 3: # Avoid short partial matches
                score += 1
                
        if score > 0:
            scored_recipes.append({
                'recipe': recipe,
                'score': score,
                'matches': matches
            })
            
    # Sort by score descending
    scored_recipes.sort(key=lambda x: x['score'], reverse=True)
    
    # Diversity filter
    selected_for_fridge = []
    seen_titles = []
    
    def get_title_tokens(text):
        # normalize and split into set of words
        text = text.lower()
        # remove parens content
        text = re.sub(r'\s*\(.*?\)', '', text)
        return set(re.findall(r'\w+', text))

    for item in scored_recipes:
        if len(selected_for_fridge) >= limit:
            break
            
        recipe = item['recipe']
        title = recipe.get('name', '')
        title_tokens = get_title_tokens(title)
        
        is_similar = False
        for seen_tokens in seen_titles:
            # Jaccard similarity or high overlap
            intersection = len(title_tokens.intersection(seen_tokens))
            union = len(title_tokens.union(seen_tokens))
            
            # If 50% overlap in distinct words, consider it too similar
            # e.g. "Sweet Potato Curry" vs "Sweet Potato Tofu Curry" -> 3/4 overlap = 0.75 -> Skip
            if union > 0 and (intersection / union) > 0.5:
                is_similar = True
                break
        
        if not is_similar:
            selected_for_fridge.append(recipe)
            seen_titles.append(title_tokens)
            
    suggestions['fridge_shop'] = selected_for_fridge
    
    # 3. Quick Fix (Effort level low or time < 30)
    quick_recipes = [
        r for r in recipes 
        if r.get('effort_level') == 'low' or 
           (isinstance(r.get('active_time'), int) and r.get('active_time') <= 20)
    ]
    suggestions['quick_fix'] = quick_recipes[:limit]
    
    suggestions['quick_fix'] = quick_recipes[:limit]
    
    return suggestions

def get_waste_not_suggestions(limit=4):
    """
    Generate suggestions specifically for Monday/Tuesday to use up perishables.
    Prioritizes:
    1. Direct Leftovers (marked is_leftover=True)
    2. High-perishable fridge items
    """
    inventory_set, inventory_data = get_inventory_items()
    
    # Identify leftovers explicitly
    leftovers = []
    if 'fridge' in inventory_data:
        for item in inventory_data['fridge']:
             if isinstance(item, dict) and item.get('is_leftover'):
                 leftovers.append(normalize_ingredient(item['item']))
    
    # Load recipes
    try:
        recipes = StorageEngine.get_recipes()
    except Exception:
        recipes = []
        
    scored_recipes = []
    
    for recipe in recipes:
        score = 0
        rationale = []
        
        # Check leftovers
        for lo in leftovers:
            # Heuristic: Check if recipe name or ingredients match leftover
            # e.g. "Rice" -> "Fried Rice"
            norm_name = normalize_ingredient(recipe.get('name', ''))
            if lo in norm_name:
                score += 10
                rationale.append(f"Uses leftover {lo}")
                
            # Check ingredients (if we had full ingredient breakdown beyond main_veg)
            # For now, rely on main_veg and metadata
            
        # Check fridge items (Perishables)
        # We assume anything in 'fridge' is perishable
        for veg in recipe.get('main_veg', []):
            norm_veg = normalize_ingredient(veg)
            if norm_veg in inventory_set:
                score += 3
                rationale.append(f"Uses {veg}")
                if norm_veg in leftovers: # Double bonus if it's a specific leftover veg
                    score += 5
                    
        if score > 0:
            scored_recipes.append({
                'recipe': recipe,
                'score': score,
                'rationale': list(set(rationale))
            })
            
    scored_recipes.sort(key=lambda x: x['score'], reverse=True)
    
    return scored_recipes[:limit]

if __name__ == "__main__":
    subs = get_substitutions()
    print("Fridge Shop:")
    for r in subs['fridge_shop']: print(f"- {r['name']}")
    print("\nFreezer Stash:")
    for r in subs['freezer_stash']: print(f"- {r['name']}")
    print("\nQuick Fix:")
    for r in subs['quick_fix']: print(f"- {r['name']}")
