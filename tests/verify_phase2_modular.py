import pytest
from unittest.mock import MagicMock, patch

class TestModularEnforcement:
    @patch('api.routes.meals.storage.supabase')
    @patch('api.routes.meals.storage.get_household_id')
    @patch('api.routes.meals.storage.execute_with_retry')
    @patch('api.routes.meals.require_auth', side_effect=lambda f: f)
    def test_log_meal_auto_create(self, mock_auth, mock_exec, mock_hid, mock_supabase, client):
        """
        Test that sending 'actual_meal' text (Legacy/QuickAdd) triggers auto-creation
        and sets 'recipe_ids' instead of 'actual_meal'.
        """
        mock_hid.return_value = 'test_hid'
        
        # Mock active plan
        mock_exec.return_value.data = [{
            'week_of': '2025-01-27',
            'plan_data': {},
            'history_data': {'dinners': [{'day': 'mon', 'recipe_id': 'old_r'}]}
        }]
        
        # Mock ensure_recipe_for_legacy_text via side_effect or patching the import in routes
        # We want to verify the logic in log_meal calls it.
        # But ensure_recipe IS imported inside log_meal function scope in my code!
        # So check api/routes/meals.py: "from api.services.meal_service import ensure_recipe_for_legacy_text"
        
        # We can patch 'api.services.meal_service.ensure_recipe_for_legacy_text' if mocked globally
        # OR patch 'api.routes.meals.ensure_recipe_for_legacy_text' NO, local import.
        # We have to patch where it is defined.
        with patch('api.services.meal_service.ensure_recipe_for_legacy_text') as mock_ensure:
            mock_ensure.return_value = ['auto_pizza']
            
            payload = {
                'week': '2025-01-27',
                'day': 'Monday',
                'actual_meal': 'Pizza', # Pure text
                'confirm_day': False
            }
            
            # Need to mock update_meal_plan to capture what is verified
            with patch('api.routes.meals.storage.StorageEngine.update_meal_plan') as mock_update:
                resp = client.post('/api/log-meal', json=payload)
                
                assert resp.status_code == 200
                
                # Check that ensure_recipe was called
                mock_ensure.assert_called_with('Pizza', 'test_hid')
                
                # Check that update_meal_plan received the correct history structure
                call_args = mock_update.call_args
                history_data = call_args[1].get('history_data')
                target_dinner = history_data['dinners'][0]
                
                print(f"\nFinal Dinner State: {target_dinner}")
                
                assert target_dinner['recipe_ids'] == ['auto_pizza'], "Should set recipe_ids from auto-create"
                assert 'actual_meal' not in target_dinner, "Should remove actual_meal keys"

    @patch('api.routes.meals.storage.supabase')
    @patch('api.routes.meals.storage.get_household_id')
    @patch('api.routes.meals.storage.execute_with_retry')
    @patch('api.routes.meals.require_auth', side_effect=lambda f: f)
    def test_log_meal_explicit_ids(self, mock_auth, mock_exec, mock_hid, mock_supabase, client):
        """Test that explicit recipe_ids are respected and legacy text is removed."""
        mock_hid.return_value = 'test_hid'
        mock_exec.return_value.data = [{
            'week_of': '2025-01-27',
            'plan_data': {},
            'history_data': {'dinners': [{'day': 'mon', 'actual_meal': 'Old Text'}]}
        }]

        with patch('api.services.meal_service.ensure_recipe_for_legacy_text') as mock_ensure:
            # Should NOT be called for the ids part, maybe for validation?
            # My logic: "if ids: iterate and ensure".
            mock_ensure.side_effect = lambda x, h: [x] # Pass through
            
            payload = {
                'week': '2025-01-27',
                'day': 'Monday',
                'recipe_ids': ['r1', 'r2'],
                'actual_meal': 'Pizza' # Should be ignored/cleared
            }
            
            with patch('api.routes.meals.storage.StorageEngine.update_meal_plan') as mock_update:
                resp = client.post('/api/log-meal', json=payload)
                assert resp.status_code == 200
                
                # Check state
                history_data = mock_update.call_args[1].get('history_data')
                target_dinner = history_data['dinners'][0]
                
                print(f"\nFinal Dinner State (IDs): {target_dinner}")
                
                assert set(target_dinner['recipe_ids']) == {'r1', 'r2'}
                assert 'actual_meal' not in target_dinner
