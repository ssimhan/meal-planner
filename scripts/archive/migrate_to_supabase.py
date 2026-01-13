import os
import sys
import yaml
import json
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('.env.local')

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("Missing environment variables. Make sure .env.local exists and has keys.")
    sys.exit(1)

supabase = create_client(url, key)
HOUSEHOLD_ID = "00000000-0000-0000-0000-000000000001"

def migrate_config():
    print("Migrating Config...")
    config_path = Path("config.yml")
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        supabase.table("households").upsert({
            "id": HOUSEHOLD_ID,
            "name": "Default Household",
            "config": config
        }).execute()
        print("Config migrated.")
    else:
        print("config.yml not found.")

def migrate_inventory():
    print("Migrating Inventory...")
    inv_path = Path("data/inventory.yml")
    if not inv_path.exists():
        print("data/inventory.yml not found.")
        return

    with open(inv_path, 'r') as f:
        data = yaml.safe_load(f)
    
    # Clear existing inventory to avoid duplicates/stale data
    # supabase.table("inventory_items").delete().eq("household_id", HOUSEHOLD_ID).execute()
    # Actually, let's just upsert. If names changed, we might have orphans, but safer not to wipe blindly.
    
    items_to_upsert = []
    
    # Fridge
    for item in data.get('fridge', []):
        metadata = {k: v for k, v in item.items() if k not in ['item', 'quantity', 'unit']}
        items_to_upsert.append({
            "household_id": HOUSEHOLD_ID,
            "category": "fridge",
            "item": item['item'],
            "quantity": item.get('quantity', 1),
            "unit": item.get('unit', 'count'),
            "metadata": metadata
        })
        
    # Pantry
    for item in data.get('pantry', []):
        metadata = {k: v for k, v in item.items() if k not in ['item', 'quantity', 'unit']}
        items_to_upsert.append({
            "household_id": HOUSEHOLD_ID,
            "category": "pantry",
            "item": item['item'],
            "quantity": item.get('quantity', 1),
            "unit": item.get('unit', 'count'),
            "metadata": metadata
        })

    # Freezer
    freezer = data.get('freezer', {})
    for item in freezer.get('backups', []):
        metadata = {k: v for k, v in item.items() if k not in ['meal', 'servings']}
        # Map 'meal' -> 'item', 'servings' -> 'quantity'
        items_to_upsert.append({
            "household_id": HOUSEHOLD_ID,
            "category": "freezer_backup",
            "item": item['meal'],
            "quantity": item.get('servings', 1),
            "unit": "servings",
            "metadata": metadata
        })
        
    for item in freezer.get('ingredients', []):
        metadata = {k: v for k, v in item.items() if k not in ['item', 'quantity', 'unit']}
        items_to_upsert.append({
            "household_id": HOUSEHOLD_ID,
            "category": "freezer_ingredient",
            "item": item['item'],
            "quantity": item.get('quantity', 1),
            "unit": item.get('unit', 'count'),
            "metadata": metadata
        })
        
    # Delete existing inventory to ensure clean slate (and avoid dupes since unique constraint is missing)
    try:
        supabase.table("inventory_items").delete().eq("household_id", HOUSEHOLD_ID).neq("id", "00000000-0000-0000-0000-000000000000").execute() 
        # Note: neq id 0 is hack to match all rows if delete requires a where clause, 
        # usually .eq("household_id", ...) is enough.
    except Exception as e:
        print(f"Error clearing inventory: {e}")
        
    if items_to_upsert:
        supabase.table("inventory_items").insert(items_to_upsert).execute()
        print(f"Migrated {len(items_to_upsert)} inventory items.")

def migrate_meal_plans():
    print("Migrating Meal Plans...")
    plans_map = {} # week_of -> {plan_data, history_data, status}
    
    # 1. Load History (Actuals)
    hist_path = Path("data/history.yml")
    if hist_path.exists():
        with open(hist_path, 'r') as f:
            hist_data = yaml.safe_load(f)
            for week in hist_data.get('weeks', []):
                w = str(week['week_of'])
                plans_map.setdefault(w, {})['history_data'] = week

    # 2. Load Inputs (Plans)
    inputs_dir = Path("inputs")
    if inputs_dir.exists():
        for f in inputs_dir.glob("*.yml"):
            week_str = f.stem
            with open(f, 'r') as yf:
                plan_data = yaml.safe_load(yf)
                plans_map.setdefault(week_str, {})['plan_data'] = plan_data
    
    # 3. Determine Status and Upsert
    today = datetime.now().date()
    batch = []
    
    for week_of, data in plans_map.items():
        try:
            week_start = datetime.strptime(week_of, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=7)
            
            status = "archived"
            if week_start <= today < week_end:
                status = "active"
            elif today < week_start:
                status = "planning"
            
            # Override if it looks like there's no data
            if not data.get('plan_data'):
                # status = "planning" # Keep inferred status
                pass
                
            batch.append({
                "household_id": HOUSEHOLD_ID,
                "week_of": week_of,
                "plan_data": data.get('plan_data', {}),
                "history_data": data.get('history_data', {}),
                "status": status
            })
        except ValueError:
            print(f"Skipping invalid week format: {week_of}")

    if batch:
        supabase.table("meal_plans").upsert(batch, on_conflict="household_id, week_of").execute()
        print(f"Migrated {len(batch)} meal plans.")

def migrate_recipes():
    print("Migrating Recipes...")
    # This might be tricky if recipes are split. 
    # Logic: Read index.yml for metadata, read contents/? to get markdown?
    # Or parsing raw? 
    # User said: "Migrated 227 recipes from HTML to Markdown with YAML frontmatter"
    # And listed `recipes/content` (232 files) and `recipes/details` (231 files).
    # `recipes/index.yml` likely contains the aggregated metadata.
    
    recipes_map = {}
    
    # Read index for base metadata
    index_path = Path("recipes/index.yml")
    if index_path.exists():
        with open(index_path, 'r') as f:
            index_data = yaml.safe_load(f) or []
            # index structure: list of dicts
            for meta in index_data:
                r_id = meta.get('id')
                if not r_id: continue
                
                recipes_map[r_id] = {
                    "household_id": HOUSEHOLD_ID,
                    "id": r_id,
                    "name": meta.get('name', r_id.replace('_', ' ').title()),
                    "metadata": meta,
                    "content": "" # Placeholder
                }
    else:
        print("recipes/index.yml not found. Recipe migration might be incomplete.")

    # Read content files to fill "content" field
    content_dir = Path("recipes/content")
    if content_dir.exists():
         for f in content_dir.glob("*.md"):
             r_id = f.stem
             with open(f, 'r') as rf:
                 content = rf.read()
             
             if r_id in recipes_map:
                 recipes_map[r_id]['content'] = content
             else:
                 # Recipe existing in content but not index? Create it.
                 recipes_map[r_id] = {
                    "household_id": HOUSEHOLD_ID,
                    "id": r_id,
                    "name": r_id.replace('_', ' ').title(),
                    "metadata": {},
                    "content": content
                 }
    
    if recipes_map:
        batch = list(recipes_map.values())
        # Chunking to avoid payload limits
        chunk_size = 50
        for i in range(0, len(batch), chunk_size):
            chunk = batch[i:i + chunk_size]
            try:
                supabase.table("recipes").upsert(chunk).execute()
                print(f"Migrated batch {i}-{i+len(chunk)} recipes.")
            except Exception as e:
                print(f"Error migrating recipes batch {i}: {e}")

if __name__ == "__main__":
    migrate_config()
    migrate_inventory()
    migrate_meal_plans()
    migrate_recipes()
    print("Migration Complete.")
