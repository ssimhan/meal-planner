"""
Meal logging service layer.
Extracted from meals.py (TD-009) to reduce route handler complexity.
"""
from datetime import datetime
from api.utils import storage, invalidate_cache


def parse_made_status(made_value):
    """
    Parse the 'made' field value into a normalized status.
    Returns: True, False, 'freezer_backup', 'outside_meal', 'leftovers', or the original value.
    """
    if made_value is None:
        return None
    
    made_str = str(made_value).lower()
    
    if made_str in ('yes', 'true', '1', 'y'):
        return True
    elif made_str in ('no', 'false', '0', 'n'):
        return False
    elif made_str in ('freezer', 'backup'):
        return 'freezer_backup'
    elif made_str in ('outside_meal', 'ate_out'):
        return 'outside_meal'
    elif made_str == 'leftovers':
        return 'leftovers'
    else:
        return made_value


def find_or_create_dinner(history_week, target_day, active_plan_data):
    """
    Find existing dinner for a day or create a new one.
    Returns: (target_dinner dict, was_created bool)
    """
    for d in history_week.get('dinners', []):
        if d.get('day') == target_day:
            return d, False
    
    # Not found, create new
    planned_recipe_ids = ['unplanned_meal']
    if active_plan_data and 'dinners' in active_plan_data:
        for pd in active_plan_data['dinners']:
            if pd.get('day') == target_day:
                ids = pd.get('recipe_ids')
                if not ids and pd.get('recipe_id'):
                    ids = [pd.get('recipe_id')]
                planned_recipe_ids = ids if ids else ['unplanned_meal']
                break
    
    target_dinner = {
        'day': target_day,
        'recipe_ids': planned_recipe_ids,
        'cuisine': 'various',
        'vegetables': []
    }
    history_week.setdefault('dinners', []).append(target_dinner)
    return target_dinner, True


def update_dinner_feedback(target_dinner, data, history_week):
    """
    Update dinner with feedback data (vegetables, kids feedback, complaints).
    """
    vegetables = data.get('vegetables')
    kids_feedback = data.get('kids_feedback')
    kids_complaints = data.get('kids_complaints')
    reason = data.get('reason')
    
    if vegetables:
        v_list = [v.strip() for v in vegetables.split(',')]
        target_dinner['vegetables_used'] = v_list
        
        # Inventory updates (Subtract from fridge in DB)
        for veg in v_list:
            storage.StorageEngine.update_inventory_item('fridge', veg, delete=True)

    if kids_feedback:
        target_dinner['kids_feedback'] = kids_feedback
        
    if kids_complaints:
        target_dinner['kids_complaints'] = kids_complaints
        
        ids = target_dinner.get('recipe_ids') or []
        if not ids and target_dinner.get('recipe_id'):
            ids = [target_dinner.get('recipe_id')]
        first_id = ids[0] if ids else 'unknown'

        history_week.setdefault('kids_dislikes', []).append({
            'complaint': kids_complaints,
            'date': datetime.now().strftime('%Y-%m-%d'),
            'recipe': first_id
        })
        
    if reason:
        target_dinner['reason'] = reason


def update_daily_feedback(history_week, target_day, data, confirm_day=False):
    """
    Update daily feedback for snacks and lunches.
    """
    day_fb = history_week.setdefault('daily_feedback', {}).setdefault(target_day, {})
    
    if confirm_day:
        # Mark all as made if not already set
        if 'school_snack_made' not in day_fb:
            day_fb['school_snack_made'] = True
        if 'home_snack_made' not in day_fb:
            day_fb['home_snack_made'] = True
        if 'kids_lunch_made' not in day_fb:
            day_fb['kids_lunch_made'] = True
        if 'adult_lunch_made' not in day_fb:
            day_fb['adult_lunch_made'] = True
    
    # Map of field names to data keys
    field_mappings = [
        ('school_snack', 'school_snack_feedback'),
        ('school_snack_made', 'school_snack_made'),
        ('home_snack', 'home_snack_feedback'),
        ('home_snack_made', 'home_snack_made'),
        ('kids_lunch', 'kids_lunch_feedback'),
        ('kids_lunch_made', 'kids_lunch_made'),
        ('adult_lunch', 'adult_lunch_feedback'),
        ('adult_lunch_made', 'adult_lunch_made'),
        ('school_snack_needs_fix', 'school_snack_needs_fix'),
        ('home_snack_needs_fix', 'home_snack_needs_fix'),
        ('kids_lunch_needs_fix', 'kids_lunch_needs_fix'),
        ('adult_lunch_needs_fix', 'adult_lunch_needs_fix'),
    ]
    
    for fb_key, data_key in field_mappings:
        value = data.get(data_key)
        if value is not None:
            day_fb[fb_key] = value
    
    # Handle prep completed
    prep_completed = data.get('prep_completed', [])
    if prep_completed:
        existing = set(day_fb.get('prep_completed', []))
        for t in prep_completed:
            if t not in existing:
                day_fb.setdefault('prep_completed', []).append(t)
                existing.add(t)
    
    return day_fb


def update_inventory_from_meal(target_dinner, data, h_id):
    """
    Update inventory based on meal logging (freezer, leftovers, etc).
    """
    made_2x = data.get('made_2x', False)
    freezer_meal = data.get('freezer_meal')
    outside_leftover_name = data.get('outside_leftover_name')
    outside_leftover_qty = data.get('outside_leftover_qty')
    leftovers_created = data.get('leftovers_created')
    
    if made_2x:
        target_dinner['made_2x_for_freezer'] = True
        ids = target_dinner.get('recipe_ids') or []
        if not ids and target_dinner.get('recipe_id'):
            ids = [target_dinner.get('recipe_id')]
        first_name = ids[0].replace('_', ' ').title() if ids else 'Unknown'
        storage.StorageEngine.update_inventory_item(
            'freezer_backup', first_name, 
            updates={'servings': 4, 'frozen_date': datetime.now().strftime('%Y-%m-%d')}
        )
    
    if freezer_meal and target_dinner.get('made') == 'freezer_backup':
        target_dinner['freezer_used'] = {'meal': freezer_meal, 'frozen_date': 'Unknown'}
        storage.StorageEngine.update_inventory_item('freezer_backup', freezer_meal, delete=True)

    if outside_leftover_name:
        qty = outside_leftover_qty or 1
        storage.StorageEngine.update_inventory_item(
            'fridge', f"Leftover {outside_leftover_name}", 
            updates={'quantity': qty, 'unit': 'serving', 'type': 'meal'}
        )

    if leftovers_created and leftovers_created != 'None':
        qty = 1
        if '1' in leftovers_created:
            qty = 1
        elif '2' in leftovers_created:
            qty = 2
        elif 'Batch' in leftovers_created:
            qty = 4
        
        ids = target_dinner.get('recipe_ids') or []
        if not ids and target_dinner.get('recipe_id'):
            ids = [target_dinner.get('recipe_id')]
        first_name = ids[0].replace('_', ' ').title() if ids else 'Unknown'
        
        storage.StorageEngine.update_inventory_item(
            'fridge', f"Leftover {first_name}", 
            updates={'quantity': qty, 'unit': 'serving', 'type': 'meal'}
        )


def auto_add_recipe_from_meal(actual_meal, h_id):
    """
    Automatically add a recipe record from an actual meal correction.
    """
    try:
        recipe_id = actual_meal.lower().replace(' ', '_')
        # Check if it exists first
        query = storage.supabase.table("recipes").select("id").eq("household_id", h_id).eq("id", recipe_id)
        existing = storage.execute_with_retry(query)
        
        if not existing.data:
            # Infer cuisine
            cuisine = "unknown"
            if "rice" in actual_meal.lower() or "sambar" in actual_meal.lower():
                cuisine = "Indian"
            
            query = storage.supabase.table("recipes").insert({
                "id": recipe_id,
                "household_id": h_id,
                "name": actual_meal,
                "metadata": {
                    "cuisine": cuisine,
                    "meal_type": "dinner",
                    "effort_level": "normal"
                },
                "content": f"# {actual_meal}\n\nAdded automatically from meal correction."
            })
            storage.execute_with_retry(query)
            return True
    except Exception as e:
        print(f"Error auto-adding recipe: {e}")
    return False
