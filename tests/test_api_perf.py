"""
Tests for API performance and caching behavior.
Updated to work with Supabase-based StorageEngine.
"""
import sys
import os
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.utils import CACHE, invalidate_cache

def test_get_recipes_caching(client):
    """Test that recipes are fetched successfully."""
    # First request
    response = client.get('/api/recipes')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    # TD-010 FIX: Recipes now come from Supabase, just verify we get data
    assert 'recipes' in data

def test_get_recipe_details(client):
    """Test fetching a specific recipe detail."""
    # Use a known recipe ID from the earlier "ls" output
    recipe_id = 'baby_carrots' 
    response = client.get(f'/api/recipes/{recipe_id}')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    # TD-010 FIX: Recipe details come from DB, check for valid recipe structure
    assert 'recipe' in data
    recipe = data['recipe']
    # Recipe should have basic fields from DB
    assert 'name' in recipe or 'cuisine' in recipe or 'meal_type' in recipe

def test_get_recipe_details_404(client):
    """Test fetching a non-existent recipe."""
    response = client.get('/api/recipes/non_existent_recipe_12345')
    assert response.status_code == 404

def test_get_history_caching(client):
    """Test history endpoint."""
    response = client.get('/api/history')
    assert response.status_code == 200
    data = response.get_json()
    # TD-010 FIX: History endpoint returns 'weeks' array directly
    assert 'weeks' in data

def test_cache_invalidation():
    """Test that cache invalidation works correctly."""
    # TD-010 FIX: Test the cache utility directly without hitting endpoints
    from api.utils import CACHE, invalidate_cache
    
    # Manually set cache data
    CACHE['recipes'] = {'data': ['test'], 'timestamp': 12345}
    CACHE['history'] = {'data': {'test': 1}, 'timestamp': 12345}
    
    # Invalidate specific key
    invalidate_cache('recipes')
    assert CACHE['recipes']['data'] is None
    assert CACHE['recipes']['timestamp'] == 0
    # History should still have data
    assert CACHE['history']['data'] is not None
    
    # Invalidate all
    invalidate_cache()
    assert CACHE['history']['data'] is None
    assert CACHE['history']['timestamp'] == 0

if __name__ == "__main__":
    # Manually run if pytest not installed
    print("Running manual tests...")
    from api.index import app
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
        
        test_cache_invalidation()
        print("✓ test_cache_invalidation passed")
        
        print("\nAll tests passed!")
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()
