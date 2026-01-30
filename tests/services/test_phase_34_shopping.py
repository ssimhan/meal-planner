import unittest
from unittest.mock import patch, MagicMock
from scripts.inventory_intelligence import get_shopping_list

class TestPhase34ShoppingLogic(unittest.TestCase):
    def setUp(self):
        self.plan_data = {
            'dinners': [
                {
                    'day': 'mon',
                    'recipe_ids': ['rasam_rice', 'beetroot_kai'],
                    'vegetables': ['Coriander'] # Manual additions or cached
                }
            ],
            'lunches': {},
            'snacks': {},
            'extra_items': [],
            'excluded_items': []
        }

    @patch('scripts.inventory_intelligence.get_inventory_items')
    @patch('api.utils.storage.StorageEngine.get_recipe_content')
    @patch('api.utils.storage.StorageEngine.get_config')
    def test_multi_recipe_aggregation(self, mock_get_config, mock_get_recipe, mock_get_inv):
        """Test that ingredients from multiple recipes in one slot are aggregated."""
        mock_get_inv.return_value = (set(), {})
        mock_get_config.return_value = {}
        
        # Mock recipe contents
        mock_get_recipe.side_effect = lambda rid: {
            'rasam_rice': {'ingredients': ['Tamarind', 'Tomato']},
            'beetroot_kai': {'ingredients': ['Beetroot', 'Coconut']}
        }.get(rid, {'ingredients': []})

        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        # Should include ingredients from both recipes
        # Note: current implementation might only look at 'vegetables' field if we don't update it to look at ingredients
        # In this project 'vegetables' in the plan usually maps to the main ingredients needed for shopping.
        self.assertIn('Tomato', items)
        self.assertIn('Beetroot', items)

    @patch('scripts.inventory_intelligence.get_inventory_items')
    @patch('api.utils.storage.StorageEngine.get_config')
    def test_permanent_pantry_filtering(self, mock_get_config, mock_get_inv):
        """Test that items in permanent_pantry are filtered out."""
        mock_get_inv.return_value = (set(), {})
        mock_get_config.return_value = {
            'permanent_pantry': ['Turmeric', 'Salt', 'Rice']
        }
        
        self.plan_data['dinners'][0]['vegetables'] = ['Tomato', 'Turmeric', 'Rice']
        
        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        self.assertIn('Tomato', items)
        self.assertNotIn('Turmeric', items)
        self.assertNotIn('Rice', items)

if __name__ == '__main__':
    unittest.main()
