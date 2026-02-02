import sys
import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

# Load environment
load_dotenv('.env.local')

# Initialize Supabase
url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not url or not key:
    print("Missing environment variables!")
    sys.exit(1)
supabase = create_client(url, key)

# Import internal modules (assuming running from root)
sys.path.append(os.getcwd())
try:
    from scripts.workflow.actions import create_new_week
    from api.utils.storage import StorageEngine
    from api.routes.status import _load_config
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def init_week(week_str):
    print(f"Initializing week: {week_str}")
    
    try:
        # 1. Patch household ID
        import api.utils.storage
        api.utils.storage.get_household_id = lambda: "00000000-0000-0000-0000-000000000001"
        
        print("Fetching history...")
        history = StorageEngine.get_history()
        
        print("Fetching recipes...")
        # Replicating logic from api/routes/meals.py
        h_id = "00000000-0000-0000-0000-000000000001"
        res = supabase.table("recipes").select("id, name, metadata").eq("household_id", h_id).execute()
        all_recipes = [{"id": r['id'], "name": r['name'], **(r.get('metadata') or {})} for r in res.data]
        
        print("Loading config...")
        config = _load_config()
        
        print("Generating week data...")
        new_plan_data = create_new_week(
            week_str, 
            history_dict=history, 
            recipes_list=all_recipes, 
            config_dict=config
        )
        
        print("Saving to Supabase...")
        StorageEngine.update_meal_plan(
            week_str, 
            plan_data=new_plan_data, 
            history_data={'week_of': week_str, 'dinners': []}, 
            status='planning'
        )
        print("Success! Week initialized.")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    target_week = '2026-02-02'
    if len(sys.argv) > 1:
        target_week = sys.argv[1]
    
    init_week(target_week)
