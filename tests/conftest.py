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
    
    with app.test_client() as client:
        yield client

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
