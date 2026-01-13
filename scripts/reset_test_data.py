
import sys
import os
import yaml
from pathlib import Path

# Adjust path
sys.path.append(os.getcwd())
from api.utils.storage import StorageEngine
from scripts.inject_test_data import inject_pending_recipe

def reset_test():
    print("Resetting test data for 'Test Mystery Curry'...")
    
    # 1. Remove from ignored.yml
    ignored_path = Path('data/ignored.yml')
    if ignored_path.exists():
        try:
            with open(ignored_path, 'r') as f:
                ignored = yaml.safe_load(f) or []
            
            if 'Test Mystery Curry' in ignored:
                print("Removing from ignored list...")
                ignored.remove('Test Mystery Curry')
                with open(ignored_path, 'w') as f:
                    yaml.dump(ignored, f)
        except Exception as e:
            print(f"Error updating ignored.yml: {e}")

    # 2. Remove recipe file if exists (in case it was captured)
    recipe_path = Path('recipes/content/test_mystery_curry.md')
    if recipe_path.exists():
        print("Removing captured recipe file...")
        os.remove(recipe_path)
        
    # 3. Clean up DB recipe entry?
    # StorageEngine doesn't have delete_recipe yet, but if we delete the file and invalid cache, 
    # it might persist in DB until next sync. 
    # For now, let's assume file deletion is enough if we primarily check file existence or if we re-run migration.
    # Actually, get_pending_recipes checks DB. 
    # If it's in DB, we need to remove it.
    
    from supabase import create_client
    # Initialize Supabase (reusing logic from storage.py essentially)
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if url and key:
        sb = create_client(url, key)
        # Delete recipe
        sb.table("recipes").delete().eq("id", "test_mystery_curry").execute()
        print("Removed from recipes table.")

    # 4. Re-inject pending status
    inject_pending_recipe()
    
    print("Reset complete!")

if __name__ == "__main__":
    reset_test()
