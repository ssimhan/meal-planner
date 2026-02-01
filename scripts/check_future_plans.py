import os
import sys
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

# Load environment
load_dotenv('.env.local')

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing environment variables!")
    sys.exit(1)

supabase = create_client(url, key)

today = datetime.now().date().strftime('%Y-%m-%d')
print(f"Checking for meal plans after {today}...")

try:
    # Fetch plans with week_of > today
    res = supabase.table('meal_plans').select("id, week_of, status").gt("week_of", today).order("week_of").execute()
    
    if not res.data:
        print("No future meal plans found.")
    else:
        print(f"Found {len(res.data)} future meal plans:")
        for plan in res.data:
            print(f"- Week: {plan['week_of']}, Status: {plan['status']}, ID: {plan['id']}")
            
except Exception as e:
    print(f"Error: {e}")
