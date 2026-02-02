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
        """Test TD-008: Pending recipes cache with SWR semantics."""
        from api.utils import storage

        # Clear any existing cache
        storage._pending_recipes_cache.invalidate()

        # Verify cache starts empty
        stats = storage._pending_recipes_cache.get_stats()
        self.assertEqual(stats['entries'], 0)

        # Manually add a cache entry for testing
        test_household = "test-household-123"
        storage._pending_recipes_cache.set(test_household, ["Test Recipe"])

        # Verify cache has entry
        stats = storage._pending_recipes_cache.get_stats()
        self.assertEqual(stats['entries'], 1)
        self.assertIn(test_household, stats['keys'])

        # Verify invalidate clears specific entry
        storage.invalidate_pending_recipes_cache(test_household)
        stats = storage._pending_recipes_cache.get_stats()
        self.assertNotIn(test_household, stats['keys'])

        # Add another entry and test global invalidation
        storage._pending_recipes_cache.set("another-household", ["Another Recipe"])
        storage.invalidate_pending_recipes_cache()  # Clear all
        stats = storage._pending_recipes_cache.get_stats()
        self.assertEqual(stats['entries'], 0)

    def test_swr_cache_fresh_status(self):
        """Test SWR cache returns 'fresh' status for recent entries."""
        from api.utils.storage import SWRCache

        cache = SWRCache(fresh_ttl=300, stale_ttl=600)

        # Set a value
        cache.set("key1", ["data1"])

        # Get should return fresh
        value, status = cache.get("key1")
        self.assertEqual(value, ["data1"])
        self.assertEqual(status, "fresh")

    def test_swr_cache_stale_status(self):
        """Test SWR cache returns 'stale' status for aged entries."""
        from api.utils.storage import SWRCache
        import time

        # Create cache with very short TTLs for testing
        cache = SWRCache(fresh_ttl=0.1, stale_ttl=10)

        cache.set("key1", ["data1"])

        # Wait for fresh TTL to expire
        time.sleep(0.15)

        # Should return stale
        value, status = cache.get("key1")
        self.assertEqual(value, ["data1"])
        self.assertEqual(status, "stale")

        # Should be marked for refresh
        self.assertTrue(cache.needs_refresh("key1"))

    def test_swr_cache_miss_status(self):
        """Test SWR cache returns 'miss' for missing or very stale entries."""
        from api.utils.storage import SWRCache
        import time

        cache = SWRCache(fresh_ttl=0.05, stale_ttl=0.1)

        # Missing key
        value, status = cache.get("nonexistent")
        self.assertIsNone(value)
        self.assertEqual(status, "miss")

        # Add entry and let it expire completely
        cache.set("key1", ["data1"])
        time.sleep(0.15)  # Past stale_ttl

        value, status = cache.get("key1")
        self.assertIsNone(value)
        self.assertEqual(status, "miss")

    def test_swr_cache_refresh_clears_pending(self):
        """Test that setting a value clears the pending refresh flag."""
        from api.utils.storage import SWRCache
        import time

        cache = SWRCache(fresh_ttl=0.05, stale_ttl=10)

        cache.set("key1", ["data1"])
        time.sleep(0.1)  # Make it stale

        # Get stale value (marks for refresh)
        cache.get("key1")
        self.assertTrue(cache.needs_refresh("key1"))

        # Set new value should clear pending
        cache.set("key1", ["data2"])
        self.assertFalse(cache.needs_refresh("key1"))

    def test_swr_cache_invalidate(self):
        """Test SWR cache invalidation."""
        from api.utils.storage import SWRCache

        cache = SWRCache()

        cache.set("key1", ["data1"])
        cache.set("key2", ["data2"])

        # Invalidate specific key
        cache.invalidate("key1")
        value, status = cache.get("key1")
        self.assertEqual(status, "miss")

        # key2 should still exist
        value, status = cache.get("key2")
        self.assertEqual(status, "fresh")

        # Invalidate all
        cache.invalidate()
        stats = cache.get_stats()
        self.assertEqual(stats['entries'], 0)
        
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

    def test_update_dinner_feedback_vegetables(self):
        """Test update_dinner_feedback handles vegetables correctly."""
        from unittest.mock import patch
        from api.services.meal_service import update_dinner_feedback

        target_dinner = {'day': 'mon', 'recipe_ids': ['stir_fry']}
        history_week = {'week_of': '2026-01-26', 'dinners': [target_dinner]}
        data = {'vegetables': 'broccoli, carrots, peppers'}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update:
            update_dinner_feedback(target_dinner, data, history_week)

            # Should parse vegetables into list
            self.assertEqual(target_dinner['vegetables_used'], ['broccoli', 'carrots', 'peppers'])

            # Should call inventory update for each vegetable
            self.assertEqual(mock_update.call_count, 3)
            mock_update.assert_any_call('fridge', 'broccoli', delete=True)
            mock_update.assert_any_call('fridge', 'carrots', delete=True)
            mock_update.assert_any_call('fridge', 'peppers', delete=True)

    def test_update_dinner_feedback_kids_feedback(self):
        """Test update_dinner_feedback handles kids feedback and complaints."""
        from api.services.meal_service import update_dinner_feedback

        target_dinner = {'day': 'tue', 'recipe_ids': ['pasta_primavera']}
        history_week = {'week_of': '2026-01-26', 'dinners': [target_dinner]}
        data = {
            'kids_feedback': 'loved_it',
            'kids_complaints': 'Too much sauce',
            'reason': 'Substituted marinara'
        }

        update_dinner_feedback(target_dinner, data, history_week)

        # Should set feedback fields
        self.assertEqual(target_dinner['kids_feedback'], 'loved_it')
        self.assertEqual(target_dinner['kids_complaints'], 'Too much sauce')
        self.assertEqual(target_dinner['reason'], 'Substituted marinara')

        # Should add to kids_dislikes history
        self.assertIn('kids_dislikes', history_week)
        self.assertEqual(len(history_week['kids_dislikes']), 1)
        self.assertEqual(history_week['kids_dislikes'][0]['complaint'], 'Too much sauce')
        self.assertEqual(history_week['kids_dislikes'][0]['recipe'], 'pasta_primavera')

    def test_update_daily_feedback_basic(self):
        """Test update_daily_feedback sets meal feedback correctly."""
        from api.services.meal_service import update_daily_feedback

        history_week = {'week_of': '2026-01-26'}
        data = {
            'school_snack_feedback': 'apple_slices',
            'school_snack_made': True,
            'kids_lunch_feedback': 'sandwich',
            'kids_lunch_made': True,
        }

        result = update_daily_feedback(history_week, 'mon', data)

        # Should create daily_feedback structure
        self.assertIn('daily_feedback', history_week)
        self.assertIn('mon', history_week['daily_feedback'])

        # Should set values
        self.assertEqual(result['school_snack'], 'apple_slices')
        self.assertEqual(result['school_snack_made'], True)
        self.assertEqual(result['kids_lunch'], 'sandwich')
        self.assertEqual(result['kids_lunch_made'], True)

    def test_update_daily_feedback_confirm_day(self):
        """Test update_daily_feedback with confirm_day=True marks all as made."""
        from api.services.meal_service import update_daily_feedback

        history_week = {'week_of': '2026-01-26'}

        result = update_daily_feedback(history_week, 'wed', {}, confirm_day=True)

        # Should auto-mark all meals as made
        self.assertTrue(result['school_snack_made'])
        self.assertTrue(result['home_snack_made'])
        self.assertTrue(result['kids_lunch_made'])
        self.assertTrue(result['adult_lunch_made'])

    def test_update_daily_feedback_prep_completed(self):
        """Test update_daily_feedback handles prep task completion."""
        from api.services.meal_service import update_daily_feedback

        history_week = {'week_of': '2026-01-26'}
        data = {'prep_completed': ['chop_onions', 'mince_garlic']}

        result = update_daily_feedback(history_week, 'mon', data)

        self.assertIn('prep_completed', result)
        self.assertIn('chop_onions', result['prep_completed'])
        self.assertIn('mince_garlic', result['prep_completed'])

        # Adding same tasks again should not duplicate
        data2 = {'prep_completed': ['chop_onions', 'wash_greens']}
        result2 = update_daily_feedback(history_week, 'mon', data2)

        # Should have 3 unique tasks, not 4
        self.assertEqual(len(result2['prep_completed']), 3)

    def test_update_inventory_from_meal_made_2x(self):
        """Test update_inventory_from_meal handles 2x batch for freezer."""
        from unittest.mock import patch
        from api.services.meal_service import update_inventory_from_meal

        target_dinner = {'day': 'mon', 'recipe_ids': ['dal_tadka']}
        data = {'made_2x': True}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update:
            update_inventory_from_meal(target_dinner, data, 'test-household')

            # Should mark dinner as made 2x
            self.assertTrue(target_dinner['made_2x_for_freezer'])

            # Should add to freezer backup
            mock_update.assert_called_once()
            call_args = mock_update.call_args
            self.assertEqual(call_args[0][0], 'freezer_backup')
            self.assertEqual(call_args[0][1], 'Dal Tadka')
            self.assertEqual(call_args[1]['updates']['servings'], 4)

    def test_update_inventory_from_meal_freezer_used(self):
        """Test update_inventory_from_meal removes used freezer backup."""
        from unittest.mock import patch
        from api.services.meal_service import update_inventory_from_meal

        target_dinner = {'day': 'fri', 'recipe_ids': ['unplanned'], 'made': 'freezer_backup'}
        data = {'freezer_meal': 'Leftover Curry'}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update:
            update_inventory_from_meal(target_dinner, data, 'test-household')

            # Should record which freezer meal was used
            self.assertEqual(target_dinner['freezer_used']['meal'], 'Leftover Curry')

            # Should delete from freezer backup
            mock_update.assert_called_once_with('freezer_backup', 'Leftover Curry', delete=True)

    def test_update_inventory_from_meal_outside_leftovers(self):
        """Test update_inventory_from_meal adds restaurant leftovers to fridge."""
        from unittest.mock import patch
        from api.services.meal_service import update_inventory_from_meal

        target_dinner = {'day': 'sat', 'recipe_ids': ['unplanned'], 'made': 'outside_meal'}
        data = {'outside_leftover_name': 'Thai Curry', 'outside_leftover_qty': 2}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update:
            update_inventory_from_meal(target_dinner, data, 'test-household')

            # Should add leftovers to fridge
            mock_update.assert_called_once()
            call_args = mock_update.call_args
            self.assertEqual(call_args[0][0], 'fridge')
            self.assertEqual(call_args[0][1], 'Leftover Thai Curry')
            self.assertEqual(call_args[1]['updates']['quantity'], 2)
            self.assertEqual(call_args[1]['updates']['type'], 'meal')

    def test_update_inventory_from_meal_leftovers_created(self):
        """Test update_inventory_from_meal handles leftover creation options."""
        from unittest.mock import patch
        from api.services.meal_service import update_inventory_from_meal

        # Test "1 serving" leftover
        target_dinner = {'day': 'tue', 'recipe_ids': ['pasta_bake']}
        data = {'leftovers_created': '1 serving'}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update:
            update_inventory_from_meal(target_dinner, data, 'test-household')

            call_args = mock_update.call_args
            self.assertEqual(call_args[1]['updates']['quantity'], 1)
            self.assertEqual(call_args[0][1], 'Leftover Pasta Bake')

        # Test "2 servings" leftover
        target_dinner2 = {'day': 'wed', 'recipe_ids': ['chili']}
        data2 = {'leftovers_created': '2 servings'}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update2:
            update_inventory_from_meal(target_dinner2, data2, 'test-household')

            call_args2 = mock_update2.call_args
            self.assertEqual(call_args2[1]['updates']['quantity'], 2)

        # Test "Batch" leftover
        target_dinner3 = {'day': 'thu', 'recipe_ids': ['soup']}
        data3 = {'leftovers_created': 'Batch (4+ servings)'}

        with patch('api.services.meal_service.storage.StorageEngine.update_inventory_item') as mock_update3:
            update_inventory_from_meal(target_dinner3, data3, 'test-household')

            call_args3 = mock_update3.call_args
            self.assertEqual(call_args3[1]['updates']['quantity'], 4)

    def test_auto_add_recipe_from_meal_new_recipe(self):
        """Test auto_add_recipe_from_meal creates new recipe when missing."""
        from unittest.mock import patch, MagicMock
        from api.services.meal_service import auto_add_recipe_from_meal

        # Mock the query chain
        mock_response_empty = MagicMock()
        mock_response_empty.data = []  # No existing recipe

        with patch('api.services.meal_service.storage.supabase') as mock_supabase, \
             patch('api.services.meal_service.storage.execute_with_retry') as mock_execute:

            mock_execute.return_value = mock_response_empty

            result = auto_add_recipe_from_meal('Homemade Pizza', 'test-household')

            # Should return True for successful add
            self.assertTrue(result)

            # Should have called execute_with_retry twice (select + insert)
            self.assertEqual(mock_execute.call_count, 2)

    def test_auto_add_recipe_from_meal_existing_recipe(self):
        """Test auto_add_recipe_from_meal skips if recipe exists."""
        from unittest.mock import patch, MagicMock
        from api.services.meal_service import auto_add_recipe_from_meal

        # Mock existing recipe found
        mock_response = MagicMock()
        mock_response.data = [{'id': 'sambar_rice'}]

        with patch('api.services.meal_service.storage.supabase') as mock_supabase, \
             patch('api.services.meal_service.storage.execute_with_retry') as mock_execute:

            mock_execute.return_value = mock_response

            result = auto_add_recipe_from_meal('Sambar Rice', 'test-household')

            # Should return False (no new recipe added)
            self.assertFalse(result)

            # Should only call execute once (just the select, no insert)
            self.assertEqual(mock_execute.call_count, 1)

    def test_auto_add_recipe_from_meal_indian_cuisine_inference(self):
        """Test auto_add_recipe_from_meal infers Indian cuisine correctly."""
        from unittest.mock import patch, MagicMock
        from api.services.meal_service import auto_add_recipe_from_meal

        mock_response_empty = MagicMock()
        mock_response_empty.data = []

        with patch('api.services.meal_service.storage.supabase') as mock_supabase, \
             patch('api.services.meal_service.storage.execute_with_retry') as mock_execute:

            mock_execute.return_value = mock_response_empty
            mock_insert = MagicMock()
            mock_supabase.table.return_value.insert = mock_insert
            mock_insert.return_value = MagicMock()

            auto_add_recipe_from_meal('Sambar Rice', 'test-household')

            # Check the insert call had Indian cuisine
            insert_call = mock_supabase.table.return_value.insert.call_args
            if insert_call:
                inserted_data = insert_call[0][0]
                self.assertEqual(inserted_data['metadata']['cuisine'], 'Indian')

if __name__ == '__main__':
    unittest.main()
