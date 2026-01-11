import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('.env.local')

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

print(f"URL Found: {bool(url)}")
print(f"Key Found: {bool(key)}")

if not url or not key:
    print("Missing environment variables!")
    sys.exit(1)

try:
    supabase = create_client(url, key)
    print("Client initialized.")
    
    # Check tables
    tables = ['meal_plans', 'inventory_items', 'recipes']
    for t in tables:
        try:
            res = supabase.table(t).select("count", count="exact").limit(1).execute()
            print(f"Table '{t}' exists. Rows: {res.count}")
        except Exception as e:
            print(f"Table '{t}' ERROR: {e}")

except Exception as e:
    print(f"Connection Failed: {e}")
