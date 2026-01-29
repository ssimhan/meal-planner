import os
import yaml
from pathlib import Path
from supabase import create_client, Client
from api.utils.storage import execute_with_retry

# Initialize Supabase client with SERVICE ROLE for onboarding
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
# We need Service Role Key to bypass RLS during onboarding
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') or os.environ.get('SUPABASE_ANON_KEY')

supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_KEY else None

def onboard_new_user(user_id, email):
    """
    Initializes a new household and profile for a user.
    Called when a user logs in for the first time.
    """
    if not supabase_admin:
        print("Onboarding skipped: Supabase Service Key not found.")
        return "00000000-0000-0000-0000-000000000001"

    try:
        # 1. Create a new household
        family_name = f"{email.split('@')[0].title()}'s Family"
        
        # Load default config
        config = {
            "timezone": "America/Los_Angeles",
            "preferences": {
                "effort_mix": {"high": 1, "medium": 2, "low": 2},
                "max_meat_per_week": 3
            }
        }
        
        query = supabase_admin.table("households").insert({
            "name": family_name,
            "config": config
        })
        h_res = execute_with_retry(query)
        
        if not h_res.data:
            raise Exception("Failed to create household")
            
        hh_id = h_res.data[0]['id']
        
        # 2. Create profile
        query = supabase_admin.table("profiles").insert({
            "id": user_id,
            "household_id": hh_id,
            "full_name": email.split('@')[0].title()
        })
        execute_with_retry(query)
        
        # 3. Add a sample recipe so the dashboard isn't empty
        sample_recipe = {
            "id": "welcome_smoothie",
            "household_id": hh_id,
            "name": "Welcome Smoothie",
            "metadata": {
                "cuisine": "various",
                "meal_type": "snack",
                "effort_level": "no_chop",
                "no_chop_compatible": True,
                "main_veg": ["spinach"]
            },
            "content": "# Welcome Smoothie\n\n1. Blend spinach, banana, and water.\n2. Enjoy your new meal planner!"
        }
        query = supabase_admin.table("recipes").insert(sample_recipe)
        execute_with_retry(query)
        
        print(f"Onboarded new user {email} with household {hh_id}")
        return hh_id

    except Exception as e:
        print(f"Error during onboarding: {e}")
        # Fallback to demo household if onboarding fails
        return "00000000-0000-0000-0000-000000000001"
