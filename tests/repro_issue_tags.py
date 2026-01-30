import pytest
from unittest.mock import MagicMock, patch

class TestTagOverwrite:
    @patch('api.routes.recipes.StorageEngine')
    def test_bulk_update_smart_merge(self, mock_storage, client):
        """
        Verify that the bulk-update endpoint correctly merges system tags.
        """
        # 1. Setup Mock for existing recipes (returned by get_recipe_details inside the route)
        mock_storage.get_recipe_details.return_value = {
            'recipe': {
                'id': 'test_recipe_1',
                'name': 'Test Recipe',
                'tags': ['imported', 'family_favorite'], # 'imported' is system tag
                'cuisine': 'Italian'
            },
            'markdown': ''
        }
        
        # 2. Simulate Frontend Payload (Missing 'imported' tag)
        payload = {
            'updates': [
                {
                    'id': 'test_recipe_1',
                    'name': 'Test Recipe',
                    'metadata': {
                        'tags': ['family_favorite', 'easy'], # 'imported' is MISSING
                        'cuisine': 'Italian'
                    },
                    'content': ''
                }
            ]
        }
        
        # 3. Call the Endpoint
        # Pattern: Patch the decorator used in the route file
        with patch('api.routes.recipes.require_auth', side_effect=lambda f: f):
            response = client.post('/api/recipes/bulk-update', json=payload)
        
        assert response.status_code == 200
        
        # 4. Verify what was passed to StorageEngine.bulk_update_recipes
        assert mock_storage.bulk_update_recipes.called
        call_args = mock_storage.bulk_update_recipes.call_args
        prepared_updates = call_args[0][0]
        
        target_update = prepared_updates[0]
        final_tags = target_update['metadata']['tags']
        
        print(f"\nFinal Tags: {final_tags}")
        
        # ASSERTION for FIX:
        if 'imported' in final_tags:
            print("FIX VERIFIED: 'imported' tag was preserved/merged!")
        else:
            print("FIX FAILED: 'imported' tag was lost.")
            
        assert 'imported' in final_tags, "Fix Verified: imported tag IS preserved"
        assert 'easy' in final_tags, "New tag 'easy' IS added"
        assert 'family_favorite' in final_tags, "Existing user tag IS preserved"
