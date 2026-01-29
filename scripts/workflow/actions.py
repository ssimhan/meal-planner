import sys
import yaml
from pathlib import Path
from datetime import datetime
from .state import archive_all_input_files, update_history, load_history, get_actual_path
from .selection import generate_farmers_market_proposal, get_recent_recipes, filter_recipes, select_dinners
from .html_generator import generate_html_plan
try:
    from scripts.lunch_selector import LunchSelector, LunchSuggestion
except ModuleNotFoundError:
    # When running from GitHub Actions or other contexts without scripts in path
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    from scripts.lunch_selector import LunchSelector, LunchSuggestion

def create_new_week(week_str, history_dict=None, recipes_list=None, config_dict=None):
    """Create a new weekly input file with default values."""
    print("\n" + "="*60)
    print(f"CREATING NEW WEEK: {week_str}")
    print("="*60)
    
    # 1. Farmers market proposal
    if history_dict and recipes_list:
        # We can't easily pass paths to the proposal geno, so we might need to refactor that too
        # For now, let's keep it as is or update the proposal function
        proposed_veg, staples = generate_farmers_market_proposal(None, None, history_dict=history_dict, recipes_list=recipes_list)
    else:
        history_path = Path('data/history.yml')
        index_path = Path('recipes/index.yml')
        proposed_veg, staples = generate_farmers_market_proposal(history_path, index_path)

    from api.utils.storage import StorageEngine
    
    if config_dict:
        config = config_dict
    else:
        # Load from DB or legacy file via StorageEngine abstraction
        config = StorageEngine.get_config()

    input_data = {
        'week_of': week_str,
        'timezone': config.get('timezone', 'America/Los_Angeles'),
        'workflow': {'status': 'intake_complete', 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat()},
        'schedule': config.get('schedule', {}),
        'preferences': config.get('preferences', {}),
        'meals_covered': config.get('meals_covered', {}),
        'farmers_market': {'status': 'proposed', 'proposed_veg': proposed_veg + staples, 'confirmed_veg': []}
    }

    # Only write to file if no dicts provided (CLI mode)
    if not history_dict:
        output_file = Path(f'inputs/{week_str}.yml')
        output_file.parent.mkdir(exist_ok=True, parents=True)
        with open(output_file, 'w') as f:
            yaml.dump(input_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
        print(f"\n✓ Created: {output_file}")
    
    return input_data


def generate_meal_plan(input_file, data, recipes_list=None, history_dict=None, exclude_defaults=None):
    """Generate the weekly meal plan."""
    print("\n" + "="*60)
    print(f"GENERATING MEAL PLAN")
    print("="*60)
    
    week_of = data['week_of']
    meals_covered = data.get('meals_covered', {})
    
    # Helper to check if a specific day is covered for a meal type
    def is_covered(meal_type, day):
        # 1. New List Format: ['mon', 'tue']
        val = meals_covered.get(meal_type)
        if isinstance(val, list):
            return day in val
        # 2. Legacy Boolean Format or Default
        if isinstance(val, bool):
            return val
        # 3. Default True if undefined
        return True

    history_path = get_actual_path('data/history.yml')
    
    if recipes_list:
        recipes = recipes_list
    else:
        index_path = Path('recipes/index.yml')
        with open(index_path, 'r') as f:
            recipes = yaml.safe_load(f)
            
    if history_dict:
        history = history_dict
    else:
        history = load_history()

    recent_recipes = get_recent_recipes(history, lookback_weeks=3)
    filtered = filter_recipes(recipes, data, recent_recipes)
    
    current_week_history = next((w for w in history.get('weeks', []) if w.get('week_of') == week_of), None)
    
    selected_dinners = {}
    selected_dinners = {}
    # Only select dinners for days covered
    days_needing_dinner = [d for d in ['mon', 'tue', 'wed', 'thu', 'fri'] if is_covered('dinner', d)]
    
    if days_needing_dinner:
        # We need to adapt select_dinners to verify day coverage or filter afterwards
        # For now, let's select for all and filter, or assume select_dinners selects for all 5 days
        full_week_dinners = select_dinners(filtered, data, current_week_history, recipes)
        selected_dinners = {d: r for d, r in full_week_dinners.items() if d in days_needing_dinner or d in ['sat', 'sun']}
    
    lunch_selector = LunchSelector(recipes=recipes)
    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    dinner_plan_list = [{'recipe_id': r.get('id'), 'recipe_name': r.get('name'), 'day': d, 'vegetables': list(r.get('main_veg', []))} for d, r in selected_dinners.items() if d in days]
    
    selected_lunches = {}
    selected_lunches = {}
    
    # Check if ANY day needs lunch to run the selector
    any_lunch_needed = any(is_covered('kids_lunch', d) or is_covered('adult_lunch', d) for d in days)
    
    if any_lunch_needed:
        # Pass existing lunches from current_week_history if they exist
        existing_lunches = current_week_history.get('lunches', {}) if current_week_history else {}
        selected_lunches = lunch_selector.select_weekly_lunches(
            dinner_plan=dinner_plan_list, 
            week_of=week_of,
            current_lunches=existing_lunches,
            exclude_defaults=exclude_defaults
        )
        # Filter selected lunches to remove days logic - wait, selected_lunches returns a dict of days
        # We keep the object for now, Status API handles visibility based on config 
        pass
    
    # Remove automatic Sat/Sun defaults to allow per-household flexibility or empty planning (BUG-003)
    # for d in ['sat', 'sun']:
    #     if is_covered('dinner', d) and d not in selected_dinners:
    #         selected_dinners[d] = {'name': 'Make at home', 'id': 'make_at_home', 'cuisine': 'various', 'meal_type': 'weekend_meal', 'main_veg': []}
    #     if (is_covered('kids_lunch', d) or is_covered('adult_lunch', d)) and d not in selected_lunches:
    #         selected_lunches[d] = LunchSuggestion(recipe_id=f'weekend_lunch_{d}', recipe_name='Make at home', kid_friendly=True, prep_style='fresh', prep_components=[], storage_days=0, prep_day=d, assembly_notes='Weekend flexibility', reuses_ingredients=[], default_option=None, kid_profiles=None)
            
    # Populate data with generated plan for frontend/DB
    data['dinners'] = [
        {
            'day': d, 
            'recipe_id': r.get('id'), 
            'recipe_name': r.get('name'), 
            'vegetables': list(r.get('main_veg', [])),
            'cuisine': r.get('cuisine'),
            'meal_type': r.get('meal_type')
        } 
        for d, r in selected_dinners.items() if isinstance(r, dict) and is_covered('dinner', d)
    ]
    
    data['lunches'] = {}
    # Populate lunches if any day needs kids or adult lunch
    if any_lunch_needed:
        data['lunches'] = {
            d: {
                'recipe_id': getattr(l, 'recipe_id', None) if not isinstance(l, dict) else l.get('recipe_id'),
                'recipe_name': getattr(l, 'recipe_name', 'Unknown') if not isinstance(l, dict) else l.get('recipe_name'),
                'kid_friendly': getattr(l, 'kid_friendly', True) if not isinstance(l, dict) else l.get('kid_friendly'),
                'prep_style': getattr(l, 'prep_style', 'fresh') if not isinstance(l, dict) else l.get('prep_style'),
                'prep_components': getattr(l, 'prep_components', []) if not isinstance(l, dict) else l.get('prep_components'),
                'assembly_notes': getattr(l, 'assembly_notes', '') if not isinstance(l, dict) else l.get('assembly_notes')
            }
            for d, l in selected_lunches.items()
        }
    
    # Snack generation: use SnackSelector for automated planning from recipes
    try:
        from scripts.snack_selector import SnackSelector
        selector = SnackSelector(recipes=recipes, kid_profiles=config.get('kid_profiles', {}))
        days_needing_snacks = [d for d in ['mon', 'tue', 'wed', 'thu', 'fri'] if is_covered('school_snack', d) or is_covered('home_snack', d)]
        existing_snacks = current_week_history.get('snacks', {}) if current_week_history else {}
        data['snacks'] = selector.select_weekly_snacks(days_needing_snacks, current_snacks=existing_snacks)
    except Exception as e:
        print(f"Warning: Snack selection failed: {e}")
        data['snacks'] = {}

    # NEW: Extract structured prep tasks and save to persistence
    from .html_generator import extract_prep_tasks_for_db
    prep_tasks = extract_prep_tasks_for_db(selected_dinners, selected_lunches)
    data['prep_tasks'] = prep_tasks

    # Update history dict/file
    history = update_history(None if history_dict else history_path, data, selected_dinners, selected_lunches)

    if 'workflow' not in data: 
        data['workflow'] = {'status': 'plan_complete', 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat()}
    else: 
        data['workflow']['status'] = 'plan_complete'; data['workflow']['updated_at'] = datetime.now().isoformat()
    
    # Write fallback files for legacy
    if input_file and input_file.exists():
        with open(input_file, 'w') as f: 
            yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # HTML generation (always write to disk for now as it's used for display)
    from_scratch_day = selected_dinners.get('from_scratch_day')
    from_scratch_recipe = selected_dinners.get(from_scratch_day) if from_scratch_day else None
    
    # Optional: fetch inventory for the status box
    inv_data = None
    try:
        from .selection import _load_inventory_data
        inv_data = _load_inventory_data()
    except: pass

    plan_content = generate_html_plan(
        data, 
        history, 
        selected_dinners, 
        from_scratch_recipe, 
        selected_lunches,
        inventory_dict=inv_data
    )
    
    plans_dir = get_actual_path('public/plans')
    plans_dir.mkdir(exist_ok=True, parents=True)
    plan_file = plans_dir / f'{week_of}-weekly-plan.html'
    with open(plan_file, 'w') as f: 
        f.write(plan_content)

    return data, history
