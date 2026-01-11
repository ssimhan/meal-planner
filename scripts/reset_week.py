import sys
import os
# Ensure we can import from parent directory
from api.utils.storage import supabase
from api.utils import invalidate_cache

def reset_week(week_of):
    print(f"Attempting to reset week: {week_of}")
    try:
        # Default dev ID since we are in CLI
        h_id = "00000000-0000-0000-0000-000000000001"
        print(f"Household ID: {h_id}")
        
        if not supabase:
            print("Supabase client not initialized.")
            return

        # Check if it exists
        res = supabase.table("meal_plans") \
            .select("*") \
            .eq("household_id", h_id) \
            .eq("week_of", week_of) \
            .execute()
            
        if not res.data:
            print(f"Week {week_of} not found in database. Nothing to delete.")
            return

        print(f"Found week {week_of}. Status: {res.data[0].get('status')}")
        
        # Delete it
        del_res = supabase.table("meal_plans") \
            .delete() \
            .eq("household_id", h_id) \
            .eq("week_of", week_of) \
            .execute()
            
        print(f"Deleted week {week_of}.")
        
        # Invalidate cache
        invalidate_cache()
        print("Cache invalidated.")
        
    except Exception as e:
        print(f"Error resetting week: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/reset_week.py <YYYY-MM-DD>")
    else:
        reset_week(sys.argv[1])
