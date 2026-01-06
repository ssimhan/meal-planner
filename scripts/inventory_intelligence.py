
import yaml
from pathlib import Path
from collections import Counter
import re

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

def get_inventory_items(inventory_path='data/inventory.yml'):
    """Load all items from inventory as a set of normalized strings."""
    try:
        with open(inventory_path, 'r') as f:
            data = yaml.safe_load(f) or {}
            
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
        print(f"Error loading inventory: {e}")
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
    
    # Load recipes
    try:
        with open('recipes/index.yml', 'r') as f:
            recipes = yaml.safe_load(f) or []
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
    suggestions['fridge_shop'] = [s['recipe'] for s in scored_recipes[:limit]]
    
    # 3. Quick Fix (Effort level low or time < 30)
    quick_recipes = [
        r for r in recipes 
        if r.get('effort_level') == 'low' or 
           (isinstance(r.get('active_time'), int) and r.get('active_time') <= 20)
    ]
    suggestions['quick_fix'] = quick_recipes[:limit]
    
    return suggestions

if __name__ == "__main__":
    subs = get_substitutions()
    print("Fridge Shop:")
    for r in subs['fridge_shop']: print(f"- {r['name']}")
    print("\nFreezer Stash:")
    for r in subs['freezer_stash']: print(f"- {r['name']}")
    print("\nQuick Fix:")
    for r in subs['quick_fix']: print(f"- {r['name']}")
