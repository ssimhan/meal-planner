import sys
import os
import uuid
# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase, SUPABASE_SERVICE_KEY

def debug_manual_insert():
    if not supabase:
        print("Supabase client not initialized")
        return

    print("🛠 Testing manual insertion into households and profiles...")

    # Generate fake IDs
    fake_user_id = str(uuid.uuid4())
    fake_household_id = str(uuid.uuid4())
    fake_profile_id = str(uuid.uuid4())
    
    print(f"Generated fake IDs:\n  User: {fake_user_id}\n  Household: {fake_household_id}\n  Profile: {fake_profile_id}")

    # 1. Try inserting a household
    print("\n1. Attempting Household Insert...")
    try:
        data = {
            "id": fake_household_id,
            "name": "Debug Household",
            "config": {"timezone": "UTC"}
        }
        res = supabase.table("households").insert(data).execute()
        print("✅ Household Insert Successful:", res.data)
    except Exception as e:
        print("❌ Household Insert Failed:", e)
        return

    # 2. Try inserting a profile
    # Note: This might fail on FK constraint if fake_user_id doesn't exist in auth.users
    # BUT, households and profiles might not enforce FK to auth.users if defined loosely, 
    # OR we need to know if the FK exists. Usually verified by looking at schema. 
    # If the schema has "references auth.users", we can't insert a profile with a fake user_id.
    
    print("\n2. Attempting Profile Insert (checking FK constraints)...")
    try:
        data = {
            "id": fake_profile_id,
            "user_id": fake_user_id,
            "household_id": fake_household_id,
            "role": "owner"
        }
        res = supabase.table("profiles").insert(data).execute()
        print("✅ Profile Insert Successful:", res.data)
    except Exception as e:
        print("❌ Profile Insert Failed:", e)
        # Verify if it failed due to FK or something else
        if "foreign key constraint" in str(e).lower():
             print("   (Expected if auth.users FK exists, meaning tables are linked correctly)")
        else:
             print("   (Unexpected error, possibly RLS or permissions)")

    # Cleanup
    print("\nCleaning up debug data...")
    try:
        supabase.table("profiles").delete().eq("id", fake_profile_id).execute()
        supabase.table("households").delete().eq("id", fake_household_id).execute()
        print("✅ Cleanup Successful")
    except Exception as e:
        print("⚠️ Cleanup Failed:", e)

if __name__ == "__main__":
    debug_manual_insert()
