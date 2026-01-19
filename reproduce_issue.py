import os
import sys

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from api.utils import storage
from api.utils.storage import StorageEngine
import time

print("Starting reproduction script...")
h_id = "00000000-0000-0000-0000-000000000001" 

def test_connection():
    try:
        print("\n--- Test Run ---")
        start = time.time()
        
        print(f"Fetching meal plans for household {h_id}...")
        res = storage.supabase.table("meal_plans") \
            .select("*") \
            .eq("household_id", h_id) \
            .neq("status", "planning") \
            .order("week_of", desc=True) \
            .limit(1) \
            .execute()
        print(f"Meal plans fetched. Count: {len(res.data) if res.data else 0}")
        
        print("Fetching recipes...")
        all_recipes_res = storage.supabase.table("recipes").select("id, name").eq("household_id", h_id).execute()
        print(f"Recipes fetched. Count: {len(all_recipes_res.data) if all_recipes_res.data else 0}")
        
        end = time.time()
        print(f"Test completed in {end - start:.2f} seconds")
        return True
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        return False

# Run it a few times to check for flakiness
successes = 0
attempts = 3
for i in range(attempts):
    print(f"\nAttempt {i+1}/{attempts}")
    if test_connection():
        successes += 1
    time.sleep(1)

print(f"\nSuccess rate: {successes}/{attempts}")
