import sys
import os
import pytest
from unittest.mock import MagicMock

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture
def client():
    # Import app here to ensure sys.path is set
    from api.index import app
    
    app.config['TESTING'] = True
    
    class AuthenticatedClient:
        def __init__(self, test_client):
            self.test_client = test_client
            
        def get(self, *args, **kwargs):
            headers = kwargs.get('headers', {})
            headers['Authorization'] = 'Bearer MAGIC_TEST_TOKEN'
            kwargs['headers'] = headers
            return self.test_client.get(*args, **kwargs)
            
        def post(self, *args, **kwargs):
            headers = kwargs.get('headers', {})
            headers['Authorization'] = 'Bearer MAGIC_TEST_TOKEN'
            kwargs['headers'] = headers
            return self.test_client.post(*args, **kwargs)
    
    with app.test_client() as test_client:
        yield AuthenticatedClient(test_client)

@pytest.fixture
def mock_yaml_data():
    """Returns sample data for mocking."""
    return {
        'week_of': '2026-01-05',
        'dinners': [
            {'day': 'mon', 'recipe_id': 'test_recipe_1', 'made': False},
            {'day': 'tue', 'recipe_id': 'test_recipe_2', 'made': False}
        ],
        'history': {
            'weeks': []
        }
    }
