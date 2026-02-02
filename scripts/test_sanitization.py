
import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add the project root to the path so we can import api modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import AFTER path addition
from api.utils import storage

class TestStorageSanitization(unittest.TestCase):
    def test_get_recipes_sanitization(self):
        """
        Verify that get_recipes returns empty lists for None values in list fields.
        """
        # Create a mock response with None values for list fields
        mock_data = [
            {
                "id": "recipe_1",
                "name": "Test Recipe",
                "metadata": {
                    "tags": None,       # Should be []
                    "main_veg": None,   # Should be []
                    "ingredients": None # Should be []
                }
            }
        ]
        
        # Patch the supabase client in the storage module
        with patch.object(storage, 'supabase') as mock_supabase:
            # Setup the mock chain: supabase.table().select().execute().data
            # Note: The code calls execute_with_retry(query), so we need to mock what that returns.
            # But execute_with_retry calls query.execute().
            # So: mock_supabase.table().select().eq().execute().data = mock_data
            
            # The chain in get_recipes is: 
            # query = supabase.table("recipes").select(...).eq(...)
            # res = execute_with_retry(query) -> query.execute()
            
            mock_query = MagicMock()
            mock_res = MagicMock()
            mock_res.data = mock_data
            mock_query.execute.return_value = mock_res
            
            # Setup the chain to return our mock query
            mock_supabase.table.return_value.select.return_value.eq.return_value = mock_query
            
            # We also need to patch get_household_id or ensure it returns something safe
            # storage.get_household_id calls getattr(request, ...). 
            # Since we are running outside of flask request context, we should patch it.
            
            with patch.object(storage, 'get_household_id', return_value='test-household'):
                # Call get_recipes (static method)
                recipes = storage.StorageEngine.get_recipes()
            
            # Check the first recipe
            if not recipes:
                self.fail("get_recipes returned empty list unexpectedly")

            r = recipes[0]
            
            print(f"Sanitization Check for {r['id']}:")
            print(f"  tags: {r['tags']} (Expected: [])")
            print(f"  main_veg: {r.get('main_veg')} (Expected: [])")
            # Note: ingredients are not usually returned by get_recipes (summary), 
            # but let's check tags and custom fields.
            
            # Assertions
            self.assertEqual(r['tags'], [], f"Tags should be [], got {r['tags']}")
            # main_veg isn't in default get_recipes transform currently, but we want to ADD it.
            # So if it's currently missing, that's fine, but if we add it, it should be sanitized.
            
            # Let's check 'cuisine' which defaults to 'unknown' in current code if None ?
            # Current code: "cuisine": (r.get('metadata') or {}).get('cuisine', 'unknown'),
            # This handles None metadata, but what if metadata exists but cuisine is None?
            # (r.get('metadata') or {}).get('cuisine', 'unknown') -> if metadata['cuisine'] is None, get returns None.
            # Wait, dict.get(key, default) only returns default if key is MISSING. If key is None, it returns None.
            # So we should test that too!
            

            self.assertEqual(r['cuisine'], 'unknown', f"Cuisine should be 'unknown', got {r['cuisine']}")

    def test_get_recipe_details_sanitization(self):
        """
        Verify that get_recipe_details returns sanitized dictionary.
        """
        mock_data = [
            {
                "id": "recipe_details_1",
                "name": "Detailed Recipe",
                "content": "# Test content",
                "metadata": {
                    "tags": None, 
                    "cuisine": None
                }
            }
        ]

        with patch.object(storage, 'supabase') as mock_supabase:
            mock_query = MagicMock()
            mock_res = MagicMock()
            mock_res.data = mock_data
            mock_query.execute.return_value = mock_res
            # Chain: .table().select().eq().eq()
            mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value = mock_query

            with patch.object(storage, 'get_household_id', return_value='test-household'):
                result = storage.StorageEngine.get_recipe_details("recipe_details_1")
            
            self.assertIsNotNone(result)
            r = result['recipe']
            
            print(f"Details Sanitization Check:")
            print(f"  tags: {r['tags']} (Expected: [])")
            print(f"  cuisine: {r['cuisine']} (Expected: 'unknown')")
            
            self.assertEqual(r['tags'], [])
            self.assertEqual(r['cuisine'], 'unknown')

if __name__ == '__main__':
    unittest.main()
