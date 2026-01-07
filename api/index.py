from flask import Flask, jsonify, request
import sys
import os
from pathlib import Path
from datetime import datetime
from flask_cors import CORS
import traceback

# Add the parent directory to sys.path so we can import from scripts/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from scripts.workflow import find_current_week_file, get_workflow_state, generate_granular_prep_tasks
except ImportError as e:
    # Fallback for local development
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../scripts")))
    from workflow import find_current_week_file, get_workflow_state, generate_granular_prep_tasks

from api.generate_plan import generate_plan_api

import yaml
from scripts.compute_analytics import compute_analytics

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

def get_actual_path(rel_path):
    is_vercel = os.environ.get('VERCEL') == '1'
    if is_vercel:
        tmp_path = Path("/tmp") / rel_path
        if tmp_path.exists():
            return tmp_path
    return Path(rel_path)

def get_yaml_data(rel_path):
    """Fetches YAML data, prioritizing GitHub Truth on Vercel."""
    is_vercel = os.environ.get('VERCEL') == '1'
    repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
    from scripts.github_helper import get_file_from_github
    
    if is_vercel:
        content = get_file_from_github(repo_name, rel_path)
        if content:
            # Sync to /tmp for other scripts
            tmp_path = Path("/tmp") / rel_path
            os.makedirs(tmp_path.parent, exist_ok=True)
            with open(tmp_path, 'w') as f:
                f.write(content)
            return yaml.safe_load(content)
            
    # Fallback to local
    path = Path(rel_path)
    if path.exists():
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    return None

# ============================================================================
# Caching Logic
# ============================================================================
CACHE = {
    'recipes': {'data': None, 'timestamp': 0},
    'inventory': {'data': None, 'timestamp': 0},
    'history': {'data': None, 'timestamp': 0}
}

CACHE_TTL = 300  # 5 minutes

def get_cached_data(key, path):
    """Get data from cache or load from file."""
    is_vercel = os.environ.get('VERCEL') == '1'

    # On Vercel, disable caching for frequently updated files since each
    # serverless invocation may not share memory and GitHub is source of truth
    if is_vercel and key in ['history', 'inventory']:
        return get_yaml_data(path)

    now = datetime.now().timestamp()
    cache_entry = CACHE.get(key)

    if cache_entry and cache_entry['data'] and (now - cache_entry['timestamp'] < CACHE_TTL):
        return cache_entry['data']

    data = get_yaml_data(path)
    if data:
        CACHE[key] = {'data': data, 'timestamp': now}

    return data

def invalidate_cache(key=None):
    """Clear specific cache key or all keys."""
    if key:
        if key in CACHE:
            CACHE[key] = {'data': None, 'timestamp': 0}
    else:
        for k in CACHE:
            CACHE[k] = {'data': None, 'timestamp': 0}

@app.route("/api/status")
def get_status():
    return _get_current_status(skip_sync=False)

def _get_current_status(skip_sync=False):
    try:
        from scripts.workflow import get_workflow_state, find_current_week_file, archive_expired_weeks
        from scripts.github_helper import get_file_from_github, list_files_in_dir_from_github
        
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        is_vercel = os.environ.get('VERCEL') == '1'

        # Helper to sync a file from GitHub to /tmp
        def sync_file(rel_path):
            if not is_vercel: return Path(rel_path)
            content = get_file_from_github(repo_name, rel_path)
            if content:
                tmp_path = Path("/tmp") / rel_path
                os.makedirs(tmp_path.parent, exist_ok=True)
                with open(tmp_path, 'w') as f:
                    f.write(content)
                return tmp_path
            return Path(rel_path)

        # 0. Background sync key files
        if is_vercel and not skip_sync:
            sync_file('data/history.yml')
            sync_file('data/inventory.yml')
            sync_file('config.yml')
            # Also sync any new files in inputs/
            input_files = list_files_in_dir_from_github(repo_name, "inputs")
            for f in input_files:
                sync_file(f)
 
        try:
            # Note: archive_expired_weeks might still fail to write, which is handled
            archive_expired_weeks()
        except Exception as e:
            print(f"Warning: Failed to archive: {e}")
        
        from datetime import datetime, timedelta
        import pytz

        pacific_tz = pytz.timezone('America/Los_Angeles')
        today = datetime.now(pacific_tz)

        monday = today - timedelta(days=today.weekday())
        week_str = monday.strftime('%Y-%m-%d')

        input_file = None
        week_str = None
        
        # 1. Look for incomplete weeks (planning in progress)
        if is_vercel:
            inputs_dir = Path("/tmp/inputs")
            if inputs_dir.exists():
                for f in sorted(inputs_dir.glob('*.yml'), reverse=True):
                    with open(f, 'r') as yf:
                        try:
                            data = yaml.safe_load(yf)
                            if data and data.get('workflow', {}).get('status') not in ('plan_complete', 'archived'):
                                input_file = f
                                week_str = data.get('week_of')
                                break
                        except: continue
        else:
            input_file, week_str = find_current_week_file()

        # 2. Fallback to current calendar week if no incomplete week found
        if not input_file:
            monday = today - timedelta(days=today.weekday())
            week_str = monday.strftime('%Y-%m-%d')
            input_file = get_actual_path(f'inputs/{week_str}.yml')
            # If that doesn't exist either, check if we're looking ahead to next week
            if not input_file.exists() and today.weekday() >= 4:
                next_monday = monday + timedelta(days=7)
                week_str = next_monday.strftime('%Y-%m-%d')
                input_file = get_actual_path(f'inputs/{week_str}.yml')

        state, data = get_workflow_state(input_file)
        current_day = today.strftime('%a').lower()[:3]

        today_dinner = None
        today_lunch = None
        today_snacks = {
            "school": "Fruit or Cheese sticks",
            "home": "Cucumber or Crackers"
        }
        prep_tasks = []
        
        DEFAULT_SNACKS = {
            'mon': 'Apple slices with peanut butter',
            'tue': 'Cheese and crackers',
            'wed': 'Cucumber rounds with cream cheese',
            'thu': 'Grapes',
            'fri': 'Crackers with hummus'
        }
        today_snacks["school"] = DEFAULT_SNACKS.get(current_day, "Fruit")

        history_week = None
        if state in ['active', 'waiting_for_checkin']:
            from scripts.log_execution import find_week
            # Use Cached History
            history = get_cached_data('history', 'data/history.yml') or {}
            history_week = find_week(history, week_str)

            if history_week and 'daily_feedback' in history_week:
                day_feedback = history_week['daily_feedback'].get(current_day, {})
                for key in ['school_snack', 'school_snack_made', 'home_snack', 'home_snack_made']:
                    if key in day_feedback:
                        today_snacks[key + ('_feedback' if 'feedback' not in key and 'made' not in key else '')] = day_feedback[key]
            
            dinners = history_week.get('dinners', []) if history_week else (data.get('dinners', []) if data else [])
            for dinner in dinners:
                if dinner.get('day') == current_day:
                    today_dinner = dinner
                    break
            
            history_lunches = history_week.get('lunches', {}) if history_week else {}
            if current_day in history_lunches:
                today_lunch = history_lunches[current_day]
            elif data and 'selected_lunches' in data:
                today_lunch = data['selected_lunches'].get(current_day)

            if not today_lunch:
                 today_lunch = {"recipe_name": "Leftovers or Simple Lunch", "prep_style": "quick_fresh"}

            if history_week and 'daily_feedback' in history_week:
                day_feedback = history_week['daily_feedback'].get(current_day, {})
                for key in ['kids_lunch', 'kids_lunch_made', 'adult_lunch', 'adult_lunch_made']:
                    if key in day_feedback:
                        today_lunch[key + ('_feedback' if 'feedback' not in key and 'made' not in key else '')] = day_feedback[key]

        # Extract completed prep tasks from history
        completed_prep = []
        if history_week and 'daily_feedback' in history_week:
            for day_idx, feedback in history_week['daily_feedback'].items():
                if 'prep_completed' in feedback:
                    completed_prep.extend(feedback['prep_completed'])

        # Prep tasks from input data if available
        if data and 'prep_tasks' in data:
            prep_tasks = data.get('prep_tasks', [])

        completed_prep_today = []
        if history_week and 'daily_feedback' in history_week:
            day_feedback = history_week['daily_feedback'].get(current_day, {})
            completed_prep_today = day_feedback.get('prep_completed', [])

        return jsonify({
            "week_of": week_str,
            "state": state,
            "has_data": data is not None,
            "status": "success",
            "current_day": current_day,
            "today_dinner": today_dinner,
            "today_lunch": today_lunch,
            "today_snacks": today_snacks,
            "prep_tasks": prep_tasks,
            "completed_prep": completed_prep_today,
            "week_data": history_week if state in ['active', 'waiting_for_checkin'] else data
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/recipes")
def get_recipes():
    try:
        # Use Cached Recipes
        recipes = get_cached_data('recipes', 'recipes/index.yml')
        if recipes is None:
            return jsonify({"status": "error", "message": "Recipe index not found"}), 404
        return jsonify({"status": "success", "recipes": recipes})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/recipes/<recipe_id>")
def get_recipe_details(recipe_id):
    """Fetch full recipe details on demand from Markdown."""
    try:
        detail_path = Path(f'recipes/content/{recipe_id}.md')
        if detail_path.exists():
             with open(detail_path, 'r') as f:
                content = f.read()
                
                # Basic frontmatter parsing (assuming standard --- format)
                if content.startswith('---'):
                    try:
                        _, fm_text, body = content.split('---', 2)
                        metadata = yaml.safe_load(fm_text)
                        return jsonify({
                            "status": "success", 
                            "recipe": metadata,
                            "markdown": body.strip()
                        })
                    except Exception as e:
                        print(f"Error parsing frontmatter for {recipe_id}: {e}")
                        return jsonify({"status": "success", "markdown": content})
                
                return jsonify({"status": "success", "markdown": content})
        else:
             return jsonify({"status": "error", "message": f"Recipe details not found for {recipe_id}"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/inventory")
def get_inventory():
    try:
        # Use Cached Inventory
        inventory = get_cached_data('inventory', 'data/inventory.yml')
        if inventory is None:
            # Fallback empty inventory if file missing
            inventory = {'fridge':[], 'pantry':[], 'freezer':{}}
        
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/swap-meals", methods=["POST"])
def swap_meals():
    try:
        data = request.json or {}
        week_str = data.get('week')
        day1 = data.get('day1') # e.g. "mon"
        day2 = data.get('day2') # e.g. "thu"

        if not week_str or not day1 or not day2:
             return jsonify({"status": "error", "message": "Week, day1, and day2 are required"}), 400

        # Load Input File
        from scripts.workflow import find_current_week_file
        
        input_file = None
        # Try to find specific week file
        potential_file = Path(f'inputs/{week_str}.yml')
        if potential_file.exists():
             input_file = potential_file
        else:
             # Fallback logic
             f, w = find_current_week_file()
             if w == week_str:
                 input_file = f
        
        if not input_file or not input_file.exists():
             return jsonify({"status": "error", "message": f"Input file for week {week_str} not found"}), 404

        week_data = get_yaml_data(str(input_file))
        if not week_data:
             return jsonify({"status": "error", "message": "Could not load input file"}), 500

        # Load History File
        history = get_yaml_data('data/history.yml')
        history_week = None
        if history:
            from scripts.log_execution import find_week
            history_week = find_week(history, week_str)

        # Helper to find dinner in list
        def get_dinner(dinners_list, d):
            for i, dinner in enumerate(dinners_list):
                 if dinner.get('day') == d:
                     return i, dinner
            return -1, None

        # Swap in Input File
        if 'dinners' in week_data:
            idx1, dinner1 = get_dinner(week_data['dinners'], day1)
            idx2, dinner2 = get_dinner(week_data['dinners'], day2)

            if dinner1 and dinner2:
                # Update days
                dinner1['day'] = day2
                dinner2['day'] = day1
                # Swap positions in list (optional but good for consistency)
                week_data['dinners'][idx1] = dinner2
                week_data['dinners'][idx2] = dinner1
            elif dinner1:
                dinner1['day'] = day2
            elif dinner2:
                dinner2['day'] = day1
        
        # Swap in History File
        if history_week and 'dinners' in history_week:
            idx1, dinner1 = get_dinner(history_week['dinners'], day1)
            idx2, dinner2 = get_dinner(history_week['dinners'], day2)

            if dinner1 and dinner2:
                dinner1['day'] = day2
                dinner2['day'] = day1
                history_week['dinners'][idx1] = dinner2
                history_week['dinners'][idx2] = dinner1
            elif dinner1:
                dinner1['day'] = day2
            elif dinner2:
                dinner2['day'] = day1

        # Regenerate Prep Tasks
        # 1. Load Recipes
        recipes = get_cached_data('recipes', 'recipes/index.yml') or []
        
        # 2. Reconstruct selected_dinners and selected_lunches for generator
        selected_dinners = {}
        if history_week:
             for d in history_week.get('dinners', []):
                 d_day = d.get('day')
                 # Enrich with name/veg from recipe index if needed
                 # History usually has minimal data, but let's check
                 if 'recipe_id' in d:
                     r_match = next((r for r in recipes if r['id'] == d['recipe_id']), None)
                     if r_match:
                         # Merge details for the generator
                         full_d = d.copy()
                         full_d['name'] = r_match.get('name', d['recipe_id'])
                         full_d['main_veg'] = r_match.get('main_veg', [])
                         selected_dinners[d_day] = full_d
        
        selected_lunches = {}
        
        class SimpleLunch:
             def __init__(self, data):
                 self.prep_components = data.get('prep_components', [])
                 self.recipe_name = data.get('recipe_name', 'Lunch')
        
        if history_week and 'lunches' in history_week:
             for day, lunch_data in history_week['lunches'].items():
                 selected_lunches[day] = SimpleLunch(lunch_data)
        elif week_data and 'selected_lunches' in week_data:
              for day, lunch_data in week_data['selected_lunches'].items():
                 selected_lunches[day] = SimpleLunch(lunch_data)

        # 3. Call Generator
        # We need to preserve completed tasks
        completed_prep = []
        if history_week and 'daily_feedback' in history_week:
             for df in history_week['daily_feedback'].values():
                 if 'prep_completed' in df:
                     completed_prep.extend(df['prep_completed'])
        
        # Regenerate for Mon/Tue and Wed-Fri
        tasks_mon_tue = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['mon', 'tue'], "Mon/Tue", completed_prep)
        tasks_wed_fri = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['wed', 'thu', 'fri'], "Wed-Fri", completed_prep)
        
        new_prep_tasks = []
        if tasks_mon_tue:
             new_prep_tasks.append("Monday Prep (for Mon/Tue meals):")
             new_prep_tasks.extend([f"- [ ] {t}" for t in tasks_mon_tue])
        
        if tasks_wed_fri:
              new_prep_tasks.append("Wednesday Prep (for Thu/Fri meals):")
              new_prep_tasks.extend([f"- [ ] {t}" for t in tasks_wed_fri])

        # Update Week Data
        week_data['prep_tasks'] = new_prep_tasks

        # Save Files
        file_dict = {
            str(input_file): yaml.dump(week_data, default_flow_style=False, sort_keys=False, allow_unicode=True),
        }
        if history:
             file_dict['data/history.yml'] = yaml.dump(history, default_flow_style=False, sort_keys=False, allow_unicode=True)

        # Write locally
        for path, content in file_dict.items():
            try:
                with open(path, 'w') as f:
                    f.write(content)
            except OSError: pass

        # Sync to GitHub
        from scripts.github_helper import commit_multiple_files_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        commit_multiple_files_to_github(repo_name, file_dict, f"Swap meals {day1}<->{day2} for week {week_str}")
        
        invalidate_cache()

        return jsonify({"status": "success", "message": "Meals swapped and prep tasks updated", "week_data": week_data})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/history")
def get_history():
    try:
        # Use Cached History
        history = get_cached_data('history', 'data/history.yml')
        if history is None:
             return jsonify({"status": "error", "message": "History file not found"}), 404
        return jsonify({
            "status": "success", 
            "history": history,
            "count": len(history.get('weeks', [])) if history else 0
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Register plan generation routes
generate_plan_api(app)

@app.route("/api/analytics")
def get_analytics():
    try:
        # We can add caching here if history.yml is large
        stats = compute_analytics()
        return jsonify(stats)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/log-meal", methods=["POST"])
def log_meal():
    try:
        data = request.json or {}
        week_str = data.get('week')
        day = data.get('day') # mon, tue, wed...
        made = data.get('made') # yes, no, freezer
        vegetables = data.get('vegetables') # comma separated string
        kids_feedback = data.get('kids_feedback')
        kids_complaints = data.get('kids_complaints')
        actual_meal = data.get('actual_meal')
        made_2x = data.get('made_2x', False)
        freezer_meal = data.get('freezer_meal')
        reason = data.get('reason')
        # New feedback fields
        school_snack_feedback = data.get('school_snack_feedback')
        home_snack_feedback = data.get('home_snack_feedback')
        kids_lunch_feedback = data.get('kids_lunch_feedback')
        adult_lunch_feedback = data.get('adult_lunch_feedback')
        # Made status for each meal type
        school_snack_made = data.get('school_snack_made')
        home_snack_made = data.get('home_snack_made')
        kids_lunch_made = data.get('kids_lunch_made')
        adult_lunch_made = data.get('adult_lunch_made')
        # Prep completion tracking
        prep_completed = data.get('prep_completed', [])  # Array of completed task strings

        # Needs Fix flags
        school_snack_needs_fix = data.get('school_snack_needs_fix')
        home_snack_needs_fix = data.get('home_snack_needs_fix')
        kids_lunch_needs_fix = data.get('kids_lunch_needs_fix')
        adult_lunch_needs_fix = data.get('adult_lunch_needs_fix')
        dinner_needs_fix = data.get('dinner_needs_fix')

        # Allow logging feedback without a "made" status for snacks/lunch
        if not week_str or not day:
            return jsonify({"status": "error", "message": "Week and day are required"}), 400

        # If we're only logging snack/lunch feedback, skip dinner validation
        is_feedback_only = (school_snack_feedback or home_snack_feedback or kids_lunch_feedback or adult_lunch_feedback or
                            school_snack_needs_fix is not None or home_snack_needs_fix is not None or
                            kids_lunch_needs_fix is not None or adult_lunch_needs_fix is not None) and not made

        if not is_feedback_only and not made:
            return jsonify({"status": "error", "message": "Made status is required for dinner logging"}), 400
            
        # We'll call the log_execution.py logic but as a library function
        # to avoid shell overhead, but for now we'll import and call its main-like logic
        # Refactoring log_execution to be more library-friendly would be better, 
        # but let's see if we can just import the core functions.
        
        from scripts.log_execution import find_week, calculate_adherence, update_inventory_file, save_history
        from scripts.workflow import generate_granular_prep_tasks
        from datetime import datetime
        
        # Check if week is in inputs/ (active) or history.yml (archived)
        input_file = get_actual_path(f'inputs/{week_str}.yml')
        is_active_week = input_file.exists()
        
        if is_active_week:
            # Active week - update input file
            with open(input_file, 'r') as f:
                week_data = yaml.safe_load(f)
            week = week_data  # The input file IS the week data
            is_input_file = True
        else:
            # Archived week - update history.yml
            history = get_yaml_data('data/history.yml')
            if not history:
                return jsonify({"status": "error", "message": "History file not found"}), 404
            week = find_week(history, week_str)
            if not week:
                return jsonify({"status": "error", "message": f"Week {week_str} not found"}), 404
            is_input_file = False
            
        # Find dinner if we have dinner-related data
        target_day = day.lower()[:3]
        target_dinner = None

        if not is_feedback_only or dinner_needs_fix is not None or actual_meal:
            for dinner in week.get('dinners', []):
                if dinner.get('day') == target_day:
                    target_dinner = dinner
                    break

            if not target_dinner:
                # Create a placeholder dinner if it doesn't exist (e.g. for weekends or unplanned meals)
                target_dinner = {
                    'day': target_day,
                    'recipe_id': 'unplanned_meal',
                    'cuisine': 'various',
                    'vegetables': []
                }
                if 'dinners' not in week: week['dinners'] = []
                week['dinners'].append(target_dinner)
                print(f"Created placeholder dinner for {target_day}")

            # Update execution data
            if str(made).lower() in ('yes', 'true', '1', 'y'):
                target_dinner['made'] = True
            elif str(made).lower() in ('no', 'false', '0', 'n'):
                target_dinner['made'] = False
            elif str(made).lower() in ('freezer', 'backup'):
                target_dinner['made'] = 'freezer_backup'
            elif str(made).lower() == 'outside_meal':
                target_dinner['made'] = 'outside_meal'
            else:
                target_dinner['made'] = made
            
        if not is_feedback_only:
            if vegetables:
                veggies_list = [v.strip() for v in vegetables.split(',')]
                target_dinner['vegetables_used'] = veggies_list

                # Remove from fridge inventory in the week object
                if 'fridge_vegetables' in week:
                    def normalize_veg(n):
                        n = n.lower().strip()
                        if n.endswith('s') and not n.endswith('ss'): return n[:-1]
                        return n
                    used_norm = [normalize_veg(v) for v in veggies_list]
                    week['fridge_vegetables'] = [v for v in week['fridge_vegetables'] if normalize_veg(v) not in used_norm]

            if kids_feedback: target_dinner['kids_feedback'] = kids_feedback
            if kids_complaints:
                target_dinner['kids_complaints'] = kids_complaints
                if 'kids_dislikes' not in week: week['kids_dislikes'] = []
                week['kids_dislikes'].append({
                    'complaint': kids_complaints,
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'recipe': target_dinner.get('recipe_id')
                })

            if reason: target_dinner['reason'] = reason

        # Handle dinner corrections outside is_feedback_only block
        if target_dinner:
            if actual_meal:
                target_dinner['actual_meal'] = actual_meal
            if dinner_needs_fix is not None:
                target_dinner['needs_fix'] = dinner_needs_fix

        # Store snack/lunch feedback at the day level
        if (school_snack_feedback is not None or home_snack_feedback is not None or
            kids_lunch_feedback is not None or adult_lunch_feedback is not None or
            school_snack_made is not None or home_snack_made is not None or
            kids_lunch_made is not None or adult_lunch_made is not None or
            school_snack_needs_fix is not None or home_snack_needs_fix is not None or
            kids_lunch_needs_fix is not None or adult_lunch_needs_fix is not None or
            (prep_completed is not None and len(prep_completed) > 0)):
            if 'daily_feedback' not in week:
                week['daily_feedback'] = {}
            if target_day not in week['daily_feedback']:
                week['daily_feedback'][target_day] = {}

            if school_snack_feedback is not None:
                week['daily_feedback'][target_day]['school_snack'] = school_snack_feedback
            if school_snack_made is not None:
                week['daily_feedback'][target_day]['school_snack_made'] = school_snack_made

            if home_snack_feedback is not None:
                week['daily_feedback'][target_day]['home_snack'] = home_snack_feedback
            if home_snack_made is not None:
                week['daily_feedback'][target_day]['home_snack_made'] = home_snack_made

            if kids_lunch_feedback is not None:
                week['daily_feedback'][target_day]['kids_lunch'] = kids_lunch_feedback
            if kids_lunch_made is not None:
                week['daily_feedback'][target_day]['kids_lunch_made'] = kids_lunch_made

            if adult_lunch_feedback is not None:
                week['daily_feedback'][target_day]['adult_lunch'] = adult_lunch_feedback
            if adult_lunch_made is not None:
                week['daily_feedback'][target_day]['adult_lunch_made'] = adult_lunch_made

            if school_snack_needs_fix is not None:
                week['daily_feedback'][target_day]['school_snack_needs_fix'] = school_snack_needs_fix
            if home_snack_needs_fix is not None:
                week['daily_feedback'][target_day]['home_snack_needs_fix'] = home_snack_needs_fix
            if kids_lunch_needs_fix is not None:
                week['daily_feedback'][target_day]['kids_lunch_needs_fix'] = kids_lunch_needs_fix
            if adult_lunch_needs_fix is not None:
                week['daily_feedback'][target_day]['adult_lunch_needs_fix'] = adult_lunch_needs_fix

            # Store prep completion data
            if prep_completed and len(prep_completed) > 0:
                if 'prep_completed' not in week['daily_feedback'][target_day]:
                    week['daily_feedback'][target_day]['prep_completed'] = []
                # Append new completed tasks (avoid duplicates)
                existing_tasks = set(week['daily_feedback'][target_day]['prep_completed'])
                for task in prep_completed:
                    if task not in existing_tasks:
                        week['daily_feedback'][target_day]['prep_completed'].append(task)
                        existing_tasks.add(task)
        if not is_feedback_only:
            if made_2x:
                target_dinner['made_2x_for_freezer'] = True
                if 'freezer_inventory' not in week: week['freezer_inventory'] = []
                meal_name = target_dinner.get('recipe_id', 'Unknown Meal').replace('_', ' ').title()
                week['freezer_inventory'].append({
                    'meal': meal_name,
                    'frozen_date': datetime.now().strftime('%Y-%m-%d')
                })

            if freezer_meal and target_dinner['made'] == 'freezer_backup':
                target_dinner['freezer_used'] = {'meal': freezer_meal, 'frozen_date': 'Unknown'}

                # Remove the used freezer meal from inventory
                if 'freezer_inventory' in week:
                    week['freezer_inventory'] = [
                        item for item in week['freezer_inventory']
                        if item.get('meal') != freezer_meal
                    ]

            # Update the master inventory file too
            # We need a dummy args object for update_inventory_file
            class Args:
                def __init__(self, made, freezer_meal, made_2x, actual_meal):
                    self.made = made
                    self.freezer_meal = freezer_meal
                    self.made_2x = made_2x
                    self.actual_meal = actual_meal

            update_inventory_file(Args(made, freezer_meal, made_2x, actual_meal),
                                  [v.strip() for v in vegetables.split(',')] if vegetables else None)

            calculate_adherence(week)
        
        # Save to appropriate file
        if is_active_week:
            # Active week - regenerate prep tasks and save to input file
            try:
                # Load recipes for prep task generation
                recipes = get_cached_data('recipes', 'recipes/index.yml') or []
                
                # Build selected_dinners dict for prep task generator
                selected_dinners = {}
                for dinner in week.get('dinners', []):
                    day = dinner.get('day')
                    if day:
                        # Find recipe details
                        recipe_match = next((r for r in recipes if r['id'] == dinner.get('recipe_id')), None)
                        if recipe_match:
                            selected_dinners[day] = {
                                'id': dinner.get('recipe_id'),
                                'name': recipe_match.get('name', dinner.get('recipe_id')),
                                'main_veg': recipe_match.get('main_veg', [])
                            }
                
                # Regenerate prep tasks
                completed_prep = []
                if 'daily_feedback' in week:
                    for day_feedback in week['daily_feedback'].values():
                        if 'prep_completed' in day_feedback:
                            completed_prep.extend(day_feedback['prep_completed'])
                
                tasks_mon_tue = generate_granular_prep_tasks(selected_dinners, {}, ['mon', 'tue'], "Mon/Tue", completed_prep)
                tasks_wed_fri = generate_granular_prep_tasks(selected_dinners, {}, ['wed', 'thu', 'fri'], "Wed-Fri", completed_prep)
                
                new_prep_tasks = []
                if tasks_mon_tue:
                    new_prep_tasks.append("Monday Prep (for Mon/Tue meals):")
                    new_prep_tasks.extend([f"- [ ] {t}" for t in tasks_mon_tue])
                if tasks_wed_fri:
                    new_prep_tasks.append("Wednesday Prep (for Wed-Fri meals):")
                    new_prep_tasks.extend([f"- [ ] {t}" for t in tasks_wed_fri])
                
                week['prep_tasks'] = new_prep_tasks
            except Exception as e:
                print(f"Warning: Failed to regenerate prep tasks: {e}")
            
            # Save input file
            with open(input_file, 'w') as f:
                yaml.dump(week, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            
            # Sync input file to GitHub
            from scripts.github_helper import sync_changes_to_github
            sync_changes_to_github([f'inputs/{week_str}.yml', 'data/inventory.yml'])
        else:
            # Archived week - save to history.yml
            save_history(history)
            
            # Sync history to GitHub
            from scripts.github_helper import sync_changes_to_github
            sync_changes_to_github(['data/history.yml', 'data/inventory.yml'])
        
        # Invalidate Cache
        invalidate_cache('history')
        invalidate_cache('inventory')
        
        # Get fresh status BEFORE syncing to GitHub (so we read local tmp changes)
        # passing skip_sync=True to avoid overwriting local changes with stale GitHub data
        updated_status = _get_current_status(skip_sync=True)
        
        # Sync to GitHub
        from scripts.github_helper import sync_changes_to_github
        sync_changes_to_github(['data/history.yml', 'data/inventory.yml'])
        
        # Invalidate Cache
        invalidate_cache('history')
        invalidate_cache('inventory')
        
        # Return the updated status data directly
        return updated_status
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/create-week", methods=["POST"])
def create_week():
    try:
        data = request.json or {}
        week_str = data.get('week_of')
        if not week_str:
            _, week_str = find_current_week_file()
        
        # FIRST: Archive any existing input files
        from scripts.workflow import archive_all_input_files
        archive_all_input_files()
        
        # Generate farmers market proposal
        from scripts.workflow import generate_farmers_market_proposal
        from datetime import timedelta
        
        history_path = Path('data/history.yml')
        index_path = Path('recipes/index.yml')
        
        proposed_veg, staples = generate_farmers_market_proposal(history_path, index_path)
        
        # Load configuration
        config_path = Path('config.yml')
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
        else:
            # Fallback defaults
            config = {
                'timezone': 'America/Los_Angeles',
                'schedule': {
                    'office_days': ['mon', 'wed', 'fri'],
                    'busy_days': ['thu', 'fri'],
                    'late_class_days': [],
                },
                'preferences': {
                    'vegetarian': True,
                    'avoid_ingredients': ['eggplant', 'mushrooms', 'green_cabbage'],
                    'novelty_recipe_limit': 1,
                }
            }
        
        input_data = {
            'week_of': week_str,
            'timezone': config.get('timezone', 'America/Los_Angeles'),
            'workflow': {
                'status': 'intake_complete',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
            },
            'schedule': config.get('schedule', {}),
            'preferences': config.get('preferences', {}),
            'farmers_market': {
                'status': 'proposed',
                'proposed_veg': proposed_veg + staples,
                'confirmed_veg': [],
            }
        }
        
        # Check for rollover from previous week
        rollover_recipes = []
        prev_monday = datetime.strptime(week_str, '%Y-%m-%d') - timedelta(days=7)
        prev_monday_str = prev_monday.strftime('%Y-%m-%d')
        history = get_yaml_data('data/history.yml')
        if history:
            for week in history.get('weeks', []):
                if week.get('week_of') == prev_monday_str:
                    rollover_recipes = week.get('rollover', [])
                    break
        
        if rollover_recipes:
            input_data['rollover'] = rollover_recipes
        
        # Generate YAML content in memory
        yaml_content = yaml.dump(input_data, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        # Try to write locally if possible (for local development)
        output_file = f"inputs/{week_str}.yml"
        try:
            inputs_dir = Path('inputs')
            inputs_dir.mkdir(exist_ok=True)
            with open(output_file, 'w') as f:
                f.write(yaml_content)
        except OSError:
            # Read-only filesystem (Vercel), skip local write
            pass
        
        # Sync to GitHub
        from scripts.github_helper import commit_file_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        success = commit_file_to_github(repo_name, output_file, f"Create new week {week_str}", content=yaml_content)
        
        if not success:
            return jsonify({"status": "error", "message": "Failed to sync to GitHub"}), 500
        
        return jsonify({
            "status": "success", 
            "message": f"Created week {week_str}",
            "week_of": week_str,
            "proposed_veg": proposed_veg + staples,
            "rollover_count": len(rollover_recipes)
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/confirm-veg", methods=["POST"])
def confirm_veg():
    try:
        data = request.json or {}
        confirmed_veg = data.get('confirmed_veg')
        if not confirmed_veg:
            return jsonify({"status": "error", "message": "No vegetables provided"}), 400
            
        input_file, week_str = find_current_week_file()
        if not input_file:
            return jsonify({"status": "error", "message": "No active week found"}), 404
            
        if not input_file.exists():
             return jsonify({"status": "error", "message": f"Input file {input_file} not found"}), 404

        # 1. Update Input File
        week_data = get_yaml_data(str(input_file))
        if not week_data:
             return jsonify({"status": "error", "message": f"Could not load input file {input_file}"}), 404
            
        if 'farmers_market' not in week_data:
            week_data['farmers_market'] = {}
            
        week_data['farmers_market']['confirmed_veg'] = confirmed_veg
        week_data['farmers_market']['status'] = 'confirmed'
        
        # 2. Update History File
        from scripts.log_execution import find_week, save_history
        history = get_yaml_data('data/history.yml') or {'weeks': []}
        history_week = find_week(history, week_str)
        if not history_week:
            # Create week in history if it doesn't exist (unlikely but safe)
            history_week = {'week_of': week_str, 'dinners': []}
            history['weeks'].append(history_week)
        
        history_week['fridge_vegetables'] = confirmed_veg

        # 3. Update Inventory File
        inventory = get_yaml_data('data/inventory.yml') or {}
        
        if 'fridge' not in inventory: inventory['fridge'] = []
        
        # Add new items to inventory, avoiding duplicates
        existing_items = {i.get('item', '').lower() for i in inventory['fridge']}
        for veg in confirmed_veg:
            if veg.lower() not in existing_items:
                inventory['fridge'].append({
                    'item': veg,
                    'quantity': 1,
                    'unit': 'count',
                    'added': datetime.now().strftime('%Y-%m-%d')
                })
        
        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')

        # Prepare for sync
        file_dict = {
            str(input_file): yaml.dump(week_data, default_flow_style=False, sort_keys=False, allow_unicode=True),
            'data/history.yml': yaml.dump(history, default_flow_style=False, sort_keys=False, allow_unicode=True),
            'data/inventory.yml': yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        }

        # Try to write locally if possible
        for path, content in file_dict.items():
            try:
                with open(path, 'w') as f:
                    f.write(content)
            except OSError:
                pass

        # Sync to GitHub
        from scripts.github_helper import commit_multiple_files_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        success = commit_multiple_files_to_github(repo_name, file_dict, f"Confirm veggies and update inventory for {week_str}")
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync to GitHub"}), 500
        
        # Return full updated status
        # This prevents the frontend from showing stale data while Vercel re-deploys or cache clears
        return _get_current_status(skip_sync=True)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/inventory/add", methods=["POST"])
def add_inventory():
    try:
        data = request.json or {}
        category = data.get('category') # 'meals', 'pantry', 'fridge'
        item = data.get('item')
        
        if not category or not item:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
            
        if category == 'meals':
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'backups' not in inventory['freezer']: inventory['freezer']['backups'] = []
            inventory['freezer']['backups'].append({
                'meal': item,
                'servings': 4,
                'frozen_date': datetime.now().strftime('%Y-%m-%d')
            })
        elif category == 'frozen_ingredient':
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'ingredients' not in inventory['freezer']: inventory['freezer']['ingredients'] = []
            inventory['freezer']['ingredients'].append({
                'item': item,
                'quantity': 1,
                'unit': 'count',
                'frozen_date': datetime.now().strftime('%Y-%m-%d')
            })
        elif category == 'pantry':
            if 'pantry' not in inventory: inventory['pantry'] = []
            inventory['pantry'].append({
                'item': item,
                'quantity': 1,
                'unit': 'count'
            })
        elif category == 'fridge':
            if 'fridge' not in inventory: inventory['fridge'] = []
            inventory['fridge'].append({
                'item': item,
                'quantity': 1,
                'unit': 'count',
                'added': datetime.now().strftime('%Y-%m-%d')
            })
            
        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
            with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            print("Read-only filesystem, skipping local write for inventory")
            
        # Sync to GitHub
        from scripts.github_helper import commit_file_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        success = commit_file_to_github(repo_name, str(inventory_path), "Update inventory via Web UI", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
        
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/inventory/bulk-add", methods=["POST"])
def bulk_add_inventory():
    try:
        data = request.json or {}
        items = data.get('items', [])
        
        if not items:
            return jsonify({"status": "error", "message": "No items provided"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
            
        for entry in items:
            category = entry.get('category')
            item = entry.get('item')
            quantity = entry.get('quantity', 1)
            unit = entry.get('unit', 'count')
            
            if category == 'meals':
                if 'freezer' not in inventory: inventory['freezer'] = {}
                if 'backups' not in inventory['freezer']: inventory['freezer']['backups'] = []
                inventory['freezer']['backups'].append({
                    'meal': item,
                    'servings': quantity if isinstance(quantity, int) else 4,
                    'frozen_date': datetime.now().strftime('%Y-%m-%d')
                })
            elif category == 'pantry':
                if 'pantry' not in inventory: inventory['pantry'] = []
                inventory['pantry'].append({
                    'item': item,
                    'quantity': quantity,
                    'unit': unit
                })
            elif category == 'fridge':
                if 'fridge' not in inventory: inventory['fridge'] = []
                inventory['fridge'].append({
                    'item': item,
                    'quantity': quantity,
                    'unit': unit,
                    'added': datetime.now().strftime('%Y-%m-%d')
                })
            
        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
           with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            print("Read-only filesystem, skipping local write for inventory")
            
        # Sync to GitHub
        from scripts.github_helper import commit_file_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        success = commit_file_to_github(repo_name, str(inventory_path), "Bulk update inventory via Web UI", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
        
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/inventory/delete", methods=["POST"])
def delete_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item_name = data.get('item')
        
        if not category or not item_name:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
        
        removed = False
        if category == 'meals':
            if 'freezer' in inventory and 'backups' in inventory['freezer']:
                initial_len = len(inventory['freezer']['backups'])
                inventory['freezer']['backups'] = [i for i in inventory['freezer']['backups'] if i.get('meal') != item_name]
                removed = len(inventory['freezer']['backups']) < initial_len
        elif category == 'frozen_ingredient':
            if 'freezer' in inventory and 'ingredients' in inventory['freezer']:
                initial_len = len(inventory['freezer']['ingredients'])
                inventory['freezer']['ingredients'] = [i for i in inventory['freezer']['ingredients'] if i.get('item') != item_name]
                removed = len(inventory['freezer']['ingredients']) < initial_len
        elif category == 'pantry':
            if 'pantry' in inventory:
                initial_len = len(inventory['pantry'])
                inventory['pantry'] = [i for i in inventory['pantry'] if i.get('item') != item_name]
                removed = len(inventory['pantry']) < initial_len
        elif category == 'fridge':
            if 'fridge' in inventory:
                initial_len = len(inventory['fridge'])
                inventory['fridge'] = [i for i in inventory['fridge'] if i.get('item') != item_name]
                removed = len(inventory['fridge']) < initial_len
        
        if not removed:
             return jsonify({"status": "error", "message": f"Item '{item_name}' not found in category '{category}'"}), 404

        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
            with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            pass
            
        # Sync to GitHub
        from scripts.github_helper import commit_file_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        success = commit_file_to_github(repo_name, str(inventory_path), f"Delete {item_name} from {category} inventory", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
             
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/inventory/update", methods=["POST"])
def update_inventory():
    try:
        data = request.json or {}
        category = data.get('category')
        item_name = data.get('item')
        updates = data.get('updates', {}) # e.g. {'quantity': 2, 'unit': 'lb'}
        
        if not category or not item_name:
            return jsonify({"status": "error", "message": "Category and item required"}), 400
            
        inventory = get_yaml_data('data/inventory.yml') or {}
        inventory_path = Path('data/inventory.yml')
        
        updated = False
        if category == 'meals':
            if 'freezer' in inventory and 'backups' in inventory['freezer']:
                for itm in inventory['freezer']['backups']:
                    if itm.get('meal') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        elif category == 'frozen_ingredient':
            if 'freezer' in inventory and 'ingredients' in inventory['freezer']:
                for itm in inventory['freezer']['ingredients']:
                    if itm.get('item') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        elif category == 'pantry':
            if 'pantry' in inventory:
                for itm in inventory['pantry']:
                    if itm.get('item') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        elif category == 'fridge':
            if 'fridge' in inventory:
                for itm in inventory['fridge']:
                    if itm.get('item') == item_name:
                        itm.update(updates)
                        updated = True
                        break
        
        if not updated:
             return jsonify({"status": "error", "message": f"Item '{item_name}' not found in category '{category}'"}), 404

        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')
        new_content = yaml.dump(inventory, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        try:
            with open(inventory_path, 'w') as f:
                f.write(new_content)
        except OSError:
            pass
            
        # Sync to GitHub
        from scripts.github_helper import commit_file_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        success = commit_file_to_github(repo_name, str(inventory_path), f"Update {item_name} in {category} inventory", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync inventory to GitHub"}), 500
             
        invalidate_cache('inventory')
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/replan", methods=["POST"])
def replan():
    """
    Trigger inventory-aware replanning for the current week.
    Calls scripts/workflow.py replan_meal_plan function directly.
    """
    try:
        # Import directly to share same environment (and /tmp paths on Vercel)
        from scripts.workflow import replan_meal_plan
        
        # We need to capture stdout to return it to the user
        import io
        import contextlib
        
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            # replan_meal_plan(None, None) automatically finds the current week and performs replan
            replan_meal_plan(None, None)
            
        output = f.getvalue()
        
        # On Vercel, we need to ensure the updated files are synced to GitHub
        # logs/workflow.py now uses get_actual_path which writes to /tmp.
        # We should trigger a sync of /tmp/data/history.yml, /tmp/inputs/*.yml, /tmp/public/plans/*.html
        
        is_vercel = os.environ.get('VERCEL') == '1'
        if is_vercel:
            from scripts.github_helper import sync_changes_to_github
            # Sync updated files
            # Note: sync_changes_to_github implementation dictates what paths it looks at. 
            # It usually expects relative paths and handles /tmp internally if configured, 
            # OR we pass the /tmp paths?
            # Let's check github_helper. It likely expects relative paths and prepends /tmp if on Vercel.
            # Based on previous index.py usage: sync_changes_to_github(['data/history.yml', ...])
            
            sync_changes_to_github([
                'data/history.yml',
                'inputs/*.yml',
                'public/plans/*.html'
            ])
            
            # Also invalidate cache
            if 'history' in CACHE: del CACHE['history']
            if 'inventory' in CACHE: del CACHE['inventory']
            if 'recipes' in CACHE: del CACHE['recipes']

        return jsonify({
            "status": "success",
            "message": "Week replanned with inventory optimization!",
            "output": output
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route("/api/hello")
def hello_world():
    return jsonify({"message": "Hello from Python on Vercel!"})

@app.route("/api/recipes/import", methods=["POST"])
def import_recipe():
    try:
        data = request.json or {}
        url = data.get('url')
        if not url:
            return jsonify({"status": "error", "message": "URL is required"}), 400
            
        import sys
        import subprocess
        from pathlib import Path
        
        # Call the standalone script
        # Note: In production (Vercel), we might need to handle this differently
        # since we can't write to recipes/raw_html/ easily.
        # But for local or GitHub-synced setups, this works.
        
        script_path = Path(__file__).parent.parent / 'scripts' / 'import_recipe.py'
        result = subprocess.run([sys.executable, str(script_path), url], capture_output=True, text=True)
        
        if result.returncode == 0:
            # Sync the new files to GitHub
            from scripts.github_helper import sync_changes_to_github
            # Get latest recipe ID from the output or just sync index.yml
            sync_changes_to_github(['recipes/index.yml', 'recipes/parsed/recipes.json'])
            
            return jsonify({
                "status": "success", 
                "message": "Recipe imported and index updated!",
                "output": result.stdout
            })
        else:
            return jsonify({
                "status": "error", 
                "message": "Failed to import recipe",
                "details": result.stderr or result.stdout
            }), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# For local development
@app.route("/api/suggestions")
def get_meal_suggestions():
    try:
        from scripts.inventory_intelligence import get_substitutions
        suggestions = get_substitutions(limit=5)
        return jsonify({
            "status": "success",
            "suggestions": suggestions
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5332))
    app.run(host='0.0.0.0', port=port)
