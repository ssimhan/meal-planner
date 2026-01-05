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
        # Try to find the most relevant week for the dashboard
        # Priority: This week if it exists, otherwise next week
        today = datetime.now()
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
        
        # Determine current day context for the dashboard
        current_day = datetime.now().strftime('%a').lower()[:3]
        
        today_dinner = None
        if state in ['active', 'waiting_for_checkin']:
            from scripts.log_execution import load_history, find_week
            history = load_history()
            week = find_week(history, week_str)
            if week and 'dinners' in week:
                for dinner in week['dinners']:
                    if dinner.get('day') == current_day:
                        today_dinner = dinner
                        break
        
        return jsonify({
            "week_of": week_str,
            "state": state,
            "has_data": data is not None,
            "status": "success",
            "current_day": current_day,
            "today_dinner": today_dinner
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
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

            # Prep Tasks Logic (Unified)
            if current_day == 'mon':
                prep_tasks = ["Chop vegetables for Mon/Tue", "Prep lunch components", "Identify batch cooking meal"]
            elif current_day == 'tue':
                prep_tasks = ["☀️ AM: Assemble Tuesday lunch", "🌙 PM: Chop vegetables for Wed-Fri", "🌙 PM: Prep components for Wed-Fri"]
            elif current_day == 'wed':
                prep_tasks = ["Finish any remaining vegetable/lunch prep", "Check Thu/Fri components", "Load slow cooker if needed"]
            elif current_day == 'thu':
                prep_tasks = ["Morning prep (8-9am) allowed", "NO chopping after noon", "NO evening prep"]
            elif current_day == 'fri':
                prep_tasks = ["STRICT NO PREP DAY", "Only reheating/assembly allowed"]

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
        
        if not week_str or not day or not made:
            return jsonify({"status": "error", "message": "Week, day, and made status are required"}), 400
            
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
            
        # Find dinner
        target_day = day.lower()[:3]
        target_dinner = None
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
        else:
            target_dinner['made'] = made
            
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
            
        # We need to read the content. input_file is a Path object.
        # If on Vercel, this file might not exist locally if it was created in a previous lambda
        # unless it was included in the deployment. 
        # Inputs should be in the repo, so they should available to read.
        
        if not input_file.exists():
             return jsonify({"status": "error", "message": f"Input file {input_file} not found"}), 404

        with open(input_file, 'r') as f:
            week_data = yaml.safe_load(f)
            
        if 'farmers_market' not in week_data:
            week_data['farmers_market'] = {}
            
        week_data['farmers_market']['confirmed_veg'] = confirmed_veg
        week_data['farmers_market']['status'] = 'confirmed'
        
        # Serialize to string
        new_content = yaml.dump(week_data, default_flow_style=False, sort_keys=False, allow_unicode=True)
        
        # Try to write locally (for dev), ignore if read-only
        try:
            with open(input_file, 'w') as f:
                f.write(new_content)
        except OSError:
            print(f"Read-only filesystem, skipping local write for {input_file}")
            
        # Sync to GitHub directly with content
        from scripts.github_helper import commit_file_to_github
        repo_name = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        
        # input_file is likely absolute or relative. commit_file_to_github expects relative to repo root.
        # If input_file is 'inputs/2025-01-05.yml', that's perfect.
        rel_path = str(input_file)
        
        success = commit_file_to_github(repo_name, rel_path, f"Confirm veggies for {week_str}", content=new_content)
        
        if not success:
             return jsonify({"status": "error", "message": "Failed to sync to GitHub"}), 500
        
        return jsonify({"status": "success", "message": "Vegetables confirmed"})
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

# For local development
if __name__ == "__main__":
    app.run(port=5328, debug=True)
