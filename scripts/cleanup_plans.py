
from api.utils import storage
from datetime import datetime


# h_id = storage.get_household_id()
h_id = "00000000-0000-0000-0000-000000000001"
target_date = "2026-01-19"

print(f"Deleting meal plans ON or after {target_date} for household {h_id}...")

try:
    # We want to delete where week_of >= target_date
    res = storage.supabase.table("meal_plans").delete().gte("week_of", target_date).eq("household_id", h_id).execute()
    print(f"Deleted {len(res.data) if res.data else 0} records.")
except Exception as e:
    print(f"Error: {e}")
