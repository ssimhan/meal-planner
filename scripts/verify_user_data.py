import sys
import os
# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase

def verify_user_data(user_id):
    if not supabase:
        print("Supabase client not initialized")
        return

    print(f"🔍 Verifying data for User ID: {user_id}")

    # 1. Check Profile
    print("  Checking Profile...")
    try:
        # In the new schema, profile.id == user.id (or profile.user_id == user.id)
        # We know from the trigger fix that profile.id was set to NEW.id, but let's query by user_id to be safe/standard
        res = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        
        if res.data:
            profile = res.data[0]
            print(f"  ✅ Profile found: {profile['id']}")
            household_id = profile.get('household_id')
            
            # 2. Check Household
            if household_id:
                print(f"  Checking Household ({household_id})...")
                res_h = supabase.table("households").select("*").eq("id", household_id).execute()
                if res_h.data:
                     print(f"  ✅ Household found: {res_h.data[0]['name']}")
                     print("🎉 verification COMPLETE: User properly onboarded.")
                else:
                     print("  ❌ Household NOT found (Orphaned Profile)")
            else:
                print("  ❌ Profile has no household_id")
        else:
             print("  ❌ Profile NOT found (Trigger failed downstream?)")

    except Exception as e:
        print(f"  ❌ Error verifying data: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        verify_user_data(sys.argv[1])
    else:
        print("Usage: python scripts/verify_user_data.py <user_id>")
