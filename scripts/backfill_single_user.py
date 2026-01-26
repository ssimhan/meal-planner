import sys
import os
import json
import uuid

# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase, SUPABASE_SERVICE_KEY

def backfill_user(email):
    print(f"🛠  Backfilling User: {email}")
    
    if not supabase:
        print("❌ Supabase client not initialized.")
        return

    # 1. Get User ID
    user_id = None
    try:
        users = supabase.auth.admin.list_users()
        found = next((u for u in users if u.email == email), None)
        if found:
            user_id = found.id
            print(f"✅ Found User ID: {user_id}")
        else:
            print(f"❌ User {email} not found in Auth.")
            return
    except Exception as e:
        print(f"❌ Error listing users: {e}")
        return

    # 2. Check if Profile already exists by USER_ID col
    res = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    existing_profile = None
    if res.data:
        print("⚠️  Profile found by user_id.")
        existing_profile = res.data[0]
    else:
        # Check by ID (assuming 1:1 mapping)
        res2 = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if res2.data:
            print("⚠️  Profile found by ID (but user_id mismatch?).")
            existing_profile = res2.data[0]

    # 3. Create Household (only if we need a new one)
    # If existing profile has a household, use it?
    household_id = None
    if existing_profile and existing_profile.get('household_id'):
        household_id = existing_profile['household_id']
        print(f"ℹ️  Using existing household: {household_id}")
    else:
        print("🏠 Creating Household...")
        config_defaults = {
            "timezone": "America/Los_Angeles",
            "schedule": {"office_days": ["mon", "wed", "fri"], "busy_days": []}
        }
        new_h_id = str(uuid.uuid4())
        h_res = supabase.table("households").insert({
            "id": new_h_id,
            "name": "My Household (Restored)",
            "config": config_defaults
        }).execute()
        household_id = new_h_id
        print(f"✅ Created Household: {household_id}")

    # 4. Upsert Profile
    print("👤 Upserting Profile...")
    
    # We force id=user_id and user_id=user_id
    payload = {
        "id": user_id, 
        "user_id": user_id,
        "household_id": household_id,
        "role": "owner"
    }
    
    p_res = supabase.table("profiles").upsert(payload).execute()
    
    if p_res.data:
        print("✅ SUCCESS! User backfilled/fixed.")
        print(f"   Profile ID: {p_res.data[0]['id']}")
        print(f"   Household ID: {p_res.data[0]['household_id']}")
    else:
        print("❌ Failed to upsert profile.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        print("Usage: python3 backfill_single_user.py <email>")
        sys.exit(1)
    backfill_user(email)
