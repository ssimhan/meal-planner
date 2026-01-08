import yaml
from pathlib import Path
from datetime import datetime
from .state import archive_all_input_files, update_history, load_history, get_actual_path
from .selection import generate_farmers_market_proposal, get_recent_recipes, filter_recipes, select_dinners
from .html_generator import generate_html_plan
from lunch_selector import LunchSelector, LunchSuggestion

def create_new_week(week_str):
    """Create a new weekly input file with default values."""
    print("\n" + "="*60)
    print(f"CREATING NEW WEEK: {week_str}")
    print("="*60)
    
    print("\n[Step 1/5] Archiving existing input files...")
    archive_all_input_files()

    print("\n[Step 2/5] Generating farmers market proposal...")
    history_path = Path('data/history.yml')
    index_path = Path('recipes/index.yml')
    proposed_veg, staples = generate_farmers_market_proposal(history_path, index_path)

    config_path = Path('config.yml')
    if config_path.exists():
        with open(config_path, 'r') as f: config = yaml.safe_load(f)
    else:
        config = {'timezone': 'America/Los_Angeles', 'schedule': {'office_days': ['mon', 'wed', 'fri'], 'busy_days': ['thu', 'fri']}, 'preferences': {'vegetarian': True, 'avoid_ingredients': ['eggplant', 'mushrooms', 'green_cabbage'], 'novelty_recipe_limit': 1}}

    input_data = {
        'week_of': week_str,
        'timezone': config.get('timezone', 'America/Los_Angeles'),
        'workflow': {'status': 'intake_complete', 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat()},
        'schedule': config.get('schedule', {}),
        'preferences': config.get('preferences', {}),
        'farmers_market': {'status': 'proposed', 'proposed_veg': proposed_veg + staples, 'confirmed_veg': []}
    }

    output_file = Path(f'inputs/{week_str}.yml')
    output_file.parent.mkdir(exist_ok=True, parents=True)
    with open(output_file, 'w') as f:
        yaml.dump(input_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"\n✓ Created: {output_file}")


def generate_meal_plan(input_file, data):
    """Generate the weekly meal plan."""
    print("\n" + "="*60)
    print(f"GENERATING MEAL PLAN")
    print("="*60)
    week_of = data['week_of']
    index_path = Path('recipes/index.yml')
    with open(index_path, 'r') as f:
        recipes = yaml.safe_load(f)
    history_path = Path('data/history.yml')
    history = load_history(history_path)
    recent_recipes = get_recent_recipes(history, lookback_weeks=3)
    filtered = filter_recipes(recipes, data, recent_recipes)
    current_week_history = next((w for w in history.get('weeks', []) if w.get('week_of') == week_of), None)
    selected_dinners = select_dinners(filtered, data, current_week_history, recipes)
    lunch_selector = LunchSelector(index_path, recipes=recipes)
    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    dinner_plan_list = [{'recipe_id': r.get('id'), 'recipe_name': r.get('name'), 'day': d, 'vegetables': r.get('main_veg', [])} for d, r in selected_dinners.items() if d in days]
    selected_lunches = lunch_selector.select_weekly_lunches(dinner_plan=dinner_plan_list, week_of=week_of)
    for d in ['sat', 'sun']:
        selected_dinners[d] = {'name': 'Make at home', 'id': 'make_at_home', 'cuisine': 'various', 'meal_type': 'weekend_meal', 'main_veg': []}
        selected_lunches[d] = LunchSuggestion(recipe_id=f'weekend_lunch_{d}', recipe_name='Make at home', kid_friendly=True, prep_style='fresh', prep_components=[], storage_days=0, prep_day=d, assembly_notes='Weekend flexibility', reuses_ingredients=[], default_option=None, kid_profiles=None)
    plans_dir = get_actual_path('public/plans')
    plans_dir.mkdir(exist_ok=True, parents=True)
    plan_file = plans_dir / f'{week_of}-weekly-plan.html'
    from_scratch_day = selected_dinners.get('from_scratch_day')
    from_scratch_recipe = selected_dinners.get(from_scratch_day) if from_scratch_day else None
    plan_content = generate_html_plan(data, history, selected_dinners, from_scratch_recipe, selected_lunches)
    with open(plan_file, 'w') as f: f.write(plan_content)
    update_history(history_path, data, selected_dinners, selected_lunches)
    if 'workflow' not in data: data['workflow'] = {'status': 'plan_complete', 'created_at': datetime.now().isoformat(), 'updated_at': datetime.now().isoformat()}
    else: data['workflow']['status'] = 'plan_complete'; data['workflow']['updated_at'] = datetime.now().isoformat()
    with open(input_file, 'w') as f: yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    print(f"\n✅ PLAN COMPLETE! View local: {plan_file}")
