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
    
    for day in days:
        slot_key = f"{day}_dinner"
        
        p_item = p_dinners.get(day)
        h_item = h_dinners.get(day)
        
        slots[slot_key] = resolve_slot(p_item, h_item)
        
    # TODO: Expand to lunches/snacks if they follow the same strict "plan object" structure.
    # Currently lunches/snacks are often just strings or simple dicts in plan_data['selected_lunches'] etc.
    # For now, we return the robust slots for dinners.
    
    return slots
