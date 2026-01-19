import os
import sys

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from api.utils import storage

def reset_week(week_of):
    print(f"Attempting to reset (delete) meal plan for week: {week_of}")
    try:
        h_id = "00000000-0000-0000-0000-000000000001" # Default mock ID
        
        # Check if it exists first
        res = storage.supabase.table("meal_plans").select("*").eq("household_id", h_id).eq("week_of", week_of).execute()
        if not res.data:
            print(f"Week {week_of} not found. Nothing to delete.")
            return

        # Delete it
        storage.supabase.table("meal_plans").delete().eq("household_id", h_id).eq("week_of", week_of).execute()
        print(f"Successfully deleted meal plan for {week_of}")
        
    except Exception as e:
        print(f"Error resetting week: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_week("2026-01-19")
