import os
import yaml
from pathlib import Path
from datetime import datetime
from flask import Blueprint, jsonify, request
from scripts.workflow import (
    generate_meal_plan, replan_meal_plan
)
from scripts.workflow.actions import create_new_week
from api.utils import storage, invalidate_cache
from api.utils.auth import require_auth
from scripts import log_execution

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
        
        # 1. Fetch contexts from DB
        history = storage.StorageEngine.get_history()
        # We need the full recipe details for generation (with main_veg, etc.)
        all_recipes_res = storage.supabase.table("recipes").select("id, name, metadata").eq("household_id", h_id).execute()
        all_recipes = [
            {
                "id": r['id'],
                "name": r['name'],
                **(r.get('metadata') or {})
            } for r in all_recipes_res.data
        ]
        
        # 2. Run Database-First Generation Logic
        # We still pass data directly. input_file=None means skip file writing.
        new_data, new_history = generate_meal_plan(
            input_file=None, 
            data=data,
            recipes_list=all_recipes,
            history_dict=history
        )
        
        # 3. Save back to DB
        # Find the specific week in history to update
        current_history_week = next((w for w in new_history.get('weeks', []) if w.get('week_of') == week_str), None)
        
        storage.StorageEngine.update_meal_plan(
            week_str, 
            plan_data=new_data, 
            history_data=current_history_week,
            status='active' # Generation marks it as active
        )
        
        invalidate_cache()
            
        return jsonify({
            "status": "success",
            "message": f"Successfully generated plan for week of {week_str}",
            "week_of": week_str
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/plan/draft", methods=["POST"])
@require_auth
def generate_draft_route():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        locked_days = data.get('locked_days', []) # ['mon', ' tue']
        
        h_id = storage.get_household_id()
        
        # 1. Fetch current plan
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_of).execute()
        if not res.data or len(res.data) == 0:
             return jsonify({"status": "error", "message": f"Week {week_of} not found"}), 404
        
        active_plan = res.data[0]
        plan_data = active_plan['plan_data']
        history_week = active_plan['history_data'] or {'week_of': week_of, 'dinners': []}
        
        # 1b. Selective Replanning: Clear unlocked days from history
        # If locked_days is provided (even if empty list), we assume this is a regeneration request
        # and we should clear anything NOT locked.
        if 'locked_days' in data:
            current_dinners = history_week.get('dinners', [])
            # Keep only dinners that are in locked_days
            history_week['dinners'] = [d for d in current_dinners if d.get('day') in locked_days]

        # 2. Apply manual selections to history_week
        # This ensures the generation logic respects these choices
        days_covered = set()
        for selection in selections:
            day = selection.get('day')
            recipe_id = selection.get('recipe_id')
            if not day or not recipe_id: continue
            
            day_abbr = day.lower()[:3]
            days_covered.add(day_abbr)
            
            # Find and update or add
            found = False
            for dinner in history_week.get('dinners', []):
                if dinner.get('day') == day_abbr:
                    dinner['recipe_id'] = recipe_id
                    found = True
                    break
            if not found:
                history_week.setdefault('dinners', []).append({
                    'day': day_abbr,
                    'recipe_id': recipe_id
                })

        # 3. Fetch all contexts for generation
        history = storage.StorageEngine.get_history()
        # Ensure the current history week in the full history object is also updated
        updated_any = False
        for w in history.get('weeks', []):
            if w.get('week_of') == week_of:
                w['dinners'] = history_week['dinners']
                updated_any = True
                break
        if not updated_any:
            history.setdefault('weeks', []).append(history_week)

        all_recipes_res = storage.supabase.table("recipes").select("id, name, metadata").eq("household_id", h_id).execute()
        all_recipes = [{"id": r['id'], "name": r['name'], **(r.get('metadata') or {})} for r in all_recipes_res.data]
        
        # 4. Generate the rest of the plan
        new_plan_data, new_history = generate_meal_plan(
            input_file=None, 
            data=plan_data,
            recipes_list=all_recipes,
            history_dict=history
        )
        
        # 5. Extract the generated week's history
        current_history_week = next((w for w in new_history.get('weeks', []) if w.get('week_of') == week_of), None)
        
        # 6. Save back to DB as 'planning' (not active yet)
        storage.StorageEngine.update_meal_plan(
            week_of, 
            plan_data=new_plan_data, 
            history_data=current_history_week,
            status='planning' 
        )
        
        invalidate_cache()
            
        return jsonify({
            "status": "success",
            "message": f"Generated draft plan for {week_of}",
            "plan_data": new_plan_data,
            "history_data": current_history_week
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/plan/shopping-list", methods=["GET"])
@require_auth
def get_shopping_list_route():
    try:
        week_of = request.args.get('week_of')
        if not week_of:
            return jsonify({"status": "error", "message": "week_of parameter required"}), 400
            
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("plan_data, history_data").eq("household_id", h_id).eq("week_of", week_of).execute()
        
        if not res.data:
            return jsonify({"status": "error", "message": f"No plan found for week {week_of}"}), 404
            
        plan_data = res.data[0].get('plan_data') or {}
        history_data = res.data[0].get('history_data') or {}
        
        from scripts.inventory_intelligence import get_shopping_list
        # During planning, plan_data is often more up-to-date in the DB
        data_to_use = plan_data if plan_data.get('dinners') else history_data
        shopping_list = get_shopping_list(data_to_use)
        
        return jsonify({
            "status": "success",
            "shopping_list": shopping_list
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/plan/finalize", methods=["POST"])
@require_auth
def finalize_plan_route():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        if not week_of:
            return jsonify({"status": "error", "message": "week_of required"}), 400
            
        h_id = storage.get_household_id()
        
        # Update status to active
        storage.StorageEngine.update_meal_plan(
            week_of,
            status='active'
        )
        
        invalidate_cache()
        
        return jsonify({
            "status": "success",
            "message": f"Plan for {week_of} is now active!"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/create-week", methods=["POST"])
@require_auth
def create_week():
    try:
        data = request.json or {}
        week_str = data.get('week_of')
        
        # 1. Fetch Latest Data for Proposal
        h_id = storage.get_household_id()
        history = storage.StorageEngine.get_history()
        all_recipes_res = storage.supabase.table("recipes").select("id, name, metadata").eq("household_id", h_id).execute()
        all_recipes = [{"id": r['id'], "name": r['name'], **(r.get('metadata') or {})} for r in all_recipes_res.data]
        
        # Load config from DB (or fallback to file for now)
        from api.routes.status import _load_config
        config = _load_config()
        
        # 2. Run Database-First Initialization
        new_plan_data = create_new_week(
            week_str, 
            history_dict=history, 
            recipes_list=all_recipes, 
            config_dict=config
        )
        
        # 3. Initialize in DB
        storage.StorageEngine.update_meal_plan(
            week_str, 
            plan_data=new_plan_data, 
            history_data={'week_of': week_str, 'dinners': []}, 
            status='planning'
        )
        
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
        
        # Extract optional notes
        req_data = request.json or {}
        notes = req_data.get('notes')
        
        # 1. Fetch Latest Data from Supabase
        inventory = storage.StorageEngine.get_inventory()
        history = storage.StorageEngine.get_history()
        # active_plan['plan_data'] and active_plan['history_data'] are already loaded
        
        # 2. Run Database-First Replan Logic
        new_plan_data, new_history_data = replan_meal_plan(
            input_file=None, 
            data=active_plan['plan_data'],
            inventory_dict=inventory,
            history_dict=history,
            notes=notes
        )
        
        if new_plan_data and new_history_data:
            # 3. Save directly to DB
            storage.StorageEngine.update_meal_plan(
                week_str, 
                plan_data=new_plan_data, 
                history_data=new_history_data
            )
            invalidate_cache()
            return jsonify({"status": "success", "message": "Plan updated based on execution and latest inventory"})
        else:
            return jsonify({"status": "error", "message": "Replanning logic returned no data. Ensure week history exists."}), 400
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
        outside_leftover_name = data.get('outside_leftover_name')
        outside_leftover_qty = data.get('outside_leftover_qty')

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
        
        confirm_day = data.get('confirm_day', False)
        
        # Logic to skip made check if strictly feedback
        is_feedback_only = (school_snack_feedback or home_snack_feedback or kids_lunch_feedback or adult_lunch_feedback or
                            school_snack_needs_fix is not None or home_snack_needs_fix is not None or
                            kids_lunch_needs_fix is not None or adult_lunch_needs_fix is not None) and not made and not confirm_day

        if not is_feedback_only or dinner_needs_fix is not None or actual_meal or confirm_day:
             for d in history_week.get('dinners', []):
                 if d.get('day') == target_day:
                     target_dinner = d
                     break
             
             if not target_dinner:
                 target_dinner = {'day': target_day, 'recipe_id': 'unplanned_meal', 'cuisine': 'various', 'vegetables': []}
                 history_week.setdefault('dinners', []).append(target_dinner)

             # Update execution data
             if confirm_day:
                 # Only update if not already marked
                 if target_dinner.get('made') is None:
                    target_dinner['made'] = True
             elif str(made).lower() in ('yes', 'true', '1', 'y'): target_dinner['made'] = True
             elif str(made).lower() in ('no', 'false', '0', 'n'): target_dinner['made'] = False
             elif str(made).lower() in ('freezer', 'backup'): target_dinner['made'] = 'freezer_backup'
             elif str(made).lower() == 'outside_meal' or str(made).lower() == 'ate_out': target_dinner['made'] = 'outside_meal'
             elif str(made).lower() == 'leftovers': 
                 target_dinner['made'] = False
                 target_dinner['actual_meal'] = "Leftovers"
             else: target_dinner['made'] = made
        
        if not is_feedback_only or confirm_day:
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
            (prep_completed and len(prep_completed) > 0) or confirm_day):
            
            day_fb = history_week.setdefault('daily_feedback', {}).setdefault(target_day, {})
            
            if confirm_day:
                # Mark all as made if not already set
                if 'school_snack_made' not in day_fb: day_fb['school_snack_made'] = True
                if 'home_snack_made' not in day_fb: day_fb['home_snack_made'] = True
                if 'kids_lunch_made' not in day_fb: day_fb['kids_lunch_made'] = True
                if 'adult_lunch_made' not in day_fb: day_fb['adult_lunch_made'] = True
            
            if school_snack_feedback is not None: day_fb['school_snack'] = school_snack_feedback
            if school_snack_made is not None: day_fb['school_snack_made'] = school_snack_made
            if home_snack_feedback is not None: day_fb['home_snack'] = home_snack_feedback
            if home_snack_made is not None: day_fb['home_snack_made'] = home_snack_made
            if kids_lunch_feedback is not None: day_fb['kids_lunch'] = kids_lunch_feedback
            if kids_lunch_made is not None: day_fb['kids_lunch_made'] = kids_lunch_made
            if adult_lunch_feedback is not None: day_fb['adult_lunch'] = adult_lunch_feedback
            if adult_lunch_made is not None: day_fb['adult_lunch_made'] = adult_lunch_made
            
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

            if outside_leftover_name:
                qty = outside_leftover_qty or 1
                storage.StorageEngine.update_inventory_item('fridge', f"Leftover {outside_leftover_name}", updates={'quantity': qty, 'unit': 'serving', 'type': 'meal'})

            log_execution.calculate_adherence(history_week)

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
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_str).execute()
        if not res.data or len(res.data) == 0:
            return jsonify({"status": "error", "message": f"Meal plan for week {week_str} not found"}), 404
        
        plan_record = res.data[0]
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
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_str).execute()
        if not res.data or len(res.data) == 0:
            return jsonify({"status": "error", "message": "Meal plan not found"}), 404
            
        history_week = res.data[0]['history_data']
        
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
        from scripts import log_execution # Safety import
        history = storage.StorageEngine.get_history()
        week_history = log_execution.find_week(history, week_str)
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

        return jsonify({"status": "success", "message": f"Successfully updated plan for week {week_str} with actual data", "week_of": week_str, "plan_url": plan_url})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/wizard/state", methods=["POST"])
@require_auth
def save_wizard_state():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        wizard_state = data.get('state', {})
        
        if not week_of:
            return jsonify({"status": "error", "message": "week_of required"}), 400

        h_id = storage.get_household_id()
        
        # 1. Fetch existing plan
        res = storage.supabase.table("meal_plans").select("plan_data").eq("household_id", h_id).eq("week_of", week_of).execute()
        
        current_plan_data = {}
        if res.data and len(res.data) > 0:
            current_plan_data = res.data[0]['plan_data'] or {}
            
        # 2. Merge Wizard State
        current_plan_data['wizard_state'] = wizard_state
        
        # 3. Save
        storage.StorageEngine.update_meal_plan(week_of, plan_data=current_plan_data)
        
        return jsonify({"status": "success", "message": "Wizard state saved"})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@meals_bp.route("/api/wizard/state", methods=["GET"])
@require_auth
def get_wizard_state():
    try:
        week_of = request.args.get('week_of')
        if not week_of:
            return jsonify({"status": "error", "message": "week_of required"}), 400
            
        h_id = storage.get_household_id()
        res = storage.supabase.table("meal_plans").select("plan_data").eq("household_id", h_id).eq("week_of", week_of).execute()
        
        if not res.data or len(res.data) == 0:
             return jsonify({"status": "success", "state": None})
             
        plan_data = res.data[0].get('plan_data') or {}
        return jsonify({"status": "success", "state": plan_data.get('wizard_state')})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
@meals_bp.route("/api/delete-week", methods=["POST"])
@require_auth
def delete_week():
    try:
        data = request.json or {}
        week_of = data.get('week_of')
        if not week_of:
            return jsonify({"status": "error", "message": "week_of required"}), 400
            
        h_id = storage.get_household_id()
        storage.supabase.table("meal_plans").delete().eq("household_id", h_id).eq("week_of", week_of).execute()
        
        invalidate_cache()
        return jsonify({"status": "success", "message": f"Deleted week {week_of}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
