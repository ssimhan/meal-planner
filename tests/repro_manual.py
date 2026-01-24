
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from api.utils.meal_resolution import resolve_slot, ADHERENCE_STATES

def test_manual_entry_empty_day():
    print("Testing resolve_slot with manual entry on empty day...")
    
    plan_item = None # Nothing planned
    
    # Manual entry: made=True, actual_meal="Pizza"
    actual_item = {
        'day': 'mon', 
        'recipe_id': 'unplanned_meal', # log_meal sets this default
        'made': True, 
        'actual_meal': 'Pizza'
    }
    
    result = resolve_slot(plan_item, actual_item)
    print(f"Result Adherence: {result['adherence']}")
    print(f"Result Resolved: {result['resolved']}")
    
    if result['adherence'] == 'UNPLANNED':
        print("[SUCCESS] Correctly identified as UNPLANNED")
    else:
        print(f"[FAILURE] Unexpected adherence: {result['adherence']}")

    # Test Case 2: Manual entry overwriting an existing plan
    print("\nTesting resolve_slot with manual entry overwriting plan...")
    plan_item_2 = {'day': 'tue', 'recipe_id': 'salad', 'meal_type': 'dinner'}
    actual_item_2 = {
        'day': 'tue',
        'recipe_id': 'salad', 
        'made': True,
        'actual_meal': 'Burger' # User manually entered Burger
    }
    
    result_2 = resolve_slot(plan_item_2, actual_item_2)
    print(f"Result Adherence: {result_2['adherence']}")
    
    if result_2['adherence'] == 'SUBSTITUTED':
         print("[SUCCESS] Correctly identified as SUBSTITUTED")
    else:
         print(f"[FAILURE] Unexpected adherence: {result_2['adherence']}")

if __name__ == "__main__":
    test_manual_entry_empty_day()
