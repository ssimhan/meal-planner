from datetime import datetime
from flask import Blueprint, jsonify, request
from api.utils import storage, invalidate_cache
from api.utils.auth import require_auth
import json

reviews_bp = Blueprint('reviews', __name__)

@reviews_bp.route("/api/reviews/last_week", methods=["GET"])
@require_auth
def get_last_week_review_data():
    """
    Fetch the most recent 'active' or 'archived' week for review.
    Used for Step 0 of the planning workflow.
    """
    try:
        h_id = storage.get_household_id()
        
        # specific logic: Get the latest week that isn't 'planning' (i.e. the one we just finished or are finishing)
        # We assume the user is starting a NEW week, so we want the PREVIOUS chronological week.
        res = storage.supabase.table("meal_plans") \
            .select("*") \
            .eq("household_id", h_id) \
            .neq("status", "planning") \
            .order("week_of", desc=True) \
            .limit(1) \
            .execute()
            
        if not res.data:
            return jsonify({
                "status": "success", 
                "message": "No prior weeks found to review.",
                "week": None
            })
            
        week_record = res.data[0]
        week_str = week_record['week_of']
        plan_data = week_record.get('plan_data', {})
        history_data = week_record.get('history_data', {})
        
        # We need to construct a review payload that combines plan vs actual
        # Return list of dinners for Mon-Sun
        
        days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        review_days = []
        
        # Helper to find dinner in plan
        planned_dinners = {d.get('day'): d for d in plan_data.get('dinners', [])}
        actual_dinners = {d.get('day'): d for d in history_data.get('dinners', [])}
        
        for day in days:
            p_dinner = planned_dinners.get(day)
            a_dinner = actual_dinners.get(day)
            
            day_obj = {
                "day": day,
                "planned_recipe_id": p_dinner.get('recipe_id') if p_dinner else None,
                "planned_recipe_name": p_dinner.get('name') if p_dinner else ("Make at home" if day in ['sat', 'sun'] else None),
                "made": a_dinner.get('made') if a_dinner else None,
                "actual_meal": a_dinner.get('actual_meal') if a_dinner else None,
                "leftovers": False # Default, user will check this
            }
            review_days.append(day_obj)
            
        return jsonify({
            "status": "success",
            "week_of": week_str,
            "days": review_days
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@reviews_bp.route("/api/reviews/submit", methods=["POST"])
@require_auth
def submit_review():
    """
    Submit the review for a past week.
    1. Updates history (made/skipped status).
    2. Adds specific leftovers to inventory (Step 0 output).
    3. Archives the week if it wasn't already.
    """
    try:
        data = request.json or {}
        week_str = data.get('week_of')
        reviews = data.get('reviews', []) # list of {day, made, actual_meal, leftovers_note}
        
        if not week_str:
            return jsonify({"status": "error", "message": "Week required"}), 400
            
        h_id = storage.get_household_id()
        
        # 1. Fetch existing record
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_str).single().execute()
        if not res.data:
            return jsonify({"status": "error", "message": "Week not found"}), 404
            
        record = res.data
        history_data = record.get('history_data', {})
        if 'dinners' not in history_data: history_data['dinners'] = []
        
        # 2. Process Reviews
        leftovers_to_add = []
        
        for rev in reviews:
            day = rev.get('day')
            # Update History
            # Find existing dinner entry or create one
            target_dinner = next((d for d in history_data['dinners'] if d.get('day') == day), None)
            if not target_dinner:
                target_dinner = {'day': day}
                history_data['dinners'].append(target_dinner)
                
            # Update status
            made_val = rev.get('made') # boolean or string
            target_dinner['made'] = made_val
            if rev.get('actual_meal'):
                target_dinner['actual_meal'] = rev.get('actual_meal')
                
            # Collect Leftovers
            if rev.get('leftovers'):
                # leftovers is boolean? Or the note string?
                # User prompt: "If 'Leftovers': Prompt to add to Fridge Inventory"
                # Let's assume the UI sends 'leftovers_note' if checked
                note = rev.get('leftovers_note')
                if note:
                    leftovers_to_add.append(note)
                    
        # 3. Update Inventory (Add Leftovers)
        added_items = []
        if leftovers_to_add:
            for item_name in leftovers_to_add:
                # Add to inventory (category: fridge, or maybe a new 'leftovers' category?)
                # Stick to 'fridge' for now as 'leftovers' isn't standard in the YAML/Schema yet
                storage.StorageEngine.update_inventory_item(
                    'fridge', 
                    item_name, 
                    updates={'added': datetime.now().strftime('%Y-%m-%d'), 'is_leftover': True}
                )
                added_items.append(item_name)
        
        # 4. Archive the week (Transition status)
        # Only archive if it was 'active'. If it was already 'archived', keep it.
        params = {"history_data": history_data}
        if record.get('status') == 'active':
            params['status'] = 'archived'
            
        storage.StorageEngine.update_meal_plan(week_str, **params)
        invalidate_cache()
        
        return jsonify({
            "status": "success", 
            "message": "Review submitted successfully",
            "added_leftovers": added_items
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
