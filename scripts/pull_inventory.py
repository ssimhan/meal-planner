import sys
import yaml
from datetime import datetime

# Hack to mock flask request context or patch the helper
from api.utils import storage

def mock_get_household_id():
    # Return the default ID used in the codebase
    return "00000000-0000-0000-0000-000000000001"

# Patch the method in the module
storage.get_household_id = mock_get_household_id

from api.utils.storage import StorageEngine

def main():
    print("Pulling inventory from Supabase...")
    try:
        inventory = StorageEngine.get_inventory()
    except Exception as e:
        print(f"Error fetching inventory: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if not inventory:
        print("Inventory is empty or None")
    
    # Add last_updated timestamp
    inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Save to data/inventory.yml
    path = "data/inventory.yml"
    try:
        with open(path, 'w') as f:
            yaml.dump(inventory, f, default_flow_style=False, sort_keys=False)
        print(f"Inventory saved to {path} successfully.")
    except Exception as e:
        print(f"Error writing to file: {e}")
        sys.exit(1)
    
if __name__ == "__main__":
    main()
