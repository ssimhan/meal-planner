import os
from functools import wraps
from flask import request, jsonify
from api.utils.storage import supabase

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Support for disabling auth in local development
        if os.environ.get('DISABLE_AUTH') == 'true':
            print("AUTH DISABLED: Providing mock user context")
            request.household_id = os.environ.get('DEFAULT_HOUSEHOLD_ID', "00000000-0000-0000-0000-000000000001")
            class MockUser:
                id = "00000000-0000-0000-0000-000000000000"
                email = "local@example.com"
            request.user = MockUser()
            return f(*args, **kwargs)
        
        print(f"AUTH CHECK: Checking headers for {request.path}")

        if not supabase:
            # Fallback for when SUPABASE is not configured yet
            # In production, this should always be configured
            return f(*args, **kwargs)

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"status": "error", "message": "Missing or invalid Authorization header"}), 401
        
        token = auth_header.split(' ')[1]
        
        try:
            # Verify the token with Supabase
            user_res = supabase.auth.get_user(token)
            if not user_res or not user_res.user:
                return jsonify({"status": "error", "message": "Invalid or expired token"}), 401
            
            # Attach user info to request
            request.user = user_res.user

            # Fetch household_id from profiles
            profile_res = supabase.table("profiles").select("household_id").eq("id", user_res.user.id).execute()
            
            if profile_res.data and len(profile_res.data) > 0:
                request.household_id = profile_res.data[0].get('household_id')
            else:
                # NEW: Auto-onboard new user
                from api.utils.onboarding import onboard_new_user
                hh_id = onboard_new_user(user_res.user.id, user_res.user.email)
                request.household_id = hh_id
            
        except Exception as e:
            print(f"Auth verification error: {str(e)}")
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
            
        return f(*args, **kwargs)
    return decorated
