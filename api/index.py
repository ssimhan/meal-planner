from flask import Flask, jsonify, request
import sys
import os
from pathlib import Path
from datetime import datetime
from flask_cors import CORS

# Add the parent directory to sys.path so we can import from scripts/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from scripts.workflow import find_current_week_file, get_workflow_state
except ImportError as e:
    # Fallback for local development
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../scripts")))
    from workflow import find_current_week_file, get_workflow_state

from api.generate_plan import generate_plan_api

import yaml

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route("/api/status")
def get_status():
    try:
        from scripts.workflow import archive_expired_weeks, get_workflow_state, find_current_week_file
        try:
            archive_expired_weeks()
        except Exception as e:
            print(f"Warning: Failed to archive expired weeks (likely read-only filesystem): {e}")
        
        from datetime import datetime, timedelta
        import pytz

        # Use Pacific timezone for all date/time operations
        pacific_tz = pytz.timezone('America/Los_Angeles')
        today = datetime.now(pacific_tz)

        # Try to find the most relevant week for the dashboard
        # Priority: This week if it exists, otherwise next week
        monday = today - timedelta(days=today.weekday())
        week_str = monday.strftime('%Y-%m-%d')

        input_file = Path(f'inputs/{week_str}.yml')
        if not input_file.exists():
            # Fallback to next Monday if today is late in the week
            if today.weekday() >= 4: # Friday or later
                next_monday = monday + timedelta(days=7)
                week_str = next_monday.strftime('%Y-%m-%d')
                input_file = Path(f'inputs/{week_str}.yml')
            else:
                input_file, week_str = find_current_week_file()

        state, data = get_workflow_state(input_file)

        # Determine current day context for the dashboard (using Pacific time)
        current_day = today.strftime('%a').lower()[:3]

        today_dinner = None
        today_lunch = None
        today_snacks = {
            "school": "Fruit or Cheese sticks",
            "home": "Cucumber or Crackers"
        }
        prep_tasks = []
        week_data = None
        
        # Default snacks from workflow.py
        DEFAULT_SNACKS = {
            'mon': 'Apple slices with peanut butter',
            'tue': 'Cheese and crackers',
            'wed': 'Cucumber rounds with cream cheese',
            'thu': 'Grapes',
            'fri': 'Crackers with hummus'
        }
        today_snacks["school"] = DEFAULT_SNACKS.get(current_day, "Fruit")

        if state in ['active', 'waiting_for_checkin']:
            from scripts.log_execution import load_history, find_week
            history = load_history()
            history_week = find_week(history, week_str)

            # Load feedback data from daily_feedback
            if history_week and 'daily_feedback' in history_week:
                day_feedback = history_week['daily_feedback'].get(current_day, {})
                if 'school_snack' in day_feedback:
                    today_snacks['school_snack_feedback'] = day_feedback['school_snack']
                if 'school_snack_made' in day_feedback:
                    today_snacks['school_snack_made'] = day_feedback['school_snack_made']
                if 'home_snack' in day_feedback:
                    today_snacks['home_snack_feedback'] = day_feedback['home_snack']
                if 'home_snack_made' in day_feedback:
                    today_snacks['home_snack_made'] = day_feedback['home_snack_made']
            
            # 1. Identify Dinners (History takes priority, then Input file)
            dinners = []
            if history_week and 'dinners' in history_week:
                dinners = history_week['dinners']
            elif data and 'dinners' in data: # Some systems store it in input
                dinners = data['dinners']
            elif data and 'schedule' in data: # Older systems
                # This depends on how data is structured in the input yml
                pass
            
            for dinner in dinners:
                if dinner.get('day') == current_day:
                    today_dinner = dinner
                    break
            
            # 2. Identify Lunches
            history_lunches = history_week.get('lunches', {}) if history_week else {}
            if current_day in history_lunches:
                today_lunch = history_lunches[current_day]
            elif data and 'selected_lunches' in data: # Check if saved in input
                today_lunch = data['selected_lunches'].get(current_day)

            # 3. If still no lunch, it might be that workflow.py hasn't saved it to history yet
            # but it was passed to generate_html_plan. We should really save it to history.

            if not today_lunch:
                 today_lunch = {"recipe_name": "Leftovers or Simple Lunch", "prep_style": "quick_fresh"}

            # Add lunch feedback from daily_feedback
            if history_week and 'daily_feedback' in history_week:
                day_feedback = history_week['daily_feedback'].get(current_day, {})
                if 'kids_lunch' in day_feedback:
                    today_lunch['kids_lunch_feedback'] = day_feedback['kids_lunch']
                if 'kids_lunch_made' in day_feedback:
                    today_lunch['kids_lunch_made'] = day_feedback['kids_lunch_made']
                if 'adult_lunch' in day_feedback:
                    today_lunch['adult_lunch_feedback'] = day_feedback['adult_lunch']
                if 'adult_lunch_made' in day_feedback:
                    today_lunch['adult_lunch_made'] = day_feedback['adult_lunch_made']

            # Prep Tasks Logic - Generate granular tasks using workflow logic
            from scripts.workflow import generate_granular_prep_tasks, fuzzy_match_prep_task

            # Extract completed prep tasks from history
            completed_prep = []
            if history_week and 'daily_feedback' in history_week:
                for day, feedback in history_week['daily_feedback'].items():
                    if 'prep_completed' in feedback:
                        completed_prep.extend(feedback['prep_completed'])

            # Build selected_dinners dict for granular task generation
            selected_dinners = {}
            for dinner in dinners:
                day = dinner.get('day')
                if day:
                    # Load recipe details to get main_veg
                    recipe_id = dinner.get('recipe_id')
                    if recipe_id:
                        try:
                            index_path = Path('recipes/index.yml')
                            if index_path.exists():
                                with open(index_path, 'r') as f:
                                    recipes = yaml.safe_load(f)
                                    for recipe in recipes:
                                        if recipe.get('id') == recipe_id:
                                            selected_dinners[day] = recipe
                                            break
                        except Exception as e:
                            print(f"Warning: Could not load recipe {recipe_id}: {e}")

            # Build selected_lunches dict
            selected_lunches = {}
            # For now, we'll use empty prep_components as lunch data isn't fully structured
            # This will be enhanced when LunchSelector is integrated

            # Generate prep tasks based on day
            if current_day == 'mon':
                prep_tasks = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['mon', 'tue'], "Mon/Tue", completed_prep)
                prep_tasks.extend(['Portion snacks into grab-and-go containers for early week', 'Identify freezer-friendly dinner to double (batch cook)'])
            elif current_day == 'tue':
                am_tasks = ["Assemble Tuesday lunch", "Portion Monday's batch-cooked items", "Check freezer backup inventory (verify 3 meals)"]
                am_tasks = [task for task in am_tasks if not fuzzy_match_prep_task(task, completed_prep)]
                pm_tasks = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['wed', 'thu', 'fri'], "Wed-Fri", completed_prep)
                pm_tasks.append('Portion snacks for rest of week')
                prep_tasks = [{"task": t, "time": "am"} for t in am_tasks] + [{"task": t, "time": "pm"} for t in pm_tasks]
            elif current_day == 'wed':
                prep_tasks = ['Finish any remaining veg/lunch prep for Thu/Fri', 'Load Instant Pot or slow cooker for Thursday if needed', 'Final check: All Thu/Fri components ready']
                prep_tasks = [task for task in prep_tasks if not fuzzy_match_prep_task(task, completed_prep)]
            elif current_day == 'thu':
                prep_tasks = ['Light prep allowed (8-9am) if needed', 'NO chopping after noon', 'NO evening prep - only reheating/assembly', 'Fallback: Use freezer backup if energy is depleted']
                prep_tasks = [task for task in prep_tasks if not fuzzy_match_prep_task(task, completed_prep)]
            elif current_day == 'fri':
                prep_tasks = ['ALL DAY: NO chopping allowed', 'ALL DAY: NO cooking allowed - only reheating', 'Only actions: reheating, simple assembly', 'Fallback: Use freezer backup if energy is depleted']

        # Extract completed prep for current day for frontend checkbox initialization
        completed_prep_today = []
        if state in ['active', 'waiting_for_checkin'] and history_week and 'daily_feedback' in history_week:
            day_feedback = history_week['daily_feedback'].get(current_day, {})
            if 'prep_completed' in day_feedback:
                completed_prep_today = day_feedback['prep_completed']

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
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/api/recipes")
def get_recipes():
    try:
        index_path = Path('recipes/index.yml')
        if not index_path.exists():
            return jsonify({"status": "error", "message": "Recipe index not found"}), 404
        
        with open(index_path, 'r') as f:
            recipes = yaml.safe_load(f)
        
        return jsonify({"status": "success", "recipes": recipes})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/inventory")
def get_inventory():
    try:
        inventory_path = Path('data/inventory.yml')
        if not inventory_path.exists():
            return jsonify({"status": "error", "message": "Inventory file not found"}), 404
        
        with open(inventory_path, 'r') as f:
            inventory = yaml.safe_load(f)
        
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/history")
def get_history():
    try:
        history_path = Path('data/history.yml')
        if not history_path.exists():
            return jsonify({"status": "error", "message": "History file not found"}), 404
        
        with open(history_path, 'r') as f:
            history = yaml.safe_load(f)
        
        return jsonify({
            "status": "success", 
            "history": history,
            "count": len(history) if history else 0
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Register plan generation route
generate_plan_api(app)

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

        # Allow logging feedback without a "made" status for snacks/lunch
        if not week_str or not day:
            return jsonify({"status": "error", "message": "Week and day are required"}), 400

        # If we're only logging snack/lunch feedback, skip dinner validation
        is_feedback_only = (school_snack_feedback or home_snack_feedback or kids_lunch_feedback or adult_lunch_feedback) and not made

        if not is_feedback_only and not made:
            return jsonify({"status": "error", "message": "Made status is required for dinner logging"}), 400
            
        # We'll call the log_execution.py logic but as a library function
        # to avoid shell overhead, but for now we'll import and call its main-like logic
        # Refactoring log_execution to be more library-friendly would be better, 
        # but let's see if we can just import the core functions.
        
        from scripts.log_execution import load_history, find_week, calculate_adherence, update_inventory_file, save_history
        from datetime import datetime
        
        history = load_history()
        week = find_week(history, week_str)
        
        if not week:
            return jsonify({"status": "error", "message": f"Week {week_str} not found"}), 404
            
        # Find dinner (only required if not feedback-only)
        target_day = day.lower()[:3]
        target_dinner = None

        if not is_feedback_only:
            for dinner in week.get('dinners', []):
                if dinner.get('day') == target_day:
                    target_dinner = dinner
                    break

            if not target_dinner:
                return jsonify({"status": "error", "message": f"No dinner found for {target_day}"}), 404

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

            if actual_meal: target_dinner['actual_meal'] = actual_meal
            if reason: target_dinner['reason'] = reason

        # Store snack/lunch feedback at the day level
        if (school_snack_feedback is not None or home_snack_feedback is not None or
            kids_lunch_feedback is not None or adult_lunch_feedback is not None or
            school_snack_made is not None or home_snack_made is not None or
            kids_lunch_made is not None or adult_lunch_made is not None):
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
        save_history(history)
        
        # Sync to GitHub
        from scripts.github_helper import sync_changes_to_github
        sync_changes_to_github(['data/history.yml', 'data/inventory.yml'])
        
        return jsonify({"status": "success", "message": "Meal logged successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/create-week", methods=["POST"])
def create_week():
    try:
        data = request.json or {}
        week_str = data.get('week_of')
        if not week_str:
            _, week_str = find_current_week_file()
        
        from scripts.workflow import create_new_week
        # This will still fail on Vercel if it tries to write locally without catching errors
        # Ideally create_new_week should be refactored too, but let's see if we can patch it
        # closer to the source or if we just need to handle the output.
        # For now, let's assume create_new_week might fail to write but we can
        # still sync if we generate the content in memory. 
        # Actually create_new_week is too complex to inline here efficiently.
        # Let's trust that we can run it and just catch the write error if needed?
        # A better approach for create_week is needed later, but focusing on confirm_veg first.
        
        create_new_week(week_str)
        
        # Sync to GitHub
        from scripts.github_helper import sync_changes_to_github
        sync_changes_to_github([f"inputs/{week_str}.yml"])
        
        return jsonify({"status": "success", "message": f"Created week {week_str}"})
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
        with open(input_file, 'r') as f:
            week_data = yaml.safe_load(f)
            
        if 'farmers_market' not in week_data:
            week_data['farmers_market'] = {}
            
        week_data['farmers_market']['confirmed_veg'] = confirmed_veg
        week_data['farmers_market']['status'] = 'confirmed'
        
        # 2. Update History File
        from scripts.log_execution import load_history, find_week, save_history
        history = load_history()
        history_week = find_week(history, week_str)
        if not history_week:
            # Create week in history if it doesn't exist (unlikely but safe)
            history_week = {'week_of': week_str, 'dinners': []}
            history['weeks'].append(history_week)
        
        history_week['fridge_vegetables'] = confirmed_veg

        # 3. Update Inventory File
        inventory_path = Path('data/inventory.yml')
        inventory = {}
        if inventory_path.exists():
            with open(inventory_path, 'r') as f:
                inventory = yaml.safe_load(f) or {}
        
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
        state, updated_data = get_workflow_state(input_file)
        current_day = datetime.now().strftime('%a').lower()[:3]
        
        return jsonify({
            "status": "success",
            "message": "Vegetables confirmed and inventory updated",
            "week_of": week_str,
            "state": state,
            "has_data": updated_data is not None,
            "current_day": current_day
        })
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
            
        inventory_path = Path('data/inventory.yml')
        if not inventory_path.exists():
             return jsonify({"status": "error", "message": "Inventory file not found"}), 404

        with open(inventory_path, 'r') as f:
            inventory = yaml.safe_load(f) or {}
            
        if category == 'meals':
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'backups' not in inventory['freezer']: inventory['freezer']['backups'] = []
            inventory['freezer']['backups'].append({
                'meal': item,
                'servings': 4,
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
            
        inventory_path = Path('data/inventory.yml')
        if not inventory_path.exists():
             return jsonify({"status": "error", "message": "Inventory file not found"}), 404

        with open(inventory_path, 'r') as f:
            inventory = yaml.safe_load(f) or {}
            
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
if __name__ == "__main__":
    app.run(port=5328, debug=True)
