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
        from datetime import datetime, timedelta
        today = datetime.now()
        # On weekends, look for the upcoming Monday
        if today.weekday() >= 5: # Saturday or Sunday
            target_date = today + timedelta(days=(7 - today.weekday()))
        else:
            target_date = today - timedelta(days=today.weekday())
        
        week_str = target_date.strftime('%Y-%m-%d')
        input_file = Path(f'inputs/{week_str}.yml')
        
        if input_file.exists():
            state, data = get_workflow_state(input_file)
        else:
            input_file, week_str = find_current_week_file()
            state, data = get_workflow_state(input_file)
        
        # Force current day to Monday for testing visibility on Vercel
        current_day = 'mon'
            
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
        
        if state == 'week_complete':
            from scripts.log_execution import load_history, find_week
            history = load_history()
            week_data = find_week(history, week_str)
            if week_data and 'dinners' in week_data:
                for dinner in week_data['dinners']:
                    if dinner.get('day') == current_day:
                        today_dinner = dinner
                        break
            
            # Identify lunches
            if week_data and 'lunches' in week_data:
                if isinstance(week_data['lunches'], dict):
                    today_lunch = week_data['lunches'].get(current_day)
                elif isinstance(week_data['lunches'], list):
                    for lunch in week_data['lunches']:
                        if lunch.get('day') == current_day:
                            today_lunch = lunch
                            break
            
            # If no lunch in history, try to derive it (as workflow.py does)
            if not today_lunch and state == 'week_complete':
                # This would require running lunch_selector logic, 
                # but for simplicity we'll just note it's missing or use a placeholder
                today_lunch = {"recipe_name": "Leftovers or Simple Lunch", "prep_style": "quick_fresh"}

            # Prep Tasks Logic
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
            "week_data": week_data
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
            
        with open(input_file, 'r') as f:
            week_data = yaml.safe_load(f)
            
        if 'farmers_market' not in week_data:
            week_data['farmers_market'] = {}
            
        week_data['farmers_market']['confirmed_veg'] = confirmed_veg
        week_data['farmers_market']['status'] = 'confirmed'
        
        with open(input_file, 'w') as f:
            yaml.dump(week_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            
        # Sync to GitHub
        from scripts.github_helper import sync_changes_to_github
        sync_changes_to_github([str(input_file)])
        
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
        with open(inventory_path, 'w') as f:
            yaml.dump(inventory, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            
        # Sync to GitHub
        from scripts.github_helper import sync_changes_to_github
        sync_changes_to_github([str(inventory_path)])
        
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
        with open(inventory_path, 'w') as f:
            yaml.dump(inventory, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
            
        # Sync to GitHub
        from scripts.github_helper import sync_changes_to_github
        sync_changes_to_github([str(inventory_path)])
        
        return jsonify({"status": "success", "inventory": inventory})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/hello")
def hello_world():
    return jsonify({"message": "Hello from Python on Vercel!"})

# For local development
if __name__ == "__main__":
    app.run(port=5328, debug=True)
