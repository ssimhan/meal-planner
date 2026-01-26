import sys
import os
# Add parent directory to path to import api
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.utils.storage import supabase

def check_tables():
    if not supabase:
        print("Supabase client not initialized")
        return

    # Table name -> Expected columns
    tables = {
        "households": ["id", "config"],
        "profiles": ["id", "user_id", "household_id"], 
        "inventory_items": ["household_id"], 
        "recipes": ["household_id"], 
        "meal_plans": ["household_id"]
    }
    
    print("Checking tables and columns...")
    for table, columns in tables.items():
        try:
            res = supabase.table(table).select("*").limit(1).execute()
            print(f"✅ Table '{table}' exists.")
            if res.data:
                row = res.data[0]
                missing = [col for col in columns if col not in row]
                if missing:
                    print(f"   ⚠️  Missing columns in '{table}': {missing}")
                else:
                    print(f"   ✅ Verified columns: {columns}")
            else:
                 print(f"   ℹ️  Table '{table}' is empty, cannot verify columns directly.")
        except Exception as e:
            print(f"❌ Table '{table}' check failed: {e}")

if __name__ == "__main__":
    check_tables()
