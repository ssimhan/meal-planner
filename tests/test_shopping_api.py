import unittest
import json
import os
# Set DISABLE_AUTH for testing
os.environ['DISABLE_AUTH'] = 'true'

from api.index import app
from unittest.mock import patch, MagicMock

class TestShoppingAPI(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        
        # Mock get_household_id to avoid DB calls
        self.household_patcher = patch('api.utils.storage.get_household_id', return_value='test-h-id')
        self.household_patcher.start()

    def tearDown(self):
        self.household_patcher.stop()

    @patch('api.utils.storage.StorageEngine.update_inventory_item')
    def test_smart_action_add_to_inventory(self, mock_update):
        """Test adding an item to inventory via smart-update API."""
        payload = {
            'week_of': '2026-01-26',
            'item': 'Onion',
            'action': 'add_to_inventory'
        }
        
        # We don't need auth headers because DISABLE_AUTH=true
        response = self.app.post('/api/plan/shopping-list/smart-update', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        
        # Verify call to storage
        mock_update.assert_called_once()
        args, kwargs = mock_update.call_args
        self.assertEqual(args[0], 'pantry')
        self.assertEqual(args[1], 'Onion')

    @patch('api.utils.storage.StorageEngine.update_meal_plan')
    @patch('api.utils.storage.supabase.table')
    def test_smart_action_exclude_from_plan(self, mock_table, mock_update_plan):
        """Test excluding an item from plan via smart-update API."""
        # Mock get_meal_plan
        mock_res = MagicMock()
        mock_res.data = [{'plan_data': {'excluded_items': ['Salt']}}]
        mock_table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_res
        
        payload = {
            'week_of': '2026-01-26',
            'item': 'Saffron',
            'action': 'exclude_from_plan'
        }
        
        response = self.app.post('/api/plan/shopping-list/smart-update', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'success')
        
        # Verify update_meal_plan was called with appended item
        args, kwargs = mock_update_plan.call_args
        self.assertEqual(args[0], '2026-01-26')
        self.assertIn('Saffron', kwargs['plan_data']['excluded_items'])
        self.assertIn('Salt', kwargs['plan_data']['excluded_items'])

    def test_smart_action_invalid_fields(self):
        """Test error handling for missing fields."""
        payload = {'item': 'Onion'}
        response = self.app.post('/api/plan/shopping-list/smart-update', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['code'], 'MISSING_FIELDS')

if __name__ == '__main__':
    unittest.main()
