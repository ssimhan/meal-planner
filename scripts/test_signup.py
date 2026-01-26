import sys
import os
import time

# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase, SUPABASE_SERVICE_KEY

def test_signup():
    email = f"debug_test_{int(time.time())}@example.com"
    password = "password123"
    
    print(f"🧪 Attempting to create user: {email}")
    
    if not supabase:
        print("❌ Supabase client not initialized.")
        return

    try:
        # Use Admin API to create user (bypasses email confirm usually, but triggers still run)
        # Note: Depending on library version, might be auth.admin.create_user or similar
        attr = {"email": email, "password": password, "email_confirm": True}
        res = supabase.auth.admin.create_user(attr)
        
        # In some versions, res is the User object, in others it's a response object
        if hasattr(res, 'id') or (hasattr(res, 'user') and res.user):
            print("✅ User created successfully!")
            print(f"   ID: {getattr(res, 'id', getattr(res, 'user', {}).id)}")
        else:
            print(f"❌ Creation failed (No ID returned): {res}")
            
    except Exception as e:
        print("\n❌ CRITICAL FAILURE TRIGGERED")
        print("---------------------------")
        print(e)
        print("---------------------------")
        # Start looking for clues strings
        e_str = str(e).lower()
        if "gen_random_uuid" in e_str:
            print("💡 HINT: 'gen_random_uuid' missing? Try 'extensions.gen_random_uuid()'.")
        if "permission denied" in e_str:
            print("💡 HINT: Trigger permission issue.")
        if "search_path" in e_str:
            print("💡 HINT: Function search_path issue.")

if __name__ == "__main__":
    test_signup()
