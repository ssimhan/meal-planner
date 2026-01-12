import sys
import os

# Add the project root to the python path so we can import api modules
sys.path.append(os.getcwd())

from api.utils.storage import supabase, get_household_id

def reset_week(week_of):
    if not supabase:
        print("Error: Supabase client not initialized.")
        return

    # We can't use get_household_id() easily because it relies on request context
    # Hardcode the default ID used in storage.py fallback for now for local dev
    # Or fetch it from a user if we had one.
    # storage.py: return getattr(request, 'household_id', "00000000-0000-0000-0000-000000000001")
    h_id = "00000000-0000-0000-0000-000000000001"
    
    print(f"Attempting to reset (delete) meal plan for week: {week_of}")
    
    try:
        # Check if it exists first
        res = supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_of).execute()
        if not res.data:
            print(f"No plan found for {week_of}. Nothing to delete.")
            return

        # Delete the plan
        del_res = supabase.table("meal_plans").delete().eq("household_id", h_id).eq("week_of", week_of).execute()
        print(f"Successfully deleted plan for {week_of}")
        
    except Exception as e:
        print(f"Error deleting plan: {e}")

if __name__ == "__main__":
    # Target week: Jan 12, 2026
    reset_week("2026-01-12")
