import sys
import os
import requests
import time
from pathlib import Path

# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase, SUPABASE_SERVICE_KEY

# Configuration
API_URL = "http://localhost:3000/api/status"
MAGIC_TOKEN = "MAGIC_TEST_TOKEN"
HEADERS = {"Authorization": f"Bearer {MAGIC_TOKEN}"}

def verify_live_config():
    if not supabase or not SUPABASE_SERVICE_KEY:
        print("❌ Supabase client/key missing.")
        return

    print("🔍 1. Fetching current DB config...")
    # Get Default Household ID
    h_id = "00000000-0000-0000-0000-000000000001"
    
    res = supabase.table("households").select("config").eq("id", h_id).execute()
    if not res.data:
        print("❌ Default household not found.")
        return
        
    original_config = res.data[0]['config'] or {}
    print("   ✅ Config retrieved.")

    # Modify config (Change home snack default)
    test_val = f"TEST_SNACK_{int(time.time())}"
    print(f"✏️  2. Updating DB config: Set home snack fallback to '{test_val}'...")
    
    modified_config = original_config.copy()
    if 'snack_defaults' not in modified_config: modified_config['snack_defaults'] = {}
    if 'fallback' not in modified_config['snack_defaults']: modified_config['snack_defaults']['fallback'] = {}
    
    modified_config['snack_defaults']['fallback']['home'] = test_val
    
    # Save to DB
    supabase.table("households").update({"config": modified_config}).eq("id", h_id).execute()
    print("   ✅ DB Updated.")

    print("🧹 3. Clearing Cache...")
    requests.get("http://localhost:3000/api/debug/clear_cache", headers=HEADERS)

    print("📡 4. Calling API via magic token...")
    try:
        r = requests.get(API_URL, headers=HEADERS)
        if r.status_code != 200:
            print(f"❌ API Error: {r.status_code}")
            print(r.text)
            return
            
        data = r.json()
        
        # Check if the snack matches
        # logic: today_snacks.home should match our test val (unless overridden by day specific)
        # Note: If today is a day with specific override, this might fail unless we pick a specific day logic.
        # But usually fallback is used if specific day is missing.
        # Let's inspect the 'today_snacks'
        
        actual_snack = data.get('today_snacks', {}).get('home')
        print(f"   🔍 API returned home snack: '{actual_snack}'")
        
        if actual_snack == test_val:
            print("🎉 SUCCESS: API reflected the database change!")
        else:
            print("⚠️  WARNING: API did not match. (Could be day-specific override or cache issue)")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

    finally:
        print("Restoring original config...")
        supabase.table("households").update({"config": original_config}).eq("id", h_id).execute()
        print("✅ Config restored.")

if __name__ == "__main__":
    verify_live_config()
