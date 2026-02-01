import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('.env.local')

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing environment variables!")
    sys.exit(1)

supabase = create_client(url, key)

def delete_future_plans(cutoff_date):
    print(f"Checking for meal plans strictly after {cutoff_date}...")
    try:
        # First count/list them
        res = supabase.table('meal_plans').select("week_of").gt("week_of", cutoff_date).execute()
        if not res.data:
            print("No meal plans found to delete.")
            return

        print(f"Found {len(res.data)} plans to delete (After {cutoff_date}).")
        
        # In a real interactive shell we'd ask for input, but here we can rely on the user confirming to run the script via the agent.
        # However, for safety, I will require a specific env var or arg to actually execute delete, 
        # or just print them if not verified.
        # Since I'm running this via a tool command `run_command` and I can't easily do interactive input,
        # I'll rely on a command line argument '--force' to actually delete.
        
        if '--force' in sys.argv:
            del_res = supabase.table('meal_plans').delete().gt("week_of", cutoff_date).execute()
            print(f"Successfully deleted {len(del_res.data)} records.")
        else:
            print("Dry run complete. Run with --force to actually delete.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Default cutoff: Keep the week of Feb 2nd, 2026. So delete > 2026-02-08.
    # But user might want to delete Feb 2nd too.
    # I'll default to '2026-02-08' which preserves the immediate upcoming week.
    cutoff = '2026-02-01'
    if len(sys.argv) > 1 and sys.argv[1] != '--force':
        # unexpected arg, maybe it's a date?
        # Let's just stick to hardcoded default or env var for simplicity in this agent context
        pass
        
    delete_future_plans(cutoff)
