import os
import yaml
from pathlib import Path
from datetime import datetime, timedelta
import pytz
from flask import Blueprint, jsonify, request
from scripts.workflow import get_workflow_state, find_current_week_file, archive_expired_weeks, generate_granular_prep_tasks
from scripts.github_helper import get_file_from_github, list_files_in_dir_from_github
from scripts.log_execution import find_week
from scripts.compute_analytics import compute_analytics
from api.utils import get_cached_data, get_actual_path, get_yaml_data

status_bp = Blueprint('status', __name__)

def _get_current_status(skip_sync=False):
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
        archive_expired_weeks()
    except Exception as e:
        print(f"Warning: Failed to archive: {e}")
    
    pacific_tz = pytz.timezone('America/Los_Angeles')
    today = datetime.now(pacific_tz)

    monday = today - timedelta(days=today.weekday())
    week_str = monday.strftime('%Y-%m-%d')

    input_file = None
    
    # 1. Look for active or incomplete weeks (planning in progress OR active this week)
    if is_vercel:
        inputs_dir = Path("/tmp/inputs")
        if inputs_dir.exists():
            for f in sorted(inputs_dir.glob('*.yml'), reverse=True):
                with open(f, 'r') as yf:
                    try:
                        data = yaml.safe_load(yf)
                        if data and data.get('workflow', {}).get('status') != 'archived':
                            # Include weeks that are not archived (either incomplete OR plan_complete)
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
    # We need to regenerate them dynamically because they might depend on completion
    completed_prep_today = []
    if history_week and 'daily_feedback' in history_week:
        day_feedback = history_week['daily_feedback'].get(current_day, {})
        completed_prep_today = day_feedback.get('prep_completed', [])

    # If active, we should generate prep tasks dynamically to filter completed ones
    if state in ['active', 'waiting_for_checkin'] and data:
        try:
             # Need to pass selected_dinners and lunches which are in data
             # But 'data' structure from get_workflow_state might already have them or we raw load
             # get_workflow_state returns the FULL yaml content if it exists
             
             # Extract selected dinners dict from list
             selected_dinners = {}
             if 'dinners' in data:
                 for d in data['dinners']:
                     selected_dinners[d['day']] = d # ID only? or full obj?
                     # In inputs/WEEK.yml, dinners is list of {day, recipe_id}. 
                     # We might need full recipe for prep generation.
                     # This is getting complicated to reconstruct here.
                     pass 
             
             # Fallback: Just return tasks as they are if we can't regenerate easily
             # Or better, trust the frontend or separate endpoint to fetch tasks?
             # For status, we return a summary.
             pass
        except Exception as e:
            print(f"Warning: Failed to regenerate prep tasks: {e}")

    return jsonify({
        "status": "success",
        "week_of": week_str,
        "state": state,
        "today": {
            "day": current_day,
            "date": today.strftime('%Y-%m-%d'),
            "dinner": today_dinner,
            "lunch": today_lunch,
            "snacks": today_snacks,
            "prep_tasks": history_week.get('prep_tasks', []) if history_week else [],
            "prep_completed": completed_prep_today
        },
        "next_week_planned": False, # Todo: check if next week exists
        "week_data": data
    })

@status_bp.route("/api/status")
def get_status():
    return _get_current_status(skip_sync=False)

@status_bp.route("/api/history")
def get_history():
    history = get_cached_data('history', 'data/history.yml')
    return jsonify(history or {})

@status_bp.route("/api/analytics")
def get_analytics():
    history = get_cached_data('history', 'data/history.yml')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    analytics = compute_analytics(history, start_date, end_date)
    return jsonify(analytics)

@status_bp.route("/api/hello")
def hello():
    return jsonify({"message": "Hello from Flask on Vercel!"})
