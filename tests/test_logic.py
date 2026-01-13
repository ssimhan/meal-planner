#!/usr/bin/env python3
import unittest
from scripts.mealplan import filter_recipes
from scripts.workflow.state import get_next_monday
from datetime import date

class TestMealPlannerLogic(unittest.TestCase):
    
    def test_get_next_monday(self):
        # This test ensures we always plan for a Monday
        next_mon = get_next_monday()
        self.assertEqual(next_mon.weekday(), 0) # 0 is Monday

    def test_filter_recipes_avoidance(self):
        # Mock data
        recipes = [
            {'id': 'good_dish', 'avoid_contains': [], 'meal_type': 'soup_stew'},
            {'id': 'eggplant_dish', 'avoid_contains': ['eggplant'], 'meal_type': 'soup_stew'}
        ]
        inputs = {'preferences': {'avoid_ingredients': ['eggplant']}}
        recent = set()
        
        filtered = filter_recipes(recipes, inputs, recent)
        
        # Should only contain the good dish
        ids = [r['id'] for r in filtered]
        self.assertIn('good_dish', ids)
        self.assertNotIn('eggplant_dish', ids)

    def test_filter_recipes_repetition(self):
        recipes = [
            {'id': 'old_dish', 'avoid_contains': [], 'meal_type': 'soup_stew'},
            {'id': 'new_dish', 'avoid_contains': [], 'meal_type': 'soup_stew'}
        ]
        inputs = {'preferences': {'avoid_ingredients': []}}
        recent = {'old_dish'}
        
        filtered = filter_recipes(recipes, inputs, recent)
        
        ids = [r['id'] for r in filtered]
        self.assertIn('new_dish', ids)
        self.assertNotIn('old_dish', ids)

if __name__ == '__main__':
    unittest.main()
