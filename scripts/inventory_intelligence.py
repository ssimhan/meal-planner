import re
import os
from api.utils.storage import StorageEngine
from api.utils.grocery_mapper import EXCLUDED_STAPLES
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
    """Load all items from inventory via StorageEngine. Only includes items with quantity > 0."""
    try:
        data = StorageEngine.get_inventory()
        items = set()
        
        # Add fridge items
        for item in data.get('fridge', []):
            if isinstance(item, dict) and item.get('item'):
                # Quantity Check: If key exists and is 0, skip. Default to 1 if missing.
                qty = item.get('quantity', 1)
                try:
                    if float(qty) > 0:
                        items.add(normalize_ingredient(item['item']))
                except (ValueError, TypeError):
                    # If quantity is weird text, assume we have it
                    items.add(normalize_ingredient(item['item']))
                
        # Add pantry items
        for item in data.get('pantry', []):
            if isinstance(item, dict) and item.get('item'):
                qty = item.get('quantity', 1)
                try:
                    if float(qty) > 0:
                        items.add(normalize_ingredient(item['item']))
                except (ValueError, TypeError):
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
        for veg in (recipe.get('main_veg') or []):
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
        for veg in (recipe.get('main_veg') or []):
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
        
    scored_recipes.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    return scored_recipes[:limit]

def get_shopping_list(plan_data):
    """
    Generate shopping list by identifying missing ingredients from plan.
    Considers dinners, lunches, and planned snacks.
    """
    inventory_set, _ = get_inventory_items()
    needed = []
    
    # 0. Get user exclusions
    excluded_items = set()
    for excl in plan_data.get('excluded_items', []):
        excluded_items.add(normalize_ingredient(excl))
    
    # 0a. Get Permanent Pantry from config
    pantry_basics = set()
    try:
        config = StorageEngine.get_config()
        basics = config.get('permanent_pantry', [])
        for item in basics:
            pantry_basics.add(normalize_ingredient(item))
    except: pass

    # 1. Dinners (Main veggies/ingredients)
    for dinner in plan_data.get('dinners', []):
        # Support multi-recipe aggregation
        recipes_to_process = []
        if 'recipe_ids' in dinner:
            recipes_to_process = dinner['recipe_ids']
        elif 'recipe_id' in dinner:
            recipes_to_process = [dinner['recipe_id']]
            
        # Collect ingredients from all recipes in this slot
        ingredients_to_check = set(dinner.get('vegetables', []))
        for rid in recipes_to_process:
            if not rid: continue
            try:
                content = StorageEngine.get_recipe_content(rid)
                if not content: continue
                # We specifically look for "main ingredients" or vegetables in the context of this app's logic
                # For now, let's assume all 'ingredients' should be checked unless they are staples
                for ing in content.get('ingredients', []):
                    ingredients_to_check.add(ing)
            except: pass

        for veg in ingredients_to_check:
            norm = normalize_ingredient(veg)
            
            # Checks:
            # 1. Not in inventory (quantity aware)
            # 2. Not a hardcoded staple
            # 3. Not in Permanent Pantry
            # 4. Not user excluded
            if (norm not in inventory_set and 
                norm not in EXCLUDED_STAPLES and 
                norm not in pantry_basics and
                norm not in excluded_items):
                
                # Remove underscores for display
                display_name = veg.replace('_', ' ').title()
                needed.append(display_name)
    
    # 2. Lunches (Prep components)
    lunches = plan_data.get('lunches', {})
    if isinstance(lunches, dict):
        for day, lunch in lunches.items():
            # Support multi-recipe aggregation
            recipes_to_process = []
            if isinstance(lunch, dict):
                if 'recipe_ids' in lunch: recipes_to_process = lunch['recipe_ids'] or []
                elif 'recipe_id' in lunch: recipes_to_process = [lunch['recipe_id']]
                components = lunch.get('prep_components') or []
            else:
                components = getattr(lunch, 'prep_components', []) or []
                rid = getattr(lunch, 'recipe_id', None)
                if rid: recipes_to_process = [rid]
            
            # Aggregate ingredients/components from all recipes
            all_comps = set(components)
            for rid in recipes_to_process:
                if rid and rid.startswith('leftover:'): continue
                try:
                    content = StorageEngine.get_recipe_content(rid)
                    for ing in content.get('ingredients', []):
                        all_comps.add(ing)
                except: pass

            for comp in all_comps:
                norm = normalize_ingredient(comp)
                display_name = comp.replace('_', ' ').title()
                
                if (norm not in inventory_set and 
                    norm not in EXCLUDED_STAPLES and 
                    norm not in pantry_basics and
                    norm not in excluded_items):
                    needed.append(display_name)
                    
    # 3. Planned Snacks (Heuristic extraction)
    snacks = plan_data.get('snacks', {})
    if isinstance(snacks, dict):
        for day, daily_snacks in snacks.items():
            for key in ['school_snack', 'home_snack']:
                snack_text = daily_snacks.get(key, '') if isinstance(daily_snacks, dict) else ""
                if snack_text:
                    # Extract main item (e.g. "Apple slices with Sunbutter" -> "Apple slices" -> "Apple")
                    # We split by 'with', 'and', '&', or comma
                    parts = re.split(r'\s+(?:with|and|&)\s+|,', snack_text, flags=re.IGNORECASE)
                    for part in parts:
                        item = part.strip()
                        # Remove words like "slices", "rounds", "sticks"
                        item = re.sub(r'\s+(?:slices|rounds|sticks|pieces|cubes)\b', '', item, flags=re.IGNORECASE)
                        norm = normalize_ingredient(item)
                        if (norm and 
                            norm not in inventory_set and 
                            norm not in EXCLUDED_STAPLES and 
                            norm not in pantry_basics and
                            norm not in excluded_items):
                            needed.append(item.title())

    # 4. Default Snack Fallbacks (Ensure staples are checked)
    default_staples = ['Apple', 'Peanut Butter', 'Cheese', 'Cracker', 'Cucumber', 'Cream Cheese', 'Grape', 'Hummus']
    for staple in default_staples:
        norm = normalize_ingredient(staple)
        if norm not in inventory_set and norm not in excluded_items:
            needed.append(staple)

    # 5. Extra Manual Items (From Quick Add)
    extras = plan_data.get('extra_items', [])
    for extra in extras:
        norm = normalize_ingredient(extra)
        # BUG-002 Fix: Check inventory for extras too
        if (norm not in inventory_set and
            norm not in EXCLUDED_STAPLES and
            norm not in pantry_basics and
            norm not in excluded_items):
            needed.append(extra.title())
            
    # Enrich with Store info
    from api.utils.grocery_mapper import GroceryMapper
    unique_items = sorted(list(set(needed)))
    enrichment = []
    
    for item in unique_items:
        store = GroceryMapper.get_item_store(item)
        enrichment.append({
            "item": item,
            "store": store
        })
        
    return enrichment

if __name__ == "__main__":
    subs = get_substitutions()
    print("Fridge Shop:")
    for r in subs['fridge_shop']: print(f"- {r['name']}")
    print("\nFreezer Stash:")
    for r in subs['freezer_stash']: print(f"- {r['name']}")
    print("\nQuick Fix:")
    for r in subs['quick_fix']: print(f"- {r['name']}")
