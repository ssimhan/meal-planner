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
    """Load config with caching."""
    h_id = storage.get_household_id()
    now = datetime.now().timestamp()
    
    # Check cache
    cache_entry = CACHE.get('config')
    # Simple cache key verification - in a real multi-tenant app we should key by household_id
    # But since this is per-request context in serverless (mostly), or single process per container...
    # Actually for local dev server (multi-request), we MUST key by household_id
    if cache_entry and cache_entry.get('household_id') == h_id and (now - cache_entry['timestamp'] < CACHE_TTL):
        return cache_entry['data']

    # Fetch from Storage Engine (which handles DB vs File logic)
    config = storage.StorageEngine.get_config()
    
    # Update cache
    CACHE['config'] = {'data': config, 'timestamp': now, 'household_id': h_id}
    return config

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
        query = storage.supabase.table("meal_plans").select("*").eq("household_id", storage.get_household_id()).eq("week_of", requested_week)
        res = storage.execute_with_retry(query)
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
        query = storage.supabase.table("meal_plans").select("*").eq("household_id", storage.get_household_id()).eq("week_of", week_str)
        res = storage.execute_with_retry(query)
        
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

    # Load snack defaults from config
    snack_config = config.get('snack_defaults', {})
    snack_fallbacks = snack_config.get('fallback', {})
    snack_by_day = snack_config.get('by_day', {})

    # Load meals_covered from config
    meals_covered = config.get('meals_covered', {})
    # Helper to check if a specific day is covered for a meal type
    def is_covered(meal_type, day):
        # 1. New List Format: ['mon', 'tue']
        val = meals_covered.get(meal_type)
        if isinstance(val, list):
            return day in val
        # 2. Legacy Boolean Format or Default
        if isinstance(val, bool):
            return val
        # 3. Default True if undefined
        return True

    today_snacks = {
        "school": snack_by_day.get(current_day, snack_fallbacks.get("school")) if is_covered('school_snack', current_day) else None,
        "home": snack_fallbacks.get("home") if is_covered('home_snack', current_day) else None
    }

    history_week = active_plan.get('history_data') if active_plan else None
    
    if history_week:

        if history_week and 'daily_feedback' in history_week:
            day_feedback = history_week['daily_feedback'].get(current_day, {})
            # Map daily_feedback fields to today_snacks structure
            if 'school_snack' in day_feedback and is_covered('school_snack', current_day):
                today_snacks['school'] = day_feedback['school_snack']
            if 'home_snack' in day_feedback and is_covered('home_snack', current_day):
                today_snacks['home'] = day_feedback['home_snack']
            if 'school_snack_made' in day_feedback:
                today_snacks['school_snack_made'] = day_feedback['school_snack_made']
            if 'home_snack_made' in day_feedback:
                today_snacks['home_snack_made'] = day_feedback['home_snack_made']
            if 'school_snack_needs_fix' in day_feedback:
                today_snacks['school_snack_needs_fix'] = day_feedback['school_snack_needs_fix']
            if 'home_snack_needs_fix' in day_feedback:
                today_snacks['home_snack_needs_fix'] = day_feedback['home_snack_needs_fix']
        
        if is_covered('dinner', current_day):
            dinners = (history_week.get('dinners') if history_week else None) or (data.get('dinners') if data else []) or []
            for dinner in dinners:
                if dinner.get('day') == current_day:
                    today_dinner = dinner
                    break
        
        if is_covered('kids_lunch', current_day) or is_covered('adult_lunch', current_day):
            history_lunches = history_week.get('lunches', {}) if history_week else {}
            if current_day in history_lunches:
                today_lunch = history_lunches[current_day]
            elif data and 'selected_lunches' in data:
                today_lunch = data['selected_lunches'].get(current_day)

            if not today_lunch and (is_covered('kids_lunch', current_day) or is_covered('adult_lunch', current_day)):
                 today_lunch = None # No hardcoded default here

        if today_lunch and history_week and 'daily_feedback' in history_week:
            # Robustness: ensure today_lunch is a dict before assignment
            if isinstance(today_lunch, str):
                today_lunch = {"recipe_name": today_lunch}
            
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
                "prep_tasks": [
                    t for t in (history_week.get('prep_tasks', []) if history_week else [])
                    if t.get('day') == current_day or (
                        t.get('day') in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] and
                        current_day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] and
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
                query = storage.supabase.table("meal_plans").select("week_of, status").eq("household_id", storage.get_household_id()).gt("week_of", week_str).order("week_of", desc=False).limit(1)
                future_res = storage.execute_with_retry(query)
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
        print(f"CRITICAL ERROR in _get_current_status [{request.method} {request.url}]: {e}")
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc(),
            "context": {
                "method": request.method,
                "url": request.url
            }
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

@status_bp.route("/api/debug/context")
@require_auth
def debug_context():
    """Verify backend session context injection."""
    return jsonify({
        "status": "success",
        "user_id": request.user.id if hasattr(request, 'user') else None,
        "email": request.user.email if hasattr(request, 'user') else None,
        "household_id": storage.get_household_id()
    })

@status_bp.route("/api/debug/clear_cache")
@require_auth
def debug_clear_cache():
    """Clear backend cache (config, recipes, etc)."""
    from api.utils import invalidate_cache
    invalidate_cache()
    # invalidate local module cache too if needed
    if 'config' in CACHE:
        del CACHE['config']
    return jsonify({"status": "success", "message": "Cache cleared"})
