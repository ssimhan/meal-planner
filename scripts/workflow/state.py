import yaml
import os
from pathlib import Path
from datetime import datetime, timedelta

try:
    from scripts.log_execution import get_actual_path, load_history, save_history
except ImportError:
    from log_execution import get_actual_path, load_history, save_history

def get_next_monday():
    """Calculate the date of the upcoming Monday (next week if we're past Saturday)."""
    today = datetime.now()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    next_monday = today + timedelta(days=days_until_monday)
    return next_monday.date()

def find_current_week_file():
    """Find the input file for the current or next week."""
    inputs_dir = get_actual_path('inputs')
    if not inputs_dir.exists():
        next_monday = get_next_monday()
        week_str = next_monday.strftime('%Y-%m-%d')
        return None, week_str

    input_files = sorted(inputs_dir.glob('*.yml'), reverse=True)
    for input_file in input_files:
        with open(input_file, 'r') as f:
            data = yaml.safe_load(f)
        status = data.get('workflow', {}).get('status', 'intake_complete')
        if status not in ('plan_complete', 'archived'):
            week_str = data.get('week_of')
            return input_file, week_str

    next_monday = get_next_monday()
    week_str = next_monday.strftime('%Y-%m-%d')
    return None, week_str

def get_workflow_state(input_file):
    """Determine current workflow state from input file and time."""
    if not input_file or not input_file.exists():
        return 'new_week', None

    with open(input_file, 'r') as f:
        data = yaml.safe_load(f)

    week_of = data.get('week_of')
    status = data.get('workflow', {}).get('status', 'intake_complete')
    
    if week_of:
        try:
            week_start = datetime.strptime(week_of, '%Y-%m-%d')
            week_end = week_start + timedelta(days=7)
            if datetime.now() >= week_end:
                return 'archived', data
        except ValueError:
            pass

    if status == 'intake_complete':
        fm_status = data.get('farmers_market', {}).get('status')
        if fm_status == 'confirmed':
            if week_of and datetime.now().date() >= datetime.strptime(week_of, '%Y-%m-%d').date():
                return 'active', data 
            return 'ready_to_plan', data
        else:
            return 'awaiting_farmers_market', data
    elif status == 'plan_complete':
        now = datetime.now()
        if week_of:
            week_start_date = datetime.strptime(week_of, '%Y-%m-%d').date()
            today = now.date()
            if week_start_date <= today < (week_start_date + timedelta(days=7)):
                if today.weekday() < 5 and now.hour >= 20: 
                    current_day_abbr = now.strftime('%a').lower()[:3]
                    history_path = Path('data/history.yml')
                    if history_path.exists():
                        with open(history_path, 'r') as hf:
                            history = yaml.safe_load(hf)
                            for week in history.get('weeks', []):
                                if week.get('week_of') == week_of:
                                    for dinner in week.get('dinners', []):
                                        if dinner.get('day') == current_day_abbr:
                                            if 'made' not in dinner:
                                                return 'waiting_for_checkin', data
                                            break
                                    break
        return 'active', data 
    else:
        return 'new_week', None

def archive_expired_weeks():
    """Find weeks that have passed their end date and handle rollover."""
    history = load_history()
    dirty = False
    input_dir = Path('inputs')
    for input_file in input_dir.glob('*.yml'):
        if input_file.name == '.gitkeep': continue
        state, data = get_workflow_state(input_file)
        if state == 'archived' and data.get('workflow', {}).get('status') != 'archived':
            print(f"Archiving week {data.get('week_of')}...")
            week_of = data.get('week_of')
            history_week = None
            for w in history.get('weeks', []):
                if w.get('week_of') == week_of:
                    history_week = w
                    break
            if history_week:
                fridge_veg = history_week.get('fridge_vegetables', [])
                unmade_meals = []
                for dinner in history_week.get('dinners', []):
                    if not dinner.get('made'):
                        unmade_meals.append({
                            'recipe_id': dinner.get('recipe_id'),
                            'day': dinner.get('day'),
                            'reason': dinner.get('reason', 'Skipped')
                        })
                next_monday = datetime.strptime(week_of, '%Y-%m-%d') + timedelta(days=7)
                next_week_str = next_monday.strftime('%Y-%m-%d')
                next_input_path = Path(f'inputs/{next_week_str}.yml')
                if next_input_path.exists():
                    with open(next_input_path, 'r') as nf:
                        next_data = yaml.safe_load(nf)
                    if 'rollover' not in next_data: next_data['rollover'] = []
                    for meal in unmade_meals:
                        if not any(r.get('recipe_id') == meal['recipe_id'] for r in next_data['rollover']):
                            next_data['rollover'].append({
                                'recipe_id': meal['recipe_id'],
                                'source_week': week_of
                            })
                    if 'farmers_market' in next_data:
                        if 'proposed_veg' not in next_data['farmers_market']:
                            next_data['farmers_market']['proposed_veg'] = []
                        for veg in fridge_veg:
                            if veg not in next_data['farmers_market']['proposed_veg']:
                                next_data['farmers_market']['proposed_veg'].append(veg)
                    with open(next_input_path, 'w') as nf:
                        yaml.dump(next_data, nf, sort_keys=False)
            if 'workflow' not in data: data['workflow'] = {}
            data['workflow']['status'] = 'archived'
            with open(input_file, 'w') as f:
                yaml.dump(data, f, sort_keys=False)
            dirty = True
    if dirty:
        save_history(history)
        try:
            from scripts.github_helper import sync_changes_to_github
            sync_changes_to_github(['data/history.yml'] + [str(p) for p in input_dir.glob('*.yml')])
        except Exception as e:
            print(f"Sync failed: {e}")

def archive_all_input_files():
    """Archive ALL input files to history.yml."""
    inputs_dir = get_actual_path('inputs')
    if not inputs_dir.exists():
        return 
    history = load_history()
    if 'weeks' not in history:
        history['weeks'] = []
    archived_count = 0
    for input_file in inputs_dir.glob('*.yml'):
        if input_file.name == '.gitkeep':
            continue
        try:
            with open(input_file, 'r') as f:
                week_data = yaml.safe_load(f)
            if not week_data:
                continue
            week_of = week_data.get('week_of')
            if not week_of:
                print(f"Warning: Input file {input_file.name} has no week_of field, skipping")
                continue
            history['weeks'] = [w for w in history['weeks'] if w.get('week_of') != week_of]
            history['weeks'].append(week_data)
            archived_count += 1
            input_file.unlink()
            print(f"  ✓ Archived {week_of} to history.yml")
        except Exception as e:
            print(f"Warning: Failed to archive {input_file.name}: {e}")
            continue
    if archived_count > 0:
        history['weeks'].sort(key=lambda w: w.get('week_of', ''))
        save_history(history)
        try:
            from scripts.github_helper import sync_changes_to_github
            sync_changes_to_github(['data/history.yml'])
        except Exception as e:
            print(f"Warning: GitHub sync failed: {e}")
        print(f"\n✓ Archived {archived_count} week(s) to history.yml")

def update_history(history_path, inputs, selected_dinners, selected_lunches=None):
    """Update history.yml with the new week's dinners and lunches."""
    history = load_history(history_path)
    week_of = inputs['week_of']
    new_week = {
        'week_of': week_of,
        'prep_tasks': inputs.get('prep_tasks', []),
        'dinners': [],
        'lunches': {}
    }
    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            new_week['dinners'].append({
                'recipe_id': recipe['id'],
                'cuisine': recipe.get('cuisine'),
                'meal_type': recipe.get('meal_type'),
                'day': day,
                'vegetables': recipe.get('main_veg', [])
            })
        if selected_lunches and day in selected_lunches:
            lunch = selected_lunches[day]
            new_week['lunches'][day] = {
                'recipe_id': getattr(lunch, 'recipe_id', None),
                'recipe_name': getattr(lunch, 'recipe_name', 'Unknown'),
                'prep_style': getattr(lunch, 'prep_style', 'quick_fresh'),
                'assembly_notes': getattr(lunch, 'assembly_notes', '')
            }
    week_entry = None
    for week in history.get('weeks', []):
        if week.get('week_of') == week_of:
            week_entry = week
            break
    if week_entry:
        week_entry['dinners'] = new_week['dinners']
        week_entry['lunches'] = new_week['lunches']
        week_entry['prep_tasks'] = new_week['prep_tasks']
    else:
        history.setdefault('weeks', []).append(new_week)
    if history_path:
        with open(history_path, 'w') as f:
            yaml.dump(history, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    return history
