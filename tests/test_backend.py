import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

class TestApiStatus:
    @patch('api.index.get_yaml_data')
    def test_get_status_success(self, mock_get_yaml, client, mock_yaml_data):
        # Setup mocks
        mock_get_yaml.return_value = mock_yaml_data
        
        # Mock other dependencies if needed - api/index.py calls _get_current_status which calls get_yaml_data
        # It also calls datetime.now() likely.
        
        with patch('api.index.datetime') as mock_date:
            mock_date.now.return_value.strftime.return_value = "2026-01-05"
            mock_date.strptime =  lambda d, f: datetime.strptime(d, f)
             
            response = client.get('/api/status')
            
            assert response.status_code == 200
            data = response.get_json()
            assert 'status' in data

class TestLogMeal:
    @patch('api.index.get_yaml_data')
    @patch('scripts.github_helper.sync_changes_to_github') 
    @patch('scripts.log_execution.save_history') 
    def test_log_meal_success(self, mock_save_local, mock_sync_github, mock_get_yaml, client):
        mock_get_yaml.return_value = {
            'weeks': [
                {
                    'week_of': '2026-01-05',
                    'dinners': [{'day': 'mon', 'recipe_id': 'test', 'made': False}]
                }
            ]
        }
        
        payload = {
            'week': '2026-01-05',
            'day': 'mon',
            'meal_type': 'dinner',
            'made': True,
            'feedback': {'rating': 'loved'}
        }
        
        # Mock get_actual_path to return a path that exists for 'active' week check
        with patch('api.index.get_actual_path') as mock_path:
            # Simulate active week -> exists() = True
            mock_path.return_value.exists.return_value = True
            
            # Mock open() to avoid file read errors
            with patch('builtins.open', new_callable=MagicMock) as mock_open:
                # Mock yaml.safe_load for the file read
                with patch('api.index.yaml.safe_load') as mock_yaml_load:
                    mock_yaml_load.return_value = {
                        'week_of': '2026-01-05',
                        'dinners': [{'day': 'mon', 'recipe_id': 'test', 'made': False}]
                    }
                    
                    response = client.post('/api/log-meal', json=payload)
        
        assert response.status_code == 200
        # verify sync was called
        assert mock_sync_github.called
