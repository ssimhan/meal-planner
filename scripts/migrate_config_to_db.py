import os
import yaml
import sys
from pathlib import Path

# Add parent directory to path so we can import from api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.utils.storage import supabase, SUPABASE_SERVICE_KEY

def migrate_config():
    if not supabase:
        print("❌ Supabase client not initialized. Check environment variables.")
        sys.exit(1)
        
    if not SUPABASE_SERVICE_KEY:
        print("❌ SUPABASE_SERVICE_ROLE_KEY is required for this operation.")
        sys.exit(1)

    # 1. Load local config
    config_path = Path('config.yml')
    if not config_path.exists():
        print("❌ config.yml not found in current directory.")
        sys.exit(1)
        
    print(f"📖 Reading config from {config_path}...")
    with open(config_path, 'r') as f:
        config_data = yaml.safe_load(f) or {}

    print(f"🔹 Found config keys: {list(config_data.keys())}")

    # 2. Get the Default Household
    # Assumption: We are migrating the single-user local config to the "Default Household"
    print("🔍 Finding Default Household...")
    res = supabase.table("households").select("id, name").limit(1).execute()
    
    if not res.data:
        print("❌ No households found! Run SQL migrations first.")
        sys.exit(1)
        
    default_household = res.data[0]
    h_id = default_household['id']
    h_name = default_household['name']
    
    print(f"✅ Target: {h_name} ({h_id})")

    # 3. Update the database
    print("🚀 Uploading config to database...")
    result = supabase.table("households").update({"config": config_data}).eq("id", h_id).execute()
    
    if result.data:
        print("✅ Success! Config migrated to database.")
        print(f"Updated config for household: {result.data[0]['id']}")
    else:
        print("❌ Update failed or returned no data.")

if __name__ == "__main__":
    migrate_config()
