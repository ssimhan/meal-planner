
from api.utils import storage
import json

# h_id = storage.get_household_id()
# Mock h_id for script execution
h_id = "00000000-0000-0000-0000-000000000001"
from flask import Flask, request
app = Flask(__name__)

category = "fridge"
item_name = "Test Meal X"
updates = {
    "quantity": 1,
    "unit": "unit",
    "type": "meal",
    "added": "2026-01-19"
}

with app.test_request_context():
    request.household_id = h_id
    print(f"Adding '{item_name}' to '{category}' with updates: {updates}")
    
    try:
        # 1. Update/Add Item
        storage.StorageEngine.update_inventory_item(category, item_name, updates=updates)
        
        # 2. Fetch Inventory
        print("Fetching inventory...")
        inventory = storage.StorageEngine.get_inventory()
        
        # 3. Find the item
        fridge_items = inventory.get('fridge', [])
        found_item = next((i for i in fridge_items if i.get('item') == item_name), None)
        
        if found_item:
            print(f"✅ Found item: {json.dumps(found_item, indent=2)}")
            if found_item.get('type') == 'meal':
                print("✅ SUCCESS: Item has type='meal'")
            else:
                print(f"❌ FAILURE: Item has type='{found_item.get('type')}' (expected 'meal')")
        else:
            print("❌ FAILURE: Item not found in inventory after update.")
            
        # Cleanup
        print("Cleaning up...")
        storage.StorageEngine.update_inventory_item(category, item_name, delete=True)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
