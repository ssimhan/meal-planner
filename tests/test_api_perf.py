import sys
import os
import json
from pathlib import Path

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.index import app, CACHE

def test_get_recipes_caching(client):
    """Test that recipes are fetched and cached."""
    # First request
    response = client.get('/api/recipes')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert len(data['recipes']) > 0
    
    # Verify cache is populated
    assert CACHE['recipes']['data'] is not None
    assert CACHE['recipes']['timestamp'] > 0

def test_get_recipe_details(client):
    """Test fetching a specific recipe detail."""
    # Use a known recipe ID from the earlier "ls" output
    recipe_id = 'baby_carrots' 
    response = client.get(f'/api/recipes/{recipe_id}')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    assert data['recipe']['id'] == recipe_id
    assert 'instructions' in data['recipe'] or 'categories' in data['recipe']

def test_get_recipe_details_404(client):
    """Test fetching a non-existent recipe."""
    response = client.get('/api/recipes/non_existent_recipe_12345')
    assert response.status_code == 404

def test_get_history_caching(client):
    """Test history endpoint and caching."""
    response = client.get('/api/history')
    assert response.status_code == 200
    
    # Verify cache is populated
    assert CACHE['history']['data'] is not None

def test_cache_invalidation(client):
    """Test that log-meal invalidates cache."""
    # Ensure cache is populated
    client.get('/api/history')
    assert CACHE['history']['data'] is not None
    
    # Simulate log-meal (using mocks or just checking the side effect if we could, 
    # but here we'll just check if calling the invalidation function works 
    # OR call the endpoint if we have dummy data. 
    # Let's import the invalidation function directly to test logic.)
    
    from api.index import invalidate_cache
    invalidate_cache('history')
    
    assert CACHE['history']['data'] is None
    assert CACHE['history']['timestamp'] == 0

if __name__ == "__main__":
    # Manually run if pytest not installed, slightly hacky but works for quick check
    print("Running manual tests...")
    test_app = app
    test_app.config['TESTING'] = True
    c = test_app.test_client()
    
    try:
        test_get_recipes_caching(c)
        print("✓ test_get_recipes_caching passed")
        
        test_get_recipe_details(c)
        print("✓ test_get_recipe_details passed")
        
        test_get_recipe_details_404(c)
        print("✓ test_get_recipe_details_404 passed")
        
        test_get_history_caching(c)
        print("✓ test_get_history_caching passed")
        
        test_cache_invalidation(c)
        print("✓ test_cache_invalidation passed")
        
        print("\nAll tests passed!")
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()
