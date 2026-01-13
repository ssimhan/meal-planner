
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from api.utils.storage import StorageEngine
from api.utils import invalidate_cache

# Patch get_household_id to work without request context
import api.utils.storage
api.utils.storage.get_household_id = lambda: "00000000-0000-0000-0000-000000000001"

def deduplicate():
    print("Fetching inventory...")
    inv = StorageEngine.get_inventory()
    
    cats = [
        ('fridge', inv.get('fridge', [])),
        ('pantry', inv.get('pantry', [])),
        ('freezer_ingredient', inv.get('freezer', {}).get('ingredients', [])),
        # Meals (Backups) are usually distinct batches with dates, so maybe don't auto-merge?
        # But if they have same meal name and same date?
        # For safety, let's skip meals for now unless names match exactly and user wants to merge.
        # Let's stick to ingredients for now as per plan.
    ]
    
    updates_made = False
    
    for cat_name, items in cats:
        seen = {} # name -> item
        duplicates = []
        
        for item in items:
            name = item.get('item').lower().strip()
            if name in seen:
                duplicates.append((seen[name], item))
            else:
                seen[name] = item
                
        if duplicates:
            print(f"\nFound {len(duplicates)} duplicates in {cat_name}:")
            for original, dupe in duplicates:
                name = original.get('item')
                print(f" - Merging '{name}': {original.get('quantity')} + {dupe.get('quantity')}")
                
                # Merge
                new_qty = float(original.get('quantity', 0)) + float(dupe.get('quantity', 0))
                
                # Logic: Delete dupe, Update original
                # We need db_category
                db_cat = cat_name
                if cat_name == 'freezer_ingredient': db_cat = 'freezer_ingredient' # matches
                
                # Delete duplicate
                StorageEngine.update_inventory_item(db_cat, dupe.get('item'), delete=True)
                
                # Update original
                updates = {'quantity': new_qty}
                StorageEngine.update_inventory_item(db_cat, original.get('item'), updates=updates)
                
                updates_made = True
        else:
            print(f"No duplicates in {cat_name}.")

    if updates_made:
        print("\nInvalidating cache...")
        invalidate_cache('inventory')
        print("Deduplication complete.")
    else:
        print("\nInventory is clean.")

if __name__ == "__main__":
    deduplicate()
