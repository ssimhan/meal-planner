import yaml
from pathlib import Path
from datetime import datetime, timedelta
from .selection import _load_inventory_data, score_recipe_by_inventory
from .state import load_history, get_actual_path
from .html_generator import generate_html_plan

class ReplanError(Exception):
    def __init__(self, message, code="INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)

def replan_meal_plan(input_file, data, inventory_dict=None, history_dict=None, notes=None):
    """Re-distribute remaining and skipped meals across the rest of the week."""
    today = datetime.now()
    # If it's early morning (before 4am), consider it still 'yesterday' for replan purposes
    if today.hour < 4:
        today = today - timedelta(days=1)
        
    monday = today - timedelta(days=today.weekday())
    monday_str = monday.strftime('%Y-%m-%d')
    today_abbr = today.strftime('%a').lower()[:3]
    
    # Ensure week_of is present in data for html_generator
    if data and 'week_of' not in data:
        data['week_of'] = monday_str
    
    if data is None:
        if not input_file: 
            input_file = get_actual_path(f'inputs/{monday_str}.yml')
        if input_file.exists():
            with open(input_file, 'r') as f: 
                data = yaml.safe_load(f)
        else: 
            raise ReplanError(f"Input file not found: {input_file}", code="INPUT_READ_ERROR")

    if history_dict:
        history = history_dict
    else:
        history = load_history()

    days_list = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    if today_abbr not in days_list: 
        raise ReplanError(f"Invalid day abbreviation derived: {today_abbr}", code="INVALID_DATE")
        
    week_entry = None
    for week in history.get('weeks', []):
        if week.get('week_of') == monday_str:
            week_entry = week
            break
    
    if not week_entry:
        # If no history entry found for this week, we can't replan based on 'made' status
        raise ReplanError(f"Week {monday_str} not found in history. Cannot replan execution.", code="HISTORY_NOT_FOUND")

    successful_dinners, to_be_planned = [], []
    current_day_idx = days_list.index(today_abbr)
    # Robustly handle malformed dinner entries (None or missing 'day')
    planned_dinners = {
        d['day']: d 
        for d in week_entry.get('dinners', []) 
        if d and isinstance(d, dict) and d.get('day')
    }
    
    for day in days_list:
        dinner = planned_dinners.get(day)
        if not dinner: 
            continue
            
        day_idx = days_list.index(day)
        # Check 'made' status. If not present, it's 'to be planned'
        is_done = dinner.get('made') in [True, 'yes', 'freezer_backup', 'outside_meal']
        
        if is_done:
            successful_dinners.append(dinner)
        elif day_idx < current_day_idx:
            # Past meal that wasn't marked as made - needs to be rescheduled
            dinner.pop('made', None)
            to_be_planned.append(dinner)
        else:
            # Future meal - remains in the 'to be planned' pool
            to_be_planned.append(dinner)

    # Apply Notes Filtering (Heuristic)
    if notes:
        try:
            import re
            notes_lower = notes.lower()
            
            # 1. Exclusions: "no chicken", "without pork", "no soup"
            exclusions = re.findall(r'(?:no|without|hate)\s+(\w+)', notes_lower)
            if exclusions:
                print(f"Applying Replan Exclusions: {exclusions}")
                filtered = []
                for r in to_be_planned:
                    # Construct search text from ID, name, veg, tags
                    r_text = f"{r.get('recipe_id', '')} {r.get('recipe_name', '')} {' '.join(r.get('vegetables', []))} {r.get('cuisine', '')} {r.get('meal_type', '')}".lower()
                    
                    if not any(ex in r_text for ex in exclusions):
                        filtered.append(r)
                    else:
                        print(f"Excluded {r.get('recipe_id')} due to {exclusions}")
                
                to_be_planned = filtered

            # 2. Inclusions/Craving Boost: "want soup", "use broccoli" (handled in scoring if inventory matched, but here we can force priority)
            inclusions = re.findall(r'(?:want|use|like|craving)\s+(\w+)', notes_lower)
            # Also just check single keywords if they aren't exclusions? 
            # For now stick to safe "verb + noun" patterns to avoid noise
            
            if inclusions:
                 for r in to_be_planned:
                    r_text = f"{r.get('recipe_id', '')} {r.get('recipe_name', '')} {' '.join(r.get('vegetables', []))}".lower()
                    if any(inc in r_text for inc in inclusions):
                        # Add a temporary boost flag or just artificially high inventory score later?
                        # We'll attach metadata 'boost': True
                        r['is_requested'] = True
        except Exception as e:
            print(f"Error applying notes: {e}")

    remaining_days = days_list[current_day_idx:]
    inventory_data = _load_inventory_data(inventory_dict=inventory_dict)
    
    all_recipes = []
    index_path = Path('recipes/index.yml')
    if index_path.exists():
        with open(index_path, 'r') as f: 
            all_recipes = yaml.safe_load(f) or []
    
    # Sort remaining meals by inventory scoring
    if (inventory_data['fridge_items'] or inventory_data['pantry_items']) and to_be_planned:
        scored_recipes = []
        for recipe_entry in to_be_planned:
            score, details = score_recipe_by_inventory(
                recipe_id=recipe_entry.get('recipe_id'), 
                recipe_obj=recipe_entry, 
                inventory=inventory_data, 
                all_recipes=all_recipes
            )
            scored_recipes.append((recipe_entry, score, details))
        
        # Sort best inventory matches to the earliest available days
        # Prioritize requested items (score + 1000 effectively)
        scored_recipes.sort(key=lambda x: (1000 if x[0].get('is_requested') else 0) + x[1], reverse=True)
        to_be_planned = [r[0] for r in scored_recipes]

    new_dinners = list(successful_dinners)
    idx = 0
    for day in remaining_days:
        if idx < len(to_be_planned):
            recipe_entry = to_be_planned[idx]
            recipe_entry['day'] = day
            new_dinners.append(recipe_entry)
            idx += 1
    
    # Handle rollover for meals that couldn't fit in the remaining days
    if idx < len(to_be_planned):
        rollover_recipes = to_be_planned[idx:]
        week_entry['rollover'] = []
        for r in rollover_recipes:
             week_entry['rollover'].append({
                 'recipe_id': r.get('recipe_id'), 
                 'cuisine': r.get('cuisine'), 
                 'meal_type': r.get('meal_type'), 
                 'vegetables': r.get('vegetables', [])
             })
    else:
        week_entry.pop('rollover', None)

    # Sort and update week entry
    new_dinners.sort(key=lambda d: days_list.index(d['day']) if d['day'] in days_list else 99)
    week_entry['dinners'] = new_dinners
    
    # Update data (plan_data) for consistency
    data['dinners'] = [{'day': d.get('day'), 'recipe_id': d.get('recipe_id')} for d in new_dinners]
    if 'workflow' in data:
        data['workflow']['updated_at'] = datetime.now().isoformat()
    data['replan_notice'] = f"Plan updated on {datetime.now().strftime('%a at %-I:%M %p')} due to skips/shifts."

    # Write fallback files for legacy support if paths exist
    if not history_dict:
        history_path = get_actual_path('data/history.yml')
        try:
            with open(history_path, 'w') as f: 
                yaml.dump(history, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
        except OSError as e:
            if e.errno == 30: print("WARN: Read-only file system, skipping history.yml write")
            else: print(f"WARN: Failed to write history.yml: {e}")
            
    if input_file and input_file.exists():
        try:
            with open(input_file, 'w') as f: 
                yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
        except OSError as e:
            if e.errno == 30: print("WARN: Read-only file system, skipping input file write")
            else: print(f"WARN: Failed to write input file: {e}")

    # Regenerate HTML and lunches
    try:
        from scripts.lunch_selector import LunchSelector
    except ImportError:
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent.parent))
        from scripts.lunch_selector import LunchSelector

    formatted_dinners = [{
        'day': d.get('day'), 
        'recipe_id': d.get('recipe_id'), 
        'recipe_name': d.get('recipe_id').replace('_', ' ').title()
    } for d in new_dinners]
    
    selector = LunchSelector(recipes=all_recipes)
    selected_lunches = selector.select_weekly_lunches(formatted_dinners, monday_str)
    
    selected_dinners_objs = {}
    for d in new_dinners:
        r_id, day = d.get('recipe_id'), d.get('day')
        if r_id == 'freezer_meal':
            selected_dinners_objs[day] = {'id': 'freezer_meal', 'name': 'Freezer Backup Meal', 'main_veg': [], 'meal_type': 'freezer', 'cuisine': 'various'}
        else:
            recipe = next((r for r in all_recipes if r.get('id') == r_id), None)
            if recipe: 
                selected_dinners_objs[day] = recipe
            else:
                selected_dinners_objs[day] = {'id': r_id, 'name': r_id.replace('_', ' ').title()}

    # Regenerate prep tasks
    from .html_generator import extract_prep_tasks_for_db
    new_prep_tasks = extract_prep_tasks_for_db(selected_dinners_objs, selected_lunches)
    data['prep_tasks'] = new_prep_tasks
    week_entry['prep_tasks'] = new_prep_tasks

    plan_content = generate_html_plan(
        data, 
        history, 
        selected_dinners_objs, 
        selected_lunches=selected_lunches, 
        inventory_dict=inventory_data
    ) or ""
    plans_dir = get_actual_path('public/plans')
    plans_dir.mkdir(exist_ok=True, parents=True)
    plan_file = plans_dir / f'{monday_str}-weekly-plan.html'
    try:
        with open(plan_file, 'w') as f: 
            f.write(plan_content)
    except OSError as e:
        if e.errno == 30: print("WARN: Read-only file system, skipping HTML plan write")
        else: print(f"WARN: Failed to write HTML plan: {e}")
        
    return data, week_entry
