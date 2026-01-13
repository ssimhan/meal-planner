
import sys
import os
import requests
from datetime import datetime

# Adjust path to find api module if run from root
sys.path.append(os.getcwd())

# Configuration
API_BASE = "http://localhost:3000/api"  # Assuming standard Next.js proxy or Flask port
# If Next.js proxy isn't running or auth is tricky, we might use direct python calls. 
# But python calls require full environment setup.
# Let's try direct python calls as they are more reliable within this agent session than assuming localhost:3000 is waiting.

from api.utils.storage import StorageEngine
# from api.routes.status import get_status_data

def inject_pending_recipe():
    print("Fetching current status...")
    # We need a valid household context, usually provided by request.
    # We can mock it or ensure StorageEngine uses default if missing.
    # storage.get_household_id uses getattr(request, 'household_id', default) which works if request is missing attribute or None?
    # Actually StorageEngine uses `get_household_id` which relies on `flask.request`.
    # Without a request context, `getattr(request, ...)` will likely fail if request is a LocalProxy that is unbound.
    
    # Workaround: Manually insert into Supabase or use a mock request context.
    from flask import Flask
    app = Flask(__name__)
    
    with app.test_request_context():
        try:
            status = StorageEngine.get_active_week()
            if not status:
                print("No active week found. Cannot log meal.")
                return

            week_of = status['week_of']
            print(f"Active week: {week_of}")
            
            # Use 'Mon' as a safe fallback if today isn't found or just use today's day
            today_abbr = datetime.now().strftime('%a').lower()[:3]
            
            # Log a meal
            # We need to update the history data for this week.
            history = status.get('history_data') or {}
            dinners = history.get('dinners', [])
            
            test_meal_name = "Test Mystery Curry"
            
            # Check if already there
            for d in dinners:
                if d.get('day') == today_abbr:
                    d['made'] = True
                    d['actual_meal'] = test_meal_name
                    print(f"Updating existing day {today_abbr} with {test_meal_name}")
                    break
            else:
                # Add new entry if not found (unlikely for active week but possible)
                dinners.append({
                    "day": today_abbr,
                    "recipe_id": "placeholder",
                    "made": True,
                    "actual_meal": test_meal_name
                })
                print(f"Adding new day {today_abbr} with {test_meal_name}")

            history['dinners'] = dinners
            
            print("Saving update...")
            StorageEngine.update_meal_plan(week_of, history_data=history)
            print("Success! 'Test Mystery Curry' has been logged.")
            
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    inject_pending_recipe()
