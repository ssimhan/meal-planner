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

    def test_td_012_auto_populate_prep_tasks(self):
        """Test TD-012: Prep tasks auto-generated from ingredients during import."""
        # Simulate the markdown content that would be generated during manual capture
        markdown_content = """---
name: Test Stir Fry
cuisine: unknown
meal_type: dinner
effort_level: normal
---

# Test Stir Fry

## Ingredients
- 1 large onion, diced
- 3 cloves garlic, minced
- 1 lb chicken thighs
- 2 carrots, julienned
- 1 bunch spinach

## Instructions
1. Saute onion and garlic until soft.
2. Add chicken and cook through.
"""
        # Use prep task generator
        tasks = get_prep_tasks(markdown_content)
        
        # Should auto-detect these prep tasks from ingredients
        self.assertIn("Chop onions/shallots", tasks)
        self.assertIn("Mince garlic", tasks)
        self.assertIn("Prep/cut proteins", tasks)
        self.assertIn("Chop carrots", tasks)
        self.assertIn("Wash and chop greens", tasks)  # spinach
        
        # Should have at least 4 tasks
        self.assertGreaterEqual(len(tasks), 4)
        
    def test_td_008_pending_recipes_caching(self):
        """Test TD-008: Pending recipes cache with TTL."""
        from api.utils import storage
        
        # Clear any existing cache
        storage._pending_recipes_cache.clear()
        
        # Verify cache starts empty
        self.assertEqual(len(storage._pending_recipes_cache), 0)
        
        # Manually add a cache entry for testing
        import time
        test_household = "test-household-123"
        storage._pending_recipes_cache[test_household] = (["Test Recipe"], time.time())
        
        # Verify cache has entry
        self.assertEqual(len(storage._pending_recipes_cache), 1)
        self.assertIn(test_household, storage._pending_recipes_cache)
        
        # Verify invalidate clears specific entry
        storage.invalidate_pending_recipes_cache(test_household)
        self.assertNotIn(test_household, storage._pending_recipes_cache)
        
        # Add another entry and test global invalidation
        storage._pending_recipes_cache["another-household"] = (["Another Recipe"], time.time())
        storage.invalidate_pending_recipes_cache()  # Clear all
        self.assertEqual(len(storage._pending_recipes_cache), 0)
        
    def test_td_009_meal_service_helpers(self):
        """Test TD-009: Meal service helper functions work correctly."""
        from api.services.meal_service import (
            parse_made_status,
            find_or_create_dinner,
        )
        
        # Test parse_made_status
        self.assertEqual(parse_made_status('yes'), True)
        self.assertEqual(parse_made_status('true'), True)
        self.assertEqual(parse_made_status('no'), False)
        self.assertEqual(parse_made_status('freezer'), 'freezer_backup')
        self.assertEqual(parse_made_status('outside_meal'), 'outside_meal')
        self.assertEqual(parse_made_status('leftovers'), 'leftovers')
        self.assertEqual(parse_made_status(None), None)
        
        # Test find_or_create_dinner
        history_week = {'week_of': '2026-01-26', 'dinners': []}
        active_plan_data = {'dinners': [{'day': 'mon', 'recipe_ids': ['pasta']}]}
        
        # Should create new dinner
        dinner, was_created = find_or_create_dinner(history_week, 'mon', active_plan_data)
        self.assertTrue(was_created)
        self.assertEqual(dinner['day'], 'mon')
        self.assertIn('pasta', dinner['recipe_ids'])
        
        # Should find existing dinner
        dinner2, was_created2 = find_or_create_dinner(history_week, 'mon', active_plan_data)
        self.assertFalse(was_created2)
        self.assertEqual(dinner2, dinner)

if __name__ == '__main__':
    unittest.main()
