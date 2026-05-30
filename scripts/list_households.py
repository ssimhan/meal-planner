
from api.utils import storage
import json

try:
    res = storage.supabase.table("meal_plans").select("household_id").execute()
    h_ids = set([row['household_id'] for row in res.data])
    print(f"Found {len(h_ids)} unique households:")
    for hid in h_ids:
        print(f"- {hid}")
        
    # Also check reviews for good measure
    res2 = storage.supabase.table("reviews").select("household_id").execute()
    h_ids2 = set([row['household_id'] for row in res2.data])
    print(f"Found {len(h_ids2)} unique households in reviews:")
    for hid in h_ids2:
        print(f"- {hid}")

except Exception as e:
    print(f"Error: {e}")
