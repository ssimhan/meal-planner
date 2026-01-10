import os
from functools import wraps
from flask import request, jsonify
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env.local if it exists
dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    # In Vercel, these should be regular environment variables
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
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
            
            # Attach user info to request if needed
            request.user = user_res.user
            
        except Exception as e:
            print(f"Auth verification error: {str(e)}")
            return jsonify({"status": "error", "message": "Unauthorized"}), 401
            
        return f(*args, **kwargs)
    return decorated
