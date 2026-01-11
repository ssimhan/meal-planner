import unittest
import sys
import os
from datetime import datetime

# Add root to python path to import api
sys.path.append(os.getcwd())

from api.utils.storage import StorageEngine

from api.index import app

class TestSupabaseIntegration(unittest.TestCase):
    
    def setUp(self):
        self.ctx = app.test_request_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_connection(self):
        """Verify we can fetch the active week."""
        try:
            plan = StorageEngine.get_active_week()
            if plan:
                print(f"Found active week: {plan.get('week_of')}")
            else:
                print("No active week found (but connection successful).")
            self.assertTrue(True) # Just ensuring no exception raised
        except Exception as e:
            self.fail(f"Connection failed: {e}")

    def test_02_recipes(self):
        """Verify we can fetch recipes."""
        recipes = StorageEngine.get_recipes()
        self.assertIsInstance(recipes, list)
        self.assertGreater(len(recipes), 0, "Should have migrated recipes")
        print(f"Fetched {len(recipes)} recipes.")

    def test_03_inventory_crud(self):
        """Test Create-Read-Delete cycle for inventory."""
        test_item = "INTEGRATION_TEST_ITEM"
        
        # 1. Create/Update
        StorageEngine.update_inventory_item('fridge', test_item, {'quantity': 999, 'unit': 'test'})
        
        # 2. Read
        inv = StorageEngine.get_inventory()
        fridge_items = [i['item'] for i in inv.get('fridge', [])]
        self.assertIn(test_item, fridge_items)
        
        # 3. Delete
        StorageEngine.update_inventory_item('fridge', test_item, delete=True)
        
        # 4. Verify Delete
        inv = StorageEngine.get_inventory()
        fridge_items = [i['item'] for i in inv.get('fridge', [])]
        self.assertNotIn(test_item, fridge_items)
        print("Inventory CRUD passed.")

    def test_04_history(self):
        """Verify we can fetch history."""
        hist = StorageEngine.get_history()
        self.assertIn('weeks', hist)
        self.assertGreater(len(hist['weeks']), 0, "Should have migrated history")

if __name__ == '__main__':
    unittest.main()
