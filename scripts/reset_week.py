import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.utils.storage import supabase, IS_SERVICE_ROLE

TARGET_WEEK = '2026-01-26'
HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001' # Default for now, matched storage.py default


def list_and_reset():
    if not supabase:
        print("Error: Supabase client not initialized.")
        return

    print("Fetching ALL meal plans to verify dates...")
    try:
        res = supabase.table("meal_plans").select("id, week_of, status").execute()
        print(f"Found {len(res.data)} plans:")
        for plan in res.data:
            print(f" - {plan['week_of']} ({plan['status']}) [ID: {plan['id']}]")
            
            if plan['week_of'] == TARGET_WEEK:
                print(f"   -> MATCH FOUND! Deleting {plan['id']}...")
                del_res = supabase.table("meal_plans").delete().eq("id", plan['id']).execute()
                print(f"   -> Deleted: {del_res.data}")

    except Exception as e:
        print(f"Error listing/deleting plans: {e}")

if __name__ == '__main__':
    list_and_reset()

