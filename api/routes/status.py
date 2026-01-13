import os

from pathlib import Path
from datetime import datetime, timedelta
import pytz
from flask import Blueprint, jsonify, request

from scripts.compute_analytics import compute_analytics
from api.utils import CACHE, CACHE_TTL
from api.utils.auth import require_auth
from api.utils import storage

status_bp = Blueprint('status', __name__)

def _load_config():
    """Load config from DB households table with caching."""
    h_id = storage.get_household_id()
    now = datetime.now().timestamp()
    
    # Check cache
    cache_entry = CACHE.get('config')
    if cache_entry and (now - cache_entry['timestamp'] < CACHE_TTL):
        return cache_entry['data']

    if not storage.supabase:
        print("Supabase client not initialized. Using fallback config.")
        return {'timezone': 'America/Los_Angeles'}

    try:
        res = storage.supabase.table("households").select("config").eq("id", h_id).execute()
        if res.data and len(res.data) > 0:
            config = res.data[0]['config']
            CACHE['config'] = {'data': config, 'timestamp': now}
            return config
    except Exception as e:
        print(f"Error loading config from DB for {h_id}: {e}")

    # Fallback
    return {'timezone': 'America/Los_Angeles'}

def _get_current_status(skip_sync=False, week_override=None):
    try:
        storage.StorageEngine.archive_expired_weeks()
    except Exception as e:
        print(f"Warning: Failed to archive: {e}")

    # Load timezone from config.yml
    config = _load_config()
    user_tz = pytz.timezone(config.get('timezone', 'America/Los_Angeles'))
    today = datetime.now(user_tz)

    monday = today - timedelta(days=today.weekday())
    week_str = monday.strftime('%Y-%m-%d')
    
    # Check if a specific week was requested
    requested_week = week_override or request.args.get('week')
    
    if requested_week:
        # Fetch specific week
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", storage.get_household_id()).eq("week_of", requested_week).execute()
        if res.data:
            active_plan = res.data[0]
            state, data = storage.StorageEngine.get_workflow_state(active_plan)
            week_str = active_plan['week_of']
        else:
            # Week doesn't exist in DB yet
            active_plan = None
            state = 'new_week'
            data = {}
            week_str = requested_week
    else:
        # Default logic: ALWAYS use the current calendar week
        # This ensures the dashboard aligns with reality.
        # We try to fetch the plan for the *current* week.
        week_str = monday.strftime('%Y-%m-%d')
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", storage.get_household_id()).eq("week_of", week_str).execute()
        
        if res.data:
            active_plan = res.data[0]
            state, data = storage.StorageEngine.get_workflow_state(active_plan)
        else:
            # No plan for current week yet
            active_plan = None
            state = 'new_week' # Or 'no_plan'
            data = {}
    current_day = today.strftime('%a').lower()[:3]

    today_dinner = None
    today_lunch = None
    prep_tasks = []

    # Load snack defaults from config.yml
    snack_config = config.get('snack_defaults', {})
    snack_fallbacks = snack_config.get('fallback', {
        "school": "Fruit or Cheese sticks",
        "home": "Cucumber or Crackers"
    })
    snack_by_day = snack_config.get('by_day', {
        'mon': 'Apple slices with peanut butter',
        'tue': 'Cheese and crackers',
        'wed': 'Cucumber rounds with cream cheese',
        'thu': 'Grapes',
        'fri': 'Crackers with hummus'
    })

    # Load meals_covered from config
    meals_covered = config.get('meals_covered', {})
    cover_dinner = meals_covered.get('dinner', True)
    cover_kids_lunch = meals_covered.get('kids_lunch', True)
    cover_adult_lunch = meals_covered.get('adult_lunch', True)
    cover_school_snack = meals_covered.get('school_snack', True)
    cover_home_snack = meals_covered.get('home_snack', True)

    today_snacks = {
        "school": snack_by_day.get(current_day, snack_fallbacks.get("school", "Fruit")) if cover_school_snack else None,
        "home": snack_fallbacks.get("home", "Cucumber or Crackers") if cover_home_snack else None
    }

    history_week = active_plan.get('history_data') if active_plan else None
    
    if history_week:

        if history_week and 'daily_feedback' in history_week:
            day_feedback = history_week['daily_feedback'].get(current_day, {})
            # Map daily_feedback fields to today_snacks structure
            if 'school_snack' in day_feedback and cover_school_snack:
                today_snacks['school'] = day_feedback['school_snack']
            if 'home_snack' in day_feedback and cover_home_snack:
                today_snacks['home'] = day_feedback['home_snack']
            if 'school_snack_made' in day_feedback:
                today_snacks['school_snack_made'] = day_feedback['school_snack_made']
            if 'home_snack_made' in day_feedback:
                today_snacks['home_snack_made'] = day_feedback['home_snack_made']
            if 'school_snack_needs_fix' in day_feedback:
                today_snacks['school_snack_needs_fix'] = day_feedback['school_snack_needs_fix']
            if 'home_snack_needs_fix' in day_feedback:
                today_snacks['home_snack_needs_fix'] = day_feedback['home_snack_needs_fix']
        
        if cover_dinner:
            dinners = (history_week.get('dinners') if history_week else None) or (data.get('dinners') if data else []) or []
            for dinner in dinners:
                if dinner.get('day') == current_day:
                    today_dinner = dinner
                    break
        
        if cover_kids_lunch or cover_adult_lunch:
            history_lunches = history_week.get('lunches', {}) if history_week else {}
            if current_day in history_lunches:
                today_lunch = history_lunches[current_day]
            elif data and 'selected_lunches' in data:
                today_lunch = data['selected_lunches'].get(current_day)

            if not today_lunch and (cover_kids_lunch or cover_adult_lunch):
                 today_lunch = {"recipe_name": "Leftovers or Simple Lunch", "prep_style": "quick_fresh"}

        if today_lunch and history_week and 'daily_feedback' in history_week:
            day_feedback = history_week['daily_feedback'].get(current_day, {})
            for key in ['kids_lunch', 'kids_lunch_made', 'adult_lunch', 'adult_lunch_made']:
                if key in day_feedback:
                    today_lunch[key + ('_feedback' if 'feedback' not in key and 'made' not in key else '')] = day_feedback[key]

    resolved_slots = {}
    if history_week or data:
             data = data or {}
             # Use new resolution logic
             from api.utils.meal_resolution import resolve_week
             
             resolved_slots = resolve_week(data, history_week)
             
             # Reconstruct compatible 'dinners' list for frontend
             merged_dinners = []
             days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
             
             for day in days:
                 slot = resolved_slots.get(f"{day}_dinner")
                 if not slot:
                     continue

                 # Start with plan details (if any) so we have the recipe_id
                 r_meal = slot['plan'].copy() if slot['plan'] else {}
                 
                 # Overlay actual details if they exist
                 if slot['resolved']:
                     r_meal.update(slot['resolved'])
                 
                 # Handle generic fields
                 r_meal['day'] = day
                 
                 # Explicitly handle SKIPPED state to ensure it shows up
                 if slot['adherence'] == 'SKIPPED':
                     r_meal['made'] = False
                     # We keep the plan details so UI shows "Tacos" (Skipped)
                 
                 if r_meal:
                     merged_dinners.append(r_meal)
            
             data['dinners'] = merged_dinners

             if history_week:
                if 'daily_feedback' in history_week:
                    data['daily_feedback'] = history_week['daily_feedback']
                if 'prep_tasks' in history_week:
                    data['prep_tasks'] = history_week['prep_tasks']

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
    try:
        res_dict = {
            "status": "success",
            "week_of": str(week_str),
            "state": state,
            "current_day": current_day,
            "household_id": storage.get_household_id(),
            "today_dinner": today_dinner,
            "today_lunch": today_lunch,
            "today_snacks": today_snacks,
            "today": {
                "day": current_day,
                "date": today.strftime('%Y-%m-%d'),
                "dinner": today_dinner,
                "lunch": today_lunch,
                "snacks": today_snacks,
                "snacks": today_snacks,
                "prep_tasks": [
                    t for t in (history_week.get('prep_tasks', []) if history_week else [])
                    if t.get('day') == current_day or (
                        t.get('day') in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] and
                        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].index(t.get('day')) < ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].index(current_day) and
                        t.get('status') != 'complete'
                    )
                ],
                "prep_completed": completed_prep_today
            },
            "next_week_planned": False,
            "next_week": None,
            "week_data": data,
            "available_weeks": [],
            "slots": resolved_slots,
            "pending_recipes": storage.StorageEngine.get_pending_recipes()
        }

        # Check for next week
        if storage.supabase:
            try:
                # Simple check for any plan in the future
                future_res = storage.supabase.table("meal_plans").select("week_of, status").eq("household_id", storage.get_household_id()).gt("week_of", week_str).order("week_of", desc=False).limit(1).execute()
                if future_res.data:
                    res_dict["next_week_planned"] = True
                    res_dict["next_week"] = {
                        "week_of": str(future_res.data[0]['week_of']),
                        "status": future_res.data[0]['status']
                    }
            except Exception as e:
                print(f"Error checking for next week: {e}")

        # Add available weeks for the selector
        try:
            res_dict["available_weeks"] = storage.StorageEngine.get_available_weeks()
        except Exception as e:
            print(f"Error adding available weeks: {e}")

        return jsonify(res_dict)
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR in _get_current_status: {e}")
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@status_bp.route("/api/status")
@require_auth
def get_status():
    return _get_current_status(skip_sync=False)

@status_bp.route("/api/history")
@require_auth
def get_history():
    history = storage.StorageEngine.get_history()
    return jsonify(history or {})

@status_bp.route("/api/analytics")
@require_auth
def get_analytics():
    history = storage.StorageEngine.get_history()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    analytics = compute_analytics(history, start_date, end_date)
    return jsonify(analytics)

@status_bp.route("/api/hello")
@require_auth
def hello():
    return jsonify({"message": "Hello from Flask on Vercel!"})
