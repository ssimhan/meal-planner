import os
import yaml
from pathlib import Path
from datetime import datetime
from flask import Blueprint, jsonify, request
from scripts.workflow import (
    find_current_week_file, get_workflow_state, 
    generate_meal_plan, replan_meal_plan, create_new_week,
    generate_granular_prep_tasks
)
from scripts.github_helper import sync_changes_to_github, commit_multiple_files_to_github
from scripts.log_execution import find_week, calculate_adherence, update_inventory_file, save_history
from api.utils import get_actual_path, get_yaml_data, invalidate_cache

meals_bp = Blueprint('meals', __name__)

@meals_bp.route("/api/generate-plan", methods=["POST"])
def generate_plan_route():
    try:
        input_file, week_str = find_current_week_file()
        state, data = get_workflow_state(input_file)
        
        if state != "ready_to_plan":
            return jsonify({
                "status": "error",
                "message": f"Cannot generate plan in state: {state}. Please confirm vegetables first."
            }), 400
            
        generate_meal_plan(input_file, data)
        
        plan_filename = f"public/plans/{week_str}-weekly-plan.html"
        history_path = "data/history.yml"
        
        sync_changes_to_github([plan_filename, history_path, str(input_file)])
        
        plan_url = f"/plans/{week_str}-weekly-plan.html"
        invalidate_cache()
            
        return jsonify({
            "status": "success",
            "message": f"Successfully generated plan for week of {week_str}",
            "week_of": week_str,
            "plan_url": plan_url
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/create-week", methods=["POST"])
def create_week():
    try:
        data = request.json or {}
        week_str = data.get('week_of')
        
        if not week_str:
            return jsonify({"status": "error", "message": "Week start date required"}), 400
            
        # Call workflow action
        create_new_week(week_str)
        
        # Sync to GitHub
        input_file = f"inputs/{week_str}.yml"
        sync_changes_to_github([input_file])
        
        return jsonify({
            "status": "success", 
            "message": f"Created new week {week_str}"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/replan", methods=["POST"])
def replan_route():
    try:
        input_file, week_str = find_current_week_file()
        state, data = get_workflow_state(input_file)
        
        if not data:
            return jsonify({"status": "error", "message": "No active week data found"}), 404
            
        replan_meal_plan(input_file, data)
        
        # Determine changed files
        files_to_sync = ['data/history.yml']
        if input_file:
            files_to_sync.append(str(input_file))
        files_to_sync.append(f"public/plans/{week_str}-weekly-plan.html")
        
        sync_changes_to_github(files_to_sync)
        invalidate_cache()
        
        return jsonify({"status": "success", "message": "Plan updated based on execution"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/confirm-veg", methods=["POST"])
def confirm_veg():
    try:
        data = request.json or {}
        confirmed_veg = data.get('confirmed_veg')
        if not confirmed_veg:
            return jsonify({"status": "error", "message": "No vegetables provided"}), 400
            
        input_file, week_str = find_current_week_file()
        if not input_file or not input_file.exists():
             return jsonify({"status": "error", "message": f"Active input file not found"}), 404

        # 1. Update Input File
        week_data = get_yaml_data(str(input_file))
        if not week_data: return jsonify({"status": "error", "message": "Load failed"}), 404
            
        if 'farmers_market' not in week_data: week_data['farmers_market'] = {}
        week_data['farmers_market']['confirmed_veg'] = confirmed_veg
        week_data['farmers_market']['status'] = 'confirmed'
        
        # 2. Update History
        history = get_yaml_data('data/history.yml') or {'weeks': []}
        history_week = find_week(history, week_str)
        if not history_week:
            history_week = {'week_of': week_str, 'dinners': []}
            history['weeks'].append(history_week)
        history_week['fridge_vegetables'] = confirmed_veg

        # 3. Update Inventory
        inventory = get_yaml_data('data/inventory.yml') or {}
        if 'fridge' not in inventory: inventory['fridge'] = []
        existing = {i.get('item', '').lower() for i in inventory['fridge']}
        for veg in confirmed_veg:
            if veg.lower() not in existing:
                inventory['fridge'].append({'item': veg, 'quantity': 1, 'unit': 'count', 'added': datetime.now().strftime('%Y-%m-%d')})
        inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')

        files = {
            str(input_file): yaml.dump(week_data, sort_keys=False),
            'data/history.yml': yaml.dump(history, sort_keys=False),
            'data/inventory.yml': yaml.dump(inventory, sort_keys=False)
        }
        
        repo = os.environ.get("GITHUB_REPOSITORY") or "ssimhan/meal-planner"
        commit_multiple_files_to_github(repo, files, f"Confirm veggies for {week_str}")
        invalidate_cache()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# @meals_bp.route("/api/log-meal", methods=["POST"])
# def log_meal():
#     try:
#         pass # Moved to legacy api/index.py temporarily
#         return jsonify({"status": "error", "message": "Not implemented in new route yet"}), 501
