import yaml
from pathlib import Path
from datetime import datetime, timedelta
from scripts.workflow.selection import _load_inventory_data, score_recipe_by_inventory
from scripts.workflow.state import load_history, get_actual_path
from scripts.workflow.html_generator import generate_html_plan

def replan_meal_plan(input_file, data):
    """Re-distribute remaining and skipped meals across the rest of the week."""
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    monday_str = monday.strftime('%Y-%m-%d')
    today_abbr = today.strftime('%a').lower()[:3]
    if data is None:
        if not input_file: input_file = get_actual_path(f'inputs/{monday_str}.yml')
        if input_file.exists():
            with open(input_file, 'r') as f: data = yaml.safe_load(f)
        else: return
    history_path = get_actual_path('data/history.yml')
    history = load_history(history_path)
    days_list = ['mon', 'tue', 'wed', 'thu', 'fri']
    if today_abbr not in days_list: return
    week_entry = None
    for week in history.get('weeks', []):
        if week.get('week_of') == monday_str:
            week_entry = week
            break
    if not week_entry: return
    successful_dinners, to_be_planned = [], []
    current_day_idx = days_list.index(today_abbr)
    planned_dinners = {d['day']: d for d in week_entry.get('dinners', [])}
    for day in days_list:
        dinner = planned_dinners.get(day)
        if not dinner: continue
        day_idx = days_list.index(day)
        is_done = dinner.get('made') in [True, 'yes', 'freezer_backup']
        if is_done: successful_dinners.append(dinner)
        elif day_idx < current_day_idx:
            dinner.pop('made', None)
            to_be_planned.append(dinner)
        else: to_be_planned.append(dinner)
    remaining_days = days_list[current_day_idx:]
    inventory_data = _load_inventory_data()
    all_recipes = []
    index_path = Path('recipes/index.yml')
    if index_path.exists():
        with open(index_path, 'r') as f: all_recipes = yaml.safe_load(f) or []
    if inventory_data['fridge_items'] or inventory_data['pantry_items']:
        scored_recipes = []
        for recipe_entry in to_be_planned:
            score, details = score_recipe_by_inventory(recipe_id=recipe_entry.get('recipe_id'), recipe_obj=recipe_entry, inventory=inventory_data, all_recipes=all_recipes)
            scored_recipes.append((recipe_entry, score, details))
        scored_recipes.sort(key=lambda x: x[1], reverse=True)
        to_be_planned = [r[0] for r in scored_recipes]
    new_dinners = list(successful_dinners)
    idx = 0
    for day in remaining_days:
        if idx < len(to_be_planned):
            recipe_entry = to_be_planned[idx]
            recipe_entry['day'] = day
            new_dinners.append(recipe_entry)
            idx += 1
    if idx < len(to_be_planned):
        rollover_recipes = to_be_planned[idx:]
        week_entry['rollover'] = []
        for r in rollover_recipes:
             week_entry['rollover'].append({'recipe_id': r.get('recipe_id'), 'cuisine': r.get('cuisine'), 'meal_type': r.get('meal_type'), 'vegetables': r.get('vegetables', [])})
    else: week_entry.pop('rollover', None)
    new_dinners.sort(key=lambda d: days_list.index(d['day']) if d['day'] in days_list else 99)
    week_entry['dinners'] = new_dinners
    with open(history_path, 'w') as f: yaml.dump(history, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    if input_file and input_file.exists():
        data['dinners'] = [{'day': d.get('day'), 'recipe_id': d.get('recipe_id')} for d in new_dinners]
        if 'workflow' in data: data['workflow']['updated_at'] = datetime.now().isoformat()
        with open(input_file, 'w') as f: yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    from lunch_selector import LunchSelector
    formatted_dinners = [{'day': d.get('day'), 'recipe_id': d.get('recipe_id'), 'recipe_name': d.get('recipe_id').replace('_', ' ').title()} for d in new_dinners]
    selector = LunchSelector()
    selected_lunches = selector.select_weekly_lunches(formatted_dinners, monday_str)
    selected_dinners_objs = {}
    for d in new_dinners:
        r_id, day = d.get('recipe_id'), d.get('day')
        if r_id == 'freezer_meal': selected_dinners_objs[day] = {'id': 'freezer_meal', 'name': 'Freezer Backup Meal', 'main_veg': [], 'meal_type': 'freezer', 'cuisine': 'various'}
        else:
            recipe = next((r for r in all_recipes if r.get('id') == r_id), None)
            if recipe: selected_dinners_objs[day] = recipe
    data['replan_notice'] = f"Plan updated on {datetime.now().strftime('%a at %-I:%M %p')} due to skips/shifts."
    plan_content = generate_html_plan(data, history, selected_dinners_objs, selected_lunches=selected_lunches)
    plans_dir = get_actual_path('public/plans')
    plans_dir.mkdir(exist_ok=True, parents=True)
    plan_file = plans_dir / f'{monday_str}-weekly-plan.html'
    with open(plan_file, 'w') as f: f.write(plan_content)
