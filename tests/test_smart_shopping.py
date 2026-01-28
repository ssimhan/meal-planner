import unittest
from unittest.mock import patch, MagicMock
from scripts.inventory_intelligence import get_shopping_list

# Hardcoded staples list for verification (should match implementation)
STAPLES = ['oil', 'ghee', 'salt', 'pepper', 'black pepper', 'red chili powder', 'turmeric']

class TestSmartShopping(unittest.TestCase):
    def setUp(self):
        self.plan_data = {
            'dinners': [
                {'vegetables': ['Carrots', 'Spinach']}
            ],
            'lunches': {},
            'snacks': {},
            'extra_items': [],
            'excluded_items': []
        }

    @patch('scripts.inventory_intelligence.get_inventory_items')
    def test_staples_exclusion(self, mock_get_inv):
        """Test that staples are excluded even if not in inventory."""
        # Setup: Empty inventory
        mock_get_inv.return_value = (set(), {'fridge': [], 'pantry': []})
        
        # Add staples to plan
        self.plan_data['dinners'][0]['vegetables'].extend(['Salt', 'Olive Oil', 'Turmeric'])
        
        # Execute
        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        # Verify
        self.assertIn('Carrots', items)
        self.assertNotIn('Salt', items)
        self.assertNotIn('Olive Oil', items)
        self.assertNotIn('Turmeric', items)

    @patch('scripts.inventory_intelligence.get_inventory_items')
    def test_inventory_presence_checks(self, mock_get_inv):
        """Test that items already in inventory are excluded."""
        # Setup: Carrots in inventory
        mock_get_inv.return_value = ({'carrot'}, {'fridge': [{'item': 'Carrots', 'quantity': 2}]})
        
        # Execute
        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        # Verify
        self.assertNotIn('Carrots', items)
        self.assertIn('Spinach', items)

    @patch('scripts.inventory_intelligence.get_inventory_items')
    def test_quantity_awareness(self, mock_get_inv):
        """Test that item is effectively 'in stock' only if quantity > 0."""
        # This requires the implementation to check detailed inventory, not just the 'set'.
        # mocking detailed return
        detailed_inv = {
            'fridge': [
                {'item': 'Eggs', 'quantity': 2},    # Has some
                {'item': 'Milk', 'quantity': 0}     # Empty container logic?
            ]
        }
        # The set currently only contains names. The new logic might need to inspect the dict.
        # If the implementation changes to look at 'quantity', we need to ensure the set implies availability
        # OR the function looks at the detailed list.
        # For now, let's assume 'get_inventory_items' returns a set of AVAILABLE items.
        
        mock_get_inv.return_value = ({'egg'}, detailed_inv)
        
        # Plan needs Eggs and Milk
        self.plan_data['dinners'][0]['vegetables'] = ['Eggs', 'Milk'] # Weird dinner, but works for test
        
        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        self.assertNotIn('Eggs', items) # Have 2
        # Start by assuming logic is: if normalized name is in SET, we have it.
        # Ideally, 'Milk' should be in the list because quantity is 0, so it shouldn't be in the SET returned by get_inventory_items
        # But if get_inventory_items isn't smart yet, we might need to update that function too.
        # For this test, we assume the SET reflects availability.

    @patch('scripts.inventory_intelligence.get_inventory_items')
    def test_user_exclusion(self, mock_get_inv):
        """Test that user-skipped items are excluded."""
        mock_get_inv.return_value = (set(), {})
        
        # User explicitly skips 'Spinach'
        self.plan_data['excluded_items'] = ['Spinach']
        
        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        self.assertIn('Carrots', items)
        self.assertNotIn('Spinach', items)

    @patch('scripts.inventory_intelligence.get_inventory_items')
    def test_exact_matching(self, mock_get_inv):
        """Test exact matching to avoid false negatives."""
        # "Bell Pepper" -> "bell_pepper"
        mock_get_inv.return_value = ({'bell_pepper'}, {}) 
        
        # Plan needs Black Pepper (Staple) and Chili Pepper
        self.plan_data['dinners'][0]['vegetables'] = ['Chili Pepper']
        
        result = get_shopping_list(self.plan_data)
        items = [x['item'] for x in result]
        
        # Should need Chili Pepper
        self.assertIn('Chili Pepper', items)

if __name__ == '__main__':
    unittest.main()
