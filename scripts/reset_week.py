import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.utils.storage import supabase, IS_SERVICE_ROLE

TARGET_WEEK = '2026-01-26'
HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001' # Default for now, matched storage.py default


def reset_from_week(target_week, interactive=True):
    """
    Deletes all meal plans from target_week onwards.
    If interactive=True, asks for confirmation on CLI.
    Returns number of deleted records.
    """
    print(f"\n[RESET TOOL] Targeting weeks >= {target_week}")
    
    if not supabase:
        print("Error: Supabase client not initialized.")
        return 0

    try:
        # 1. Fetch Matching Plans
        res = supabase.table("meal_plans").select("id, week_of, status")\
            .gte("week_of", target_week)\
            .order("week_of")\
            .execute()
        
        if not res.data:
            print(f"No meal plans found for week {target_week} or later.")
            return 0

        # 2. List Plans
        ids_to_delete = []
        if interactive:
            print(f"Found {len(res.data)} plans to delete:")
        
        for plan in res.data:
            if interactive:
                print(f" [DELETE] Week: {plan['week_of']} | Status: {plan['status']} | ID: {plan['id']}")
            ids_to_delete.append(plan['id'])
        
        # 3. Confirm Action (if interactive)
        if interactive:
            confirm = input(f"\nWARNING: This will permanently delete {len(ids_to_delete)} plans. Are you sure? (y/n): ")
            if confirm.lower() != 'y':
                print("Operation aborted.")
                return 0

        # 4. Execute Delete
        print("\nDeleting..." if interactive else f"Deleting {len(ids_to_delete)} plans via API...")
        del_res = supabase.table("meal_plans").delete().in_("id", ids_to_delete).execute()
        
        count = len(del_res.data)
        if interactive:
            print(f"✓ Successfully deleted {count} records.")
        
        return count

    except Exception as e:
        print(f"Error during list/delete operation: {e}")
        # In API context, we might want to raise this so the route handler catches it
        if not interactive: raise e
        return 0

def list_and_reset():
    # 1. Determine Target Week
    target_week = TARGET_WEEK
    if len(sys.argv) > 1:
        target_week = sys.argv[1]
    
    reset_from_week(target_week, interactive=True)

if __name__ == '__main__':
    list_and_reset()

