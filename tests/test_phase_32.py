import unittest
import sys
from pathlib import Path

# Add root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.generate_prep_steps import get_prep_tasks
from api.utils.grocery_mapper import GroceryMapper
from scripts.inventory_intelligence import get_shopping_list

class TestPhase32Fixes(unittest.TestCase):
    
    def test_bug_001_heuristic_prep(self):
        """Test BUG-001: Heuristic prep task generation."""
        md_content = """
# Ingredients
- 1 onion, chopped
- 2 cloves garlic, minced
- 500g chicken breast

# Instructions
1. Marinate the chicken.
2. Saute onions and garlic.
"""
        tasks = get_prep_tasks(md_content)
        
        # Verify heuristics
        self.assertIn("Chop onions/shallots", tasks)
        self.assertIn("Mince garlic", tasks)
        self.assertIn("Prep/cut proteins", tasks)
        self.assertIn("Marinate proteins (ahead of time)", tasks)
        
    def test_td_001_category_inference(self):
        """Test TD-001: Category inference logic."""
        self.assertEqual(GroceryMapper.infer_category("Organic Milk"), "fridge")
        self.assertEqual(GroceryMapper.infer_category("Frozen Peas"), "freezer_ingredient")
        self.assertEqual(GroceryMapper.infer_category("Basmati Rice"), "pantry")
        self.assertEqual(GroceryMapper.infer_category("Yellow Onion"), "pantry")
        self.assertEqual(GroceryMapper.infer_category("Fresh Cilantro"), "fridge")
        
    def test_bug_002_shopping_list_extras_checking(self):
        """Test BUG-002: Shopping list extras check against inventory."""
        # Mock inventory having 'Milk'
        inventory_set = {'milk', 'onion_powder'}
        
        # Plan data with 'Milk' and 'Bread' as extras
        plan_data = {
            'extra_items': ['Milk', 'Bread'],
            'dinners': [],
            'excluded_items': []
        }
        
        # We need to mock get_inventory_items inside inventory_intelligence or pass state
        # Since get_shopping_list calls get_inventory_items internally, we'll patch it
        from unittest.mock import patch
        
        with patch('scripts.inventory_intelligence.get_inventory_items') as mock_inv:
            mock_inv.return_value = (inventory_set, {})
            
            shopping_list = get_shopping_list(plan_data)
            
            items = [i['item'] for i in shopping_list]
            
            # Milk is in inventory, so it should NOT be in shopping list (BUG-002 Fix)
            self.assertNotIn("Milk", items)
            self.assertIn("Bread", items)

if __name__ == '__main__':
    unittest.main()
