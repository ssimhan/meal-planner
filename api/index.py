from flask import Flask, jsonify, request
import sys
import os
from pathlib import Path
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
        input_file, week_str = find_current_week_file()
        state, data = get_workflow_state(input_file)
        
        return jsonify({
            "week_of": week_str,
            "state": state,
            "has_data": data is not None,
            "status": "success"
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
            inventory = yaml.safe_load(f)
            
        if category == 'meals':
            if 'freezer' not in inventory: inventory['freezer'] = {}
            if 'meals' not in inventory['freezer']: inventory['freezer']['meals'] = {}
            meals = inventory['freezer']['meals']
            meals[item] = meals.get(item, 0) + 1
        elif category == 'pantry':
            if 'vegetables' not in inventory: inventory['vegetables'] = {}
            if 'pantry' not in inventory['vegetables']: inventory['vegetables']['pantry'] = []
            inventory['vegetables']['pantry'].append(item)
        elif category == 'fridge':
            if 'vegetables' not in inventory: inventory['vegetables'] = {}
            if 'fridge' not in inventory['vegetables']: inventory['vegetables']['fridge'] = []
            inventory['vegetables']['fridge'].append(item)
            
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
