import yaml
import re
from pathlib import Path
from datetime import datetime
from collections import Counter

try:
    from scripts.log_execution import get_actual_path
except ImportError:
    from log_execution import get_actual_path

def _normalize_ingredient_name(name):
    """Normalize ingredient names for consistent matching."""
    if not name:
        return ""
    name = name.lower().strip()
    name = re.sub(r'\s*\(.*?\)', '', name)
    name = re.sub(r',.*', '', name)
    if name.endswith('oes'):
        name = name[:-2]
    elif name.endswith('ies'):
        name = name[:-3] + 'y'
    elif name.endswith('s') and not name.endswith('ss'):
        name = name[:-1]
    name = name.replace(' ', '_')
    aliases = {
        'green_bean': 'bean',
        'bell_pepper': 'pepper',
        'cherry_tomato': 'tomato',
        'roma_tomato': 'tomato',
        'red_onion': 'onion',
        'yellow_onion': 'onion',
        'white_onion': 'onion',
        'black_bean': 'bean',
        'kidney_bean': 'bean',
        'pinto_bean': 'bean'
    }
    return aliases.get(name, name)

def _calculate_ingredient_freshness(inventory):
    """Calculate freshness score for inventory items."""
    freshness = {}
    today = datetime.now().date()
    for section in ['fridge', 'pantry']:
        items = inventory.get(section, [])
        for item_data in items:
            item_name = _normalize_ingredient_name(item_data.get('item', ''))
            added_str = item_data.get('added')
            if added_str:
                try:
                    added_date = datetime.strptime(added_str, '%Y-%m-%d').date()
                    days_old = (today - added_date).days
                    freshness[item_name] = days_old
                except ValueError:
                    freshness[item_name] = 0
            else:
                freshness[item_name] = 0
    return freshness

def _load_inventory_data(inventory_path='data/inventory.yml'):
    """Load and normalize inventory data."""
    inv_path = get_actual_path(inventory_path)
    if not inv_path.exists():
        return {
            'fridge_items': set(),
            'pantry_items': set(),
            'freezer_backups': [],
            'freshness': {}
        }
    with open(inv_path, 'r') as f:
        inventory = yaml.safe_load(f) or {}
    fridge_items = set()
    for item_data in inventory.get('fridge', []):
        normalized = _normalize_ingredient_name(item_data.get('item', ''))
        if normalized:
            fridge_items.add(normalized)
    pantry_items = set()
    for item_data in inventory.get('pantry', []):
        normalized = _normalize_ingredient_name(item_data.get('item', ''))
        if normalized:
            pantry_items.add(normalized)
    freezer_backups = []
    for backup in inventory.get('freezer', {}).get('backups', []):
        meal_name = backup.get('meal', '')
        if meal_name:
            freezer_backups.append(meal_name)
    freshness = _calculate_ingredient_freshness(inventory)
    return {
        'fridge_items': fridge_items,
        'pantry_items': pantry_items,
        'freezer_backups': freezer_backups,
        'freshness': freshness
    }

def score_recipe_by_inventory(recipe_id, recipe_obj, inventory, all_recipes):
    """Score a recipe based on how well it uses current inventory."""
    main_veg = recipe_obj.get('main_veg', [])
    if not main_veg and all_recipes:
        recipe_full = next((r for r in all_recipes if r.get('id') == recipe_id), None)
        if recipe_full:
            main_veg = recipe_full.get('main_veg', [])
    if not main_veg:
        return 0.0, {'fridge_matches': [], 'pantry_matches': [], 'missing': []}
    normalized_veg = [_normalize_ingredient_name(v) for v in main_veg]
    normalized_veg = [v for v in normalized_veg if v]
    if not normalized_veg:
        return 0.0, {'fridge_matches': [], 'pantry_matches': [], 'missing': []}
    fridge_matches = []
    pantry_matches = []
    missing = []
    for veg in normalized_veg:
        if veg in inventory['fridge_items']:
            fridge_matches.append(veg)
        elif veg in inventory['pantry_items']:
            pantry_matches.append(veg)
        else:
            missing.append(veg)
    score = 0.0
    score += len(fridge_matches) * 20
    score += len(pantry_matches) * 5
    for item in fridge_matches:
        days_old = inventory['freshness'].get(item, 0)
        if days_old >= 5:
            score += 10
    score = min(score, 100.0)
    details = {
        'fridge_matches': fridge_matches,
        'pantry_matches': pantry_matches,
        'missing': missing,
        'match_ratio': (len(fridge_matches) + len(pantry_matches)) / len(normalized_veg) if normalized_veg else 0
    }
    return score, details

def generate_farmers_market_proposal(history_path, index_path):
    """Generate a proposed farmers market vegetable list."""
    inventory_path = get_actual_path('data/inventory.yml')
    current_fridge_items = set()
    freezer_backup_count = 0
    if inventory_path.exists():
        try:
            with open(inventory_path, 'r') as f:
                inventory = yaml.safe_load(f)
                if inventory:
                    if 'fridge' in inventory:
                        for item in inventory['fridge']:
                            current_fridge_items.add(item['item'].lower())
                    if 'freezer' in inventory and 'backups' in inventory['freezer']:
                        freezer_backup_count = len(inventory['freezer']['backups'])
        except Exception: pass
    recent_veg = set()
    if history_path.exists():
        try:
            with open(history_path, 'r') as f:
                history = yaml.safe_load(f)
                if history and 'weeks' in history:
                    for week in history['weeks'][-2:]:
                        for dinner in week.get('dinners', []):
                            recent_veg.update(dinner.get('vegetables', []))
        except Exception: pass
    common_veg = Counter()
    if index_path.exists():
        try:
            with open(index_path, 'r') as f:
                recipes = yaml.safe_load(f)
                if recipes:
                    for recipe in recipes:
                        main_veg = recipe.get('main_veg', [])
                        common_veg.update(main_veg)
        except Exception: pass
    top_veg = [veg for veg, count in common_veg.most_common(20)
               if veg not in recent_veg
               and veg not in ['garlic', 'onion', 'ginger']
               and veg not in current_fridge_items]
    current_month = datetime.now().month
    seasonal = []
    if current_month in [12, 1, 2]:
        seasonal = ['broccoli', 'cauliflower', 'kale', 'sweet potato', 'carrot', 'brussels sprouts']
    elif current_month in [3, 4, 5]:
        seasonal = ['asparagus', 'spinach', 'peas', 'lettuce', 'radish', 'green beans']
    elif current_month in [6, 7, 8]:
        seasonal = ['tomato', 'zucchini', 'bell pepper', 'corn', 'cucumber', 'green beans']
    else:
        seasonal = ['squash', 'sweet potato', 'kale', 'brussels sprouts', 'cauliflower', 'broccoli']
    proposed = []
    for veg in seasonal:
        if veg in top_veg:
            proposed.append(veg)
        if len(proposed) >= 5:
            break
    for veg in top_veg:
        if veg not in proposed:
            proposed.append(veg)
        if len(proposed) >= 6:
            break
    staples = ['onion', 'garlic', 'cilantro']
    if freezer_backup_count < 3:
        print(f"\n⚠️  Freezer backup status: {freezer_backup_count}/3 meals")
    return proposed, staples

def get_recent_recipes(history, lookback_weeks=3):
    """Get recipe IDs used in the last N weeks."""
    recent = set()
    if not history or 'weeks' not in history:
        return recent
    for week in history['weeks'][-lookback_weeks:]:
        for dinner in week.get('dinners', []):
            if 'recipe_id' in dinner:
                recent.add(dinner['recipe_id'])
    return recent

def filter_recipes(recipes, inputs, recent_recipes):
    """Filter recipes for dinner."""
    filtered = []
    avoid_ingredients = set(inputs.get('preferences', {}).get('avoid_ingredients', []))
    dinner_meal_types = {
        'tacos_wraps', 'pasta_noodles', 'soup_stew', 'grain_bowl',
        'sandwich', 'salad', 'stir_fry', 'pizza', 'casserole', 'appetizer'
    }
    for recipe in recipes:
        if recipe['id'] in recent_recipes:
            continue
        if any(ing in avoid_ingredients for ing in recipe.get('avoid_contains', [])):
            continue
        recipe_meal_type = recipe.get('meal_type')
        if recipe_meal_type == 'unknown' or recipe_meal_type not in dinner_meal_types:
            continue
        filtered.append(recipe)
    return filtered

def select_dinners(filtered_recipes, inputs, current_week_history=None, all_recipes=None):
    """Select 5 dinners for Mon-Fri based on constraints."""
    busy_days = set(inputs.get('schedule', {}).get('busy_days', []))
    rollover_data = inputs.get('rollover', [])
    no_chop_recipes = [r for r in filtered_recipes if r.get('no_chop_compatible', False)]
    normal_recipes = [r for r in filtered_recipes if r.get('effort_level') == 'normal']
    all_other_recipes = [r for r in filtered_recipes if not r.get('no_chop_compatible', False) and r.get('effort_level') != 'normal']
    used_meal_types = set()
    selected = {}
    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    if current_week_history and 'dinners' in current_week_history:
        for dh in current_week_history['dinners']:
            day = dh.get('day')
            recipe_id = dh.get('recipe_id')
            if day in days:
                if recipe_id == 'freezer_meal':
                    selected[day] = {'id': 'freezer_meal', 'name': 'Freezer Backup Meal', 'main_veg': [], 'meal_type': 'freezer', 'cuisine': 'various'}
                elif all_recipes:
                    recipe = next((r for r in all_recipes if r.get('id') == recipe_id), None)
                    if recipe:
                        selected[day] = recipe
                        used_meal_types.add(recipe.get('meal_type'))
    if rollover_data and all_recipes:
        for r_meta in rollover_data:
            r_id = r_meta.get('recipe_id')
            recipe = next((r for r in all_recipes if r.get('id') == r_id), None)
            if recipe and recipe.get('meal_type') not in used_meal_types:
                for day in days:
                    if day not in selected:
                        selected[day] = recipe
                        used_meal_types.add(recipe.get('meal_type'))
                        if recipe in no_chop_recipes: no_chop_recipes.remove(recipe)
                        if recipe in normal_recipes: normal_recipes.remove(recipe)
                        if recipe in all_other_recipes: all_other_recipes.remove(recipe)
                        break
    non_busy_days = [d for d in days if d not in busy_days]
    if non_busy_days:
        for r in normal_recipes:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                from_scratch_day = non_busy_days[0]
                if from_scratch_day not in selected:
                    used_meal_types.add(meal_type)
                    normal_recipes.remove(r)
                    selected[from_scratch_day] = r
                    selected['from_scratch_day'] = from_scratch_day
                    break
    for day in days:
        if day in busy_days and day not in selected:
            recipe = None
            for r in no_chop_recipes:
                meal_type = r.get('meal_type')
                if meal_type not in used_meal_types:
                    recipe = r
                    used_meal_types.add(meal_type)
                    no_chop_recipes.remove(r)
                    break
            if recipe: selected[day] = recipe
    remaining_days = [d for d in days if d not in selected]
    all_available = normal_recipes + all_other_recipes + no_chop_recipes
    for day in remaining_days:
        recipe = None
        for r in all_available:
            meal_type = r.get('meal_type')
            if meal_type not in used_meal_types:
                recipe = r
                used_meal_types.add(meal_type)
                all_available.remove(r)
                break
        if recipe: selected[day] = recipe
    return selected

