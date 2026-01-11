import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

class TestApiStatus:
    @patch('api.utils.storage.StorageEngine.get_active_week')
    @patch('api.utils.storage.StorageEngine.get_workflow_state')
    @patch('api.utils.auth.supabase', None)
    def test_get_status_success(self, mock_get_workflow_state, mock_get_active_week, client):
        # Setup mocks
        mock_get_active_week.return_value = {
            'week_of': '2026-01-05',
            'plan_data': {},
            'history_data': {}
        }
        mock_get_workflow_state.return_value = ('active', {})
        
        # Mock datetime in status route
        with patch('api.routes.status.datetime') as mock_date:
            mock_date.now.return_value.strftime.return_value = "2026-01-05"
            mock_date.now.return_value.weekday.return_value = 0 # Monday
            mock_date.strptime = lambda d, f: datetime.strptime(d, f)
             
            response = client.get('/api/status')
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'status' in data

class TestLogMeal:
    @patch('api.utils.storage.StorageEngine.update_meal_plan')
    @patch('api.utils.storage.StorageEngine.get_active_week')
    @patch('api.utils.storage.get_household_id')
    @patch('api.utils.auth.supabase', None) # Bypass auth check
    def test_log_meal_success(self, mock_h_id, mock_get_active, mock_update, client):
        mock_h_id.return_value = 'test_hid'
        
        # Mock get_active_week to return clean dictionary
        mock_get_active.return_value = {
            'week_of': '2026-01-05',
            'status': 'active',
            'plan_data': {},
            'history_data': {'dinners': [{'day': 'mon', 'recipe_id': 'test', 'made': False}]}
        }

        # Be careful: log_meal might call get_active_week with arguments?
        # get_active_week() is currently 0-arg staticmethod finding *current* week.
        # But log_meal logic might look for specific week using other queries.
        # log_meal loads data for the target week.
        # It calls: current_data = StorageEngine.get_active_week() ?? NO.
        # It calls internal logic to find week.
        
        # Checking meals.py:
        # It calls storage.StorageEngine.get_active_week() ONLY if finding active context?
        # Actually log_meal usually loads specific week file or DB record.
        # It calls: 
        #   target_week = ...
        #   data = storage.StorageEngine.get_week(target_week) ? NO, such method doesn't exist?
        
        # Let's check meals.py logic first.
        # If it queries supabase directly, I still need supabase mock.
        pass # Placeholder for thought trace adjustment
        
    @patch('api.utils.storage.StorageEngine.update_meal_plan')
    @patch('api.utils.storage.supabase') # Keep mocking supabase for query inside log_meal?
    @patch('api.utils.storage.get_household_id')
    @patch('api.utils.auth.supabase', None) 
    def test_log_meal_success(self, mock_h_id, mock_supabase, mock_update, client):
        mock_h_id.return_value = 'test_hid'
        
        # Mock builder for supabase queries inside log_meal (to find the week plan)
        mock_builder = MagicMock()
        mock_builder.eq.return_value = mock_builder
        mock_builder.lte.return_value = mock_builder
        mock_builder.gt.return_value = mock_builder
        mock_builder.order.return_value = mock_builder
        mock_builder.limit.return_value = mock_builder
        
        # Return a CLEAN dict, no mocks inside it
        mock_builder.execute.return_value.data = [
            {
                'week_of': '2026-01-05',
                'status': 'active',
                'plan_data': {},
                'history_data': {'dinners': [{'day': 'mon', 'recipe_id': 'test', 'made': False}]}
            }
        ]
        mock_supabase.table.return_value.select.return_value = mock_builder
        
        # log_meal calls _get_current_status which calls get_active_week
        # I ALSO need to mock get_active_week to use THIS SAME DATA or consistent data
        # because _get_current_status logic relies on it.
        # If I mock StorageEngine.get_active_week, I simplify _get_current_status call.
        
        with patch('api.utils.storage.StorageEngine.get_active_week') as mock_get_active:
             mock_get_active.return_value = {
                'week_of': '2026-01-05',
                'status': 'active',
                'plan_data': {},
                'history_data': {'dinners': [{'day': 'mon', 'recipe_id': 'test', 'made': False}]}
            }
             
             payload = {
                'week': '2026-01-05',
                'day': 'mon',
                'made': True,
                'kids_feedback': 'loved'
             }
             
             response = client.post('/api/log-meal', json=payload)
            
             assert response.status_code == 200
             assert mock_update.called
