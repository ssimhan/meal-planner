from datetime import datetime

# Adherence States
ADHERENCE_STATES = {
    'ADHERED': 'ADHERED',
    'SUBSTITUTED': 'SUBSTITUTED',
    'SKIPPED': 'SKIPPED',
    'NOT_LOGGED': 'NOT_LOGGED',
    'UNPLANNED': 'UNPLANNED',
    'EMPTY': 'EMPTY'
}

def resolve_slot(plan_item, actual_item):
    """
    Resolves a single meal slot based on plan and actual data.
    
    Args:
        plan_item (dict): The planned meal object (or None).
        actual_item (dict): The actual logged meal object (or None).
        
    Returns:
        dict: A dictionary containing 'plan', 'actual', 'resolved', and 'adherence'.
    """
    
    resolved = None
    adherence = ADHERENCE_STATES['EMPTY']
    
    # 1. Determine Adherence State & Resolved Meal
    if actual_item:
        if actual_item.get('made') is False or actual_item.get('made') == 'False':
             # Explicitly Skipped
             adherence = ADHERENCE_STATES['SKIPPED']
             resolved = None # Empty if skipped
        elif not plan_item:
            # Unplanned but eaten
            adherence = ADHERENCE_STATES['UNPLANNED']
            resolved = actual_item
        else:
            # Plan exists and Actual exists (and not skipped)
            # Check for substitution
            # We compare loosely based on recipe_id or name if available
            plan_id = plan_item.get('recipe_id')
            actual_id = actual_item.get('recipe_id') or actual_item.get('actual_meal')
            
            # Normalize for comparison if possible, but keep it simple for now
            # If actual explicitly says "actual_meal" string, it might differ from plan key
            
            if actual_item.get('made') is True or actual_item.get('made') == 'True' or actual_item.get('made') == 'freezer_backup':
                 # Consider it adhered if it matches, substituted otherwise.
                 # However, the user request says: 
                 # "ADHERED: actual meal matches planned meal"
                 # "SUBSTITUTED: actual meal differs from planned meal"
                 
                 # Logic: If actual_item has a distinct 'actual_meal' text that differs from plan, or explicit 'substituted' flag (not currently in data model but inferred)
                 
                 # In existing data, 'actual_meal' is often set when it differs. 
                 # If 'actual_meal' matches 'recipe_id' loosely, it is adherence.
                 
                 p_name = (plan_id or '').lower().replace('_', ' ')
                 a_name = (str(actual_item.get('actual_meal') or actual_item.get('recipe_id') or '')).lower().replace('_', ' ')
                 
                 # Detailed check: 
                 # If made=True and actual_meal is provided and substantially different -> Sub
                 # If made=True and actual_meal is same or empty -> Adhered
                 
                 if p_name and a_name and p_name != a_name and actual_item.get('actual_meal'):
                     adherence = ADHERENCE_STATES['SUBSTITUTED']
                 elif actual_item.get('made') == 'freezer_backup':
                     # Freezer backup is a form of substitution usually, unless planned?
                     # Let's count it as SUBSTITUTE for now unless plan was freezer
                     if plan_item.get('meal_type') == 'freezer':
                         adherence = ADHERENCE_STATES['ADHERED']
                     else:
                         adherence = ADHERENCE_STATES['SUBSTITUTED']
                 elif actual_item.get('made') == 'outside_meal':
                      adherence = ADHERENCE_STATES['SUBSTITUTED']
                 else:
                     adherence = ADHERENCE_STATES['ADHERED']
            
            resolved = actual_item

    elif plan_item:
        # Plan exists, no actual
        adherence = ADHERENCE_STATES['NOT_LOGGED']
        resolved = plan_item
    else:
        # No plan, no actual
        adherence = ADHERENCE_STATES['EMPTY']
        resolved = None

    return {
        'plan': plan_item,
        'actual': actual_item,
        'resolved': resolved,
        'adherence': adherence
    }

def resolve_week(plan_data, history_data):
    """
    Merges plan and history data for a full week.
    
    Args:
        plan_data (dict): The 'plan_data' from DB.
        history_data (dict): The 'history_data' from DB.
        
    Returns:
        dict: A dictionary with 'slots' keyed by 'day_mealtype'.
    """
    slots = {}
    days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    
    # 1. Structure Definitions (Target slots)
    # We mainly track dinners strictly, but can expand to others.
    # Current requirement emphasizes "meal slot defined by date + meal type".
    # For MVP of this refactor, we focus on Dinners as they have the most complex logic.
    
    p_dinners = {d['day']: d for d in plan_data.get('dinners', [])} if plan_data else {}
    h_dinners = {d['day']: d for d in history_data.get('dinners', [])} if history_data else {}
    
    # Lunches and Snacks Plan Data
    p_lunches = plan_data.get('selected_lunches') or {}
    p_snacks = plan_data.get('snacks') or {}
    
    # History data (Activity)
    h_feedback = history_data.get('daily_feedback') or {}
    
    for day in days:
        # 1. DINNER
        slot_key = f"{day}_dinner"
        p_item = p_dinners.get(day)
        h_item = h_dinners.get(day)
        slots[slot_key] = resolve_slot(p_item, h_item)
        
        # 2. KIDS LUNCH
        p_lunch_raw = p_lunches.get(day)
        p_item_kl = None
        if p_lunch_raw:
            # Robustness: handle legacy string lunch plans
            recipe_name = p_lunch_raw.get('recipe_name') if isinstance(p_lunch_raw, dict) else str(p_lunch_raw)
            p_item_kl = {
                'day': day, 
                'recipe_id': recipe_name, 
                'meal_type': 'kids_lunch'
            }
            
        # Extract actuals from feedback
        day_fb = h_feedback.get(day, {})
        h_item_kl = None
        if 'kids_lunch' in day_fb or 'kids_lunch_made' in day_fb:
            h_item_kl = {
                'day': day,
                'actual_meal': day_fb.get('kids_lunch'),
                'made': day_fb.get('kids_lunch_made'),
                'meal_type': 'kids_lunch'
            }
            
        slots[f"{day}_kids_lunch"] = resolve_slot(p_item_kl, h_item_kl)
        
        # 3. ADULT LUNCH
        # Assumes adult lunch follows kids lunch plan unless specified otherwise? 
        # Usually it's leftovers or same. For now, we only track actuals if logged.
        p_item_al = None # Does plan have explicit adult lunch? Usually implied as leftovers.
        
        h_item_al = None
        if 'adult_lunch' in day_fb or 'adult_lunch_made' in day_fb:
            h_item_al = {
                'day': day,
                'actual_meal': day_fb.get('adult_lunch'),
                'made': day_fb.get('adult_lunch_made'),
                'meal_type': 'adult_lunch'
            }
        # Only create slot if there's activity? Or always?
        # Let's always create it so UI can show "Not planned" or "Leftovers" defaults
        slots[f"{day}_adult_lunch"] = resolve_slot(p_item_al, h_item_al)

        # 4. SCHOOL SNACK
        p_snack_school = p_snacks.get(day, {}).get('school') if isinstance(p_snacks.get(day), dict) else None
        p_item_ss = {'day': day, 'recipe_id': p_snack_school, 'meal_type': 'school_snack'} if p_snack_school else None
        
        h_item_ss = None
        if 'school_snack' in day_fb or 'school_snack_made' in day_fb:
            h_item_ss = {
                'day': day,
                'actual_meal': day_fb.get('school_snack'),
                'made': day_fb.get('school_snack_made'),
                'meal_type': 'school_snack'
            }
        slots[f"{day}_school_snack"] = resolve_slot(p_item_ss, h_item_ss)

        # 5. HOME SNACK
        p_snack_home = p_snacks.get(day, {}).get('home') if isinstance(p_snacks.get(day), dict) else None
        p_item_hs = {'day': day, 'recipe_id': p_snack_home, 'meal_type': 'home_snack'} if p_snack_home else None
        
        h_item_hs = None
        if 'home_snack' in day_fb or 'home_snack_made' in day_fb:
            h_item_hs = {
                'day': day,
                'actual_meal': day_fb.get('home_snack'),
                'made': day_fb.get('home_snack_made'),
                'meal_type': 'home_snack'
            }
        slots[f"{day}_home_snack"] = resolve_slot(p_item_hs, h_item_hs)
    
    return slots
