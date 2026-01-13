import os
import yaml
import uuid
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
# Use Service Role Key if available, otherwise Anon Key
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY) must be set in .env.local")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Use a consistent UUID for the primary household in this single-family setup
HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001" 

def migrate_household():
    print("--- Migrating Household & Config ---")
    config = {}
    if Path('config.yml').exists():
        with open('config.yml', 'r') as f:
            config = yaml.safe_load(f)
    
    data = {
        "id": HOUSEHOLD_ID,
        "name": "Simhan Family",
        "config": config
    }
    
    # Upsert household
    try:
        result = supabase.table("households").upsert(data).execute()
        print(f"Household migrated.")
    except Exception as e:
        print(f"Error migrating household: {e}")
        raise e
    return HOUSEHOLD_ID

def migrate_recipes(household_id):
    print("--- Migrating Recipes ---")
    if not Path('recipes/index.yml').exists():
        print("No recipes index found.")
        return

    with open('recipes/index.yml', 'r') as f:
        recipes_index = yaml.safe_load(f)

    for r_meta in recipes_index:
        recipe_id = r_meta.get('id')
        name = r_meta.get('name')
        
        # Load markdown content
        content = ""
        content_path = Path(f'recipes/content/{recipe_id}.md')
        if content_path.exists():
            with open(content_path, 'r') as f:
                content = f.read()
        
        data = {
            "id": recipe_id,
            "household_id": household_id,
            "name": name,
            "metadata": r_meta,
            "content": content
        }
        
        supabase.table("recipes").upsert(data).execute()
        print(f"Migrated recipe: {recipe_id}")

def migrate_inventory(household_id):
    print("--- Migrating Inventory ---")
    if not Path('data/inventory.yml').exists():
        print("No inventory file found.")
        return

    with open('data/inventory.yml', 'r') as f:
        inv = yaml.safe_load(f)

    # Prepare batch
    items_to_insert = []
    
    # Fridge
    for item in inv.get('fridge', []):
        items_to_insert.append({
            "household_id": household_id,
            "category": "fridge",
            "item": item.get('item'),
            "quantity": item.get('quantity', 1),
            "unit": item.get('unit', 'count'),
            "metadata": {k: v for k, v in item.items() if k not in ['item', 'quantity', 'unit']}
        })

    # Pantry
    for item in inv.get('pantry', []):
        items_to_insert.append({
            "household_id": household_id,
            "category": "pantry",
            "item": item.get('item'),
            "quantity": item.get('quantity', 1),
            "unit": item.get('unit', 'count'),
            "metadata": {k: v for k, v in item.items() if k not in ['item', 'quantity', 'unit']}
        })

    # Freezer
    freezer = inv.get('freezer', {})
    for item in freezer.get('ingredients', []):
        items_to_insert.append({
            "household_id": household_id,
            "category": "freezer_ingredient",
            "item": item.get('item'),
            "quantity": item.get('quantity', 1),
            "unit": item.get('unit', 'count'),
            "metadata": {k: v for k, v in item.items() if k not in ['item', 'quantity', 'unit']}
        })
    
    for item in freezer.get('backups', []):
        items_to_insert.append({
            "household_id": household_id,
            "category": "freezer_backup",
            "item": item.get('meal'),
            "quantity": item.get('servings', 1),
            "unit": "servings",
            "metadata": {k: v for k, v in item.items() if k not in ['meal', 'servings']}
        })

    if items_to_insert:
        # Clear existing inventory for this household to avoid doubles during migration
        # In a real SaaS we'd be more careful, but for this one-time migration:
        supabase.table("inventory_items").delete().eq("household_id", household_id).execute()
        supabase.table("inventory_items").insert(items_to_insert).execute()
        print(f"Migrated {len(items_to_insert)} inventory items.")

def migrate_history(household_id):
    print("--- Migrating History & Meal Plans ---")
    if not Path('data/history.yml').exists():
        print("No history file found.")
        return

    with open('data/history.yml', 'r') as f:
        history = yaml.safe_load(f)

    weeks = history.get('weeks', [])
    if not weeks:
        return
        
    # Clear existing to avoid conflicts during migration
    # In a real app we'd upsert carefully, but for this one-time migration:
    supabase.table("meal_plans").delete().eq("household_id", household_id).execute()

    for week in weeks:
        week_of = week.get('week_of')
        
        # Load detailed plan if exists
        plan_data = {}
        plan_path = Path(f'inputs/{week_of}.yml')
        if plan_path.exists():
            with open(plan_path, 'r') as f:
                plan_data = yaml.safe_load(f)
        else:
            # Fallback: use what's in history as the base plan
            plan_data = {
                "dinners": week.get('dinners', []),
                "prep_tasks": week.get('prep_tasks', [])
            }
        
        # A week is only archived if its end date (start + 7 days) is in the past
        week_start = datetime.strptime(week_of, '%Y-%m-%d')
        week_end = week_start + timedelta(days=7)
        is_past = week_end < datetime.now()
        
        data = {
            "household_id": household_id,
            "week_of": week_of,
            "plan_data": plan_data,
            "history_data": week,
            "status": "archived" if is_past else "active"
        }
        
        supabase.table("meal_plans").insert(data).execute()
        print(f"Migrated week: {week_of}")

if __name__ == "__main__":
    h_id = migrate_household()
    migrate_recipes(h_id)
    migrate_inventory(h_id)
    migrate_history(h_id)
    print("\n✅ Migration complete!")
