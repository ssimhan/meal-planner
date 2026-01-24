import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.utils.storage import supabase, IS_SERVICE_ROLE

TARGET_WEEKS = ['2026-01-12', '2026-01-19']
HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'

def clear_wizard_state():
    if not supabase:
        print("Error: Supabase client not initialized.")
        return

    if not IS_SERVICE_ROLE:
        print("Error: SUPABASE_SERVICE_ROLE_KEY missing. Cannot write to database.")
        return

    print(f"Clearing wizard_state for weeks: {TARGET_WEEKS}...")

    try:
        # Fetch plans
        res = supabase.table("meal_plans").select("id, week_of, plan_data").in_("week_of", TARGET_WEEKS).eq("household_id", HOUSEHOLD_ID).execute()
        
        for plan in res.data:
            week_of = plan['week_of']
            plan_data = plan.get('plan_data') or {}
            
            if 'wizard_state' in plan_data:
                print(f"[{week_of}] Found wizard_state! Clearing it...")
                del plan_data['wizard_state']
                
                # Update DB
                supabase.table("meal_plans").update({"plan_data": plan_data}).eq("id", plan['id']).execute()
                print(f"[{week_of}] Successfully cleared wizard state.")
            else:
                print(f"[{week_of}] No wizard_state found.")

    except Exception as e:
        print(f"Failed to clear wizard state: {e}")

if __name__ == '__main__':
    clear_wizard_state()
