import os
import yaml
from pathlib import Path
from datetime import datetime
from flask import Blueprint, jsonify, request
from scripts.workflow import (
    generate_meal_plan, replan_meal_plan
)
from api.utils import storage, invalidate_cache
from api.utils.auth import require_auth
from scripts.log_execution import find_week, calculate_adherence

meals_bp = Blueprint('meals', __name__)

@meals_bp.route("/api/generate-plan", methods=["POST"])
@require_auth
def generate_plan_route():
    try:
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).neq("status", "archived").order("week_of", desc=True).limit(1).execute()
        
        if not res.data:
            return jsonify({"status": "error", "message": "No active week found to generate plan"}), 404
            
        active_plan = res.data[0]
        week_str = active_plan['week_of']
        data = active_plan['plan_data']
        
        # We still need the input_file for the legacy generation script? 
        # Actually, let's try to pass the data directly if possible, or use a temp file.
        # For Phase 14.2, we keep legacy scripts running on /tmp.
        input_file = Path(f"/tmp/inputs/{week_str}.yml")
        os.makedirs(input_file.parent, exist_ok=True)
        with open(input_file, 'w') as f:
            yaml.dump(data, f)

        # Call the existing generator
        generate_meal_plan(input_file, data)
        
        # Refresh data after generation (it might have updated the file)
        with open(input_file, 'r') as f:
            new_data = yaml.safe_load(f)
        
        storage.StorageEngine.update_meal_plan(week_str, plan_data=new_data)
        
        invalidate_cache()
            
        return jsonify({
            "status": "success",
            "message": f"Successfully generated plan for week of {week_str}",
            "week_of": week_str
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/create-week", methods=["POST"])
@require_auth
def create_week():
    try:
        data = request.json or {}
        week_str = data.get('week_of')
        
        if not week_str:
             return jsonify({"status": "error", "message": "Week start date required"}), 400
            
        # Initialize in DB
        storage.StorageEngine.update_meal_plan(week_str, plan_data={'week_of': week_str}, history_data={'week_of': week_str, 'dinners': []}, status='planning')
        
        return jsonify({
            "status": "success", 
            "message": f"Created new week {week_str}"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/replan", methods=["POST"])
@require_auth
def replan_route():
    try:
        active_plan = storage.StorageEngine.get_active_week()
        if not active_plan:
            return jsonify({"status": "error", "message": "No active week found"}), 404
            
        week_str = active_plan['week_of']
        data = active_plan['plan_data']
        
        # We need a temp file for the legacy replan script
        input_file = Path(f"/tmp/inputs/{week_str}.yml")
        os.makedirs(input_file.parent, exist_ok=True)
        with open(input_file, 'w') as f:
            yaml.dump(data, f)
            
        replan_meal_plan(input_file, data)
        
        # Read back modified data
        with open(input_file, 'r') as f:
            new_data = yaml.safe_load(f)
            
        storage.StorageEngine.update_meal_plan(week_str, plan_data=new_data)
        invalidate_cache()
        
        return jsonify({"status": "success", "message": "Plan updated based on execution"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/confirm-veg", methods=["POST"])
@require_auth
def confirm_veg():
    try:
        data = request.json or {}
        confirmed_veg = data.get('confirmed_veg')
        if not confirmed_veg:
            return jsonify({"status": "error", "message": "No vegetables provided"}), 400
            
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).neq("status", "archived").order("week_of", desc=True).limit(1).execute()
        
        if not res.data:
            return jsonify({"status": "error", "message": "No active week found"}), 404
            
        active_plan = res.data[0]
        week_str = active_plan['week_of']
        week_data = active_plan['plan_data']
        history_week = active_plan['history_data']

        # 1. Update Plan Data
        if 'farmers_market' not in week_data: week_data['farmers_market'] = {}
        week_data['farmers_market']['confirmed_veg'] = confirmed_veg
        week_data['farmers_market']['status'] = 'confirmed'
        
        # 2. Update History
        history_week['fridge_vegetables'] = confirmed_veg

        # 3. Update Inventory (Direct to DB)
        for veg in confirmed_veg:
            storage.StorageEngine.update_inventory_item('fridge', veg, updates={'added': datetime.now().strftime('%Y-%m-%d')})

        # Save back to DB
        storage.StorageEngine.update_meal_plan(week_str, plan_data=week_data, history_data=history_week)
        invalidate_cache()

        # Return updated status
        from api.routes.status import _get_current_status
        return _get_current_status(skip_sync=True, week_override=week_str)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/log-meal", methods=["POST"])
@require_auth
def log_meal():
    try:
        data = request.json or {}
        week_str = data.get('week')
        day = data.get('day')
        made = data.get('made')
        vegetables = data.get('vegetables')
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
        school_snack_made = data.get('school_snack_made')
        home_snack_made = data.get('home_snack_made')
        kids_lunch_made = data.get('kids_lunch_made')
        adult_lunch_made = data.get('adult_lunch_made')
        prep_completed = data.get('prep_completed', [])
        
        school_snack_needs_fix = data.get('school_snack_needs_fix')
        home_snack_needs_fix = data.get('home_snack_needs_fix')
        kids_lunch_needs_fix = data.get('kids_lunch_needs_fix')
        adult_lunch_needs_fix = data.get('adult_lunch_needs_fix')
        dinner_needs_fix = data.get('dinner_needs_fix')
        request_recipe = data.get('request_recipe', False)

        if not week_str or not day:
             return jsonify({"status": "error", "message": "Week and day required"}), 400
             
        # Fetch plan from DB
        h_id = storage.get_household_id()
        print(f"DEBUG: Logging meal for week={week_str}, day={day}, h_id={h_id}")
        
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_str).order("week_of", desc=True).limit(1).execute()
        if not res.data:
            print(f"DEBUG: Meal plan for {week_str} not found in DB")
            return jsonify({"status": "error", "message": f"Meal plan for week {week_str} not found"}), 404
            
        plan_record = res.data[0]
        history_week = plan_record.get('history_data') or {}
        active_plan_data = plan_record.get('plan_data') or {}
        
        # Ensure minimal structure
        if not history_week:
            history_week = {'week_of': week_str, 'dinners': []}
        if 'dinners' not in history_week:
            history_week['dinners'] = []

        target_day = day.lower()[:3]
        target_dinner = None
        
        # Logic to skip made check if strictly feedback
        is_feedback_only = (school_snack_feedback or home_snack_feedback or kids_lunch_feedback or adult_lunch_feedback or
                            school_snack_needs_fix is not None or home_snack_needs_fix is not None or
                            kids_lunch_needs_fix is not None or adult_lunch_needs_fix is not None) and not made

        if not is_feedback_only or dinner_needs_fix is not None or actual_meal:
             for d in history_week.get('dinners', []):
                 if d.get('day') == target_day:
                     target_dinner = d
                     break
             
             if not target_dinner:
                 target_dinner = {'day': target_day, 'recipe_id': 'unplanned_meal', 'cuisine': 'various', 'vegetables': []}
                 history_week.setdefault('dinners', []).append(target_dinner)

             # Update execution data
             if str(made).lower() in ('yes', 'true', '1', 'y'): target_dinner['made'] = True
             elif str(made).lower() in ('no', 'false', '0', 'n'): target_dinner['made'] = False
             elif str(made).lower() in ('freezer', 'backup'): target_dinner['made'] = 'freezer_backup'
             elif str(made).lower() == 'outside_meal': target_dinner['made'] = 'outside_meal'
             else: target_dinner['made'] = made
        
        if not is_feedback_only:
             if vegetables: 
                 v_list = [v.strip() for v in vegetables.split(',')]
                 target_dinner['vegetables_used'] = v_list
                 
                 # Inventory updates (Subtract from fridge in DB)
                 for veg in v_list:
                     storage.StorageEngine.update_inventory_item('fridge', veg, delete=True)

             if kids_feedback: target_dinner['kids_feedback'] = kids_feedback
             if kids_complaints:
                 target_dinner['kids_complaints'] = kids_complaints
                 history_week.setdefault('kids_dislikes', []).append({
                     'complaint': kids_complaints,
                     'date': datetime.now().strftime('%Y-%m-%d'),
                     'recipe': target_dinner.get('recipe_id')
                 })
             if reason: target_dinner['reason'] = reason
             
        if target_dinner:
             if actual_meal: target_dinner['actual_meal'] = actual_meal
             if dinner_needs_fix is not None: target_dinner['needs_fix'] = dinner_needs_fix

        # Feedback logging (snacks/lunch)
        if (school_snack_feedback is not None or home_snack_feedback is not None or
            kids_lunch_feedback is not None or adult_lunch_feedback is not None or
            school_snack_made is not None or home_snack_made is not None or
            kids_lunch_made is not None or adult_lunch_made is not None or
            school_snack_needs_fix is not None or home_snack_needs_fix is not None or
            kids_lunch_needs_fix is not None or adult_lunch_needs_fix is not None or
            (prep_completed and len(prep_completed) > 0)):
            
            day_fb = history_week.setdefault('daily_feedback', {}).setdefault(target_day, {})
            
            if school_snack_feedback: day_fb['school_snack'] = school_snack_feedback
            if school_snack_made: day_fb['school_snack_made'] = school_snack_made
            if home_snack_feedback: day_fb['home_snack'] = home_snack_feedback
            if home_snack_made: day_fb['home_snack_made'] = home_snack_made
            if kids_lunch_feedback: day_fb['kids_lunch'] = kids_lunch_feedback
            if kids_lunch_made: day_fb['kids_lunch_made'] = kids_lunch_made
            if adult_lunch_feedback: day_fb['adult_lunch'] = adult_lunch_feedback
            if adult_lunch_made: day_fb['adult_lunch_made'] = adult_lunch_made
            
            if school_snack_needs_fix is not None: day_fb['school_snack_needs_fix'] = school_snack_needs_fix
            if home_snack_needs_fix is not None: day_fb['home_snack_needs_fix'] = home_snack_needs_fix
            if kids_lunch_needs_fix is not None: day_fb['kids_lunch_needs_fix'] = kids_lunch_needs_fix
            if adult_lunch_needs_fix is not None: day_fb['adult_lunch_needs_fix'] = adult_lunch_needs_fix

            if prep_completed:
                 existing = set(day_fb.get('prep_completed', []))
                 for t in prep_completed:
                     if t not in existing:
                         day_fb.setdefault('prep_completed', []).append(t)
                         existing.add(t)

        if not is_feedback_only:
             # Freezer/Inventory updates
             if made_2x:
                 target_dinner['made_2x_for_freezer'] = True
                 meal_name = target_dinner.get('recipe_id', 'Unknown').replace('_', ' ').title()
                 storage.StorageEngine.update_inventory_item('freezer_backup', meal_name, updates={'servings': 4, 'frozen_date': datetime.now().strftime('%Y-%m-%d')})
             
             if freezer_meal and target_dinner.get('made') == 'freezer_backup':
                 target_dinner['freezer_used'] = {'meal': freezer_meal, 'frozen_date': 'Unknown'}
                 storage.StorageEngine.update_inventory_item('freezer_backup', freezer_meal, delete=True)

             calculate_adherence(history_week)
             
             # Handle "Add as Recipe" request
             if request_recipe and actual_meal:
                 try:
                     recipe_id = actual_meal.lower().replace(' ', '_')
                     # Check if it exists first
                     existing = storage.supabase.table("recipes").select("id").eq("household_id", h_id).eq("id", recipe_id).execute()
                     if not existing.data:
                         storage.supabase.table("recipes").insert({
                             "id": recipe_id,
                             "household_id": h_id,
                             "name": actual_meal,
                             "metadata": {
                                 "cuisine": "Indian" if "rice" in actual_meal.lower() or "sambar" in actual_meal.lower() else "unknown",
                                 "meal_type": "dinner",
                                 "effort_level": "normal"
                             },
                             "content": f"# {actual_meal}\n\nAdded automatically from meal correction."
                         }).execute()
                 except Exception as re:
                     print(f"Error auto-adding recipe: {re}")

        # Save to DB
        storage.StorageEngine.update_meal_plan(week_str, history_data=history_week)
        invalidate_cache()

        # Return updated status
        from api.routes.status import _get_current_status
        return _get_current_status(skip_sync=True, week_override=week_str)

    except Exception as e:
        print(f"ERROR in log_meal: {e}")
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/swap-meals", methods=["POST"])
@require_auth
def swap_meals():
    try:
        data = request.json or {}
        week_str = data.get('week')
        day1 = data.get('day1')
        day2 = data.get('day2')

        if not week_str or not day1 or not day2:
             return jsonify({"status": "error", "message": "Week, day1, and day2 are required"}), 400

        # Load from DB
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_str).single().execute()
        if not res.data:
            return jsonify({"status": "error", "message": f"Meal plan for week {week_str} not found"}), 404
        
        plan_record = res.data
        week_data = plan_record['plan_data']
        
        # Helper to find dinner in list
        def get_dinner(dinners_list, d):
            for i, dinner in enumerate(dinners_list):
                 if dinner.get('day') == d: return i, dinner
            return -1, None

        # Swap
        if 'dinners' in week_data:
            idx1, dinner1 = get_dinner(week_data['dinners'], day1)
            idx2, dinner2 = get_dinner(week_data['dinners'], day2)
            if dinner1 and dinner2:
                dinner1['day'] = day2
                dinner2['day'] = day1
                week_data['dinners'][idx1] = dinner2
                week_data['dinners'][idx2] = dinner1
            elif dinner1: dinner1['day'] = day2
            elif dinner2: dinner2['day'] = day1

        # Save to DB
        storage.StorageEngine.update_meal_plan(week_str, plan_data=week_data)
        invalidate_cache()
        
        return jsonify({"status": "success", "message": "Meals swapped", "week_data": week_data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
@meals_bp.route("/api/check-prep", methods=["POST"])
@require_auth
def check_prep_task():
    try:
        data = request.json or {}
        week_str = data.get('week')
        task_id = data.get('task_id')
        status = data.get('status', 'complete') # 'complete' or 'pending'
        
        if not week_str:
            return jsonify({"status": "error", "message": "Week required"}), 400
            
        # Load from DB
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_str).single().execute()
        if not res.data:
            return jsonify({"status": "error", "message": "Meal plan not found"}), 404
            
        history_week = res.data['history_data']
        
        # Update logic
        updated = False
        if 'prep_tasks' in history_week:
            for t in history_week['prep_tasks']:
                if task_id and t.get('id') == task_id:
                    t['status'] = status
                    updated = True
                    break 
        
        if not updated:
             return jsonify({"status": "error", "message": "Task not found to update"}), 404
             
        # Save to DB
        storage.StorageEngine.update_meal_plan(week_str, history_data=history_week)
        invalidate_cache('history')
        
        return jsonify({"status": "success", "updated_task_id": task_id})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/update-plan-with-actuals", methods=["POST"])
@require_auth
def update_plan_with_actuals():
    """Update weekly plan HTML with actual data from history.yml."""
    try:
        data = request.json or {}
        week_str = data.get('week')

        if not week_str:
            # Try to get current week from DB
            active_plan = storage.StorageEngine.get_active_week()
            if active_plan:
                week_str = active_plan['week_of']
            else:
                return jsonify({"status": "error", "message": "Week required and no active week found"}), 400

        # Check if week exists in DB history
        history = storage.StorageEngine.get_history()
        week_history = find_week(history, week_str)
        if not week_history:
            return jsonify({"status": "error", "message": f"Week {week_str} not found in database"}), 404

        # Run the update script (Legacy fallback if HTML still needed)
        try:
            import subprocess
            subprocess.run(
                ['python3', 'scripts/update_plan_with_actuals.py', week_str],
                capture_output=True,
                text=True,
                timeout=30
            )
        except Exception:
            pass

        plan_url = f"/plans/{week_str}-weekly-plan.html"

        return jsonify({
            "status": "success",
            "message": f"Successfully updated plan for week {week_str} with actual data",
            "week_of": week_str,
            "plan_url": plan_url
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
