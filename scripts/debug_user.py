import sys
import os

# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase, SUPABASE_SERVICE_KEY

def debug_user(email):
    print(f"🔍 Debugging User: {email}")
    
    if not supabase:
        print("❌ Supabase client not initialized.")
        return

    # 1. Check Auth User via Admin API
    # Note: supabase-py admin usage depends on version, usually auth.admin.list_users() or similar if service key used
    user_id = None
    try:
        # Try to list users (requires service role key)
        # This might fail if the key is not actually a service role key
        users = supabase.auth.admin.list_users()
        found = next((u for u in users if u.email == email), None)
        
        if found:
            print(f"✅ Auth User Found: {found.id}")
            print(f"   Confirmed: {found.email_confirmed_at}")
            print(f"   Last Sign In: {found.last_sign_in_at}")
            user_id = found.id
        else:
            print("❌ Auth User NOT FOUND in list.")
            
    except Exception as e:
        print(f"⚠️  Could not list users via Admin API: {e}")
        # Fallback: Try to find by profile if we can't search auth directly
    
    # 2. Check Profile
    print("\n--------- Profiles ---------")
    # If we have user_id, search by it. If not, scan all profiles? No, too many.
    # We can try to guess profile ID = user ID if we enforced that... but in the trigger we generate a random profile ID?
    # No, the trigger: INSERT INTO public.profiles (user_id, ...) VALUES (NEW.id, ...)
    # Wait, profile.id is auto-generated or matches user_id?
    # In Chunk 1.1 we defined profiles.id as UUID PRIMARY KEY DEFAULT gen_random_uuid().
    # So profile.id != user_id usually.
    
    if user_id:
        res = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        if res.data:
            print(f"✅ Profile Found: {res.data[0]['id']}")
            print(f"   Household ID: {res.data[0]['household_id']}")
            print(f"   Role: {res.data[0]['role']}")
            
            hh_id = res.data[0]['household_id']
            
            # 3. Check Household
            print("\n--------- Household ---------")
            h_res = supabase.table("households").select("*").eq("id", hh_id).execute()
            if h_res.data:
                print(f"✅ Household Found: {h_res.data[0]['name']} ({h_res.data[0]['id']})")
                print(f"   Config: {str(h_res.data[0]['config'])[:50]}...")
            else:
                print("❌ Household NOT FOUND (Orphaned Profile!)")
        else:
            print("❌ Profile NOT FOUND (Trigger failed?)")
            
            # 2b. Check if maybe the user signed up but trigger failed
    else:
        print("   (Cannot check profile without User ID)")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = "sandhya.simhan@gmail.com"
    debug_user(email)
