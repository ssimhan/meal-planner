#!/usr/bin/env python3
import unittest
import re
from lunch_selector import LunchSuggestion

# We'll re-implement the logic here for testing, or import it if we refactored workflow.py to be importable
# Since workflow.py is a monolithic script, I'll copy the core logic function for verification.

def categorize_ingredient(item, target_lists):
    """Helper to categorize an ingredient into the correct list."""
    c = item.lower().replace('_', ' ')
    
    # Shelf Stable keywords (check first for peanut/almond butter)
    if any(k in c for k in ['peanut butter', 'almond butter', 'cracker', 'pretzel', 'popcorn', 'pitted dates', 'nut', 'trail mix', 'granola', 'rice cake']):
        target_lists['shelf'].append(c)
    # Produce keywords
    elif any(k in c for k in ['apple', 'banana', 'grape', 'cucumber', 'carrot', 'tomato', 'pepper', 'onion', 'garlic', 'vegetable', 'fruit', 'lemon', 'lime', 'ginger']):
        target_lists['produce'].append(c)
    # Dairy keywords
    elif any(k in c for k in ['cheese', 'yogurt', 'cream cheese', 'hummus', 'milk', 'butter', 'paneer']):
        target_lists['dairy'].append(c)
    # Grains keywords
    elif any(k in c for k in ['rice', 'quinoa', 'pasta', 'bread', 'tortilla', 'roll', 'bagel', 'couscous']):
        target_lists['grains'].append(c)
    # Canned keywords
    elif any(k in c for k in ['canned', 'beans', 'chickpea', 'tomato sauce', 'soup base', 'chana']):
        target_lists['canned'].append(c)
    else:
        target_lists['misc'].append(c)

class TestGroceryCategoryLogic(unittest.TestCase):
    def setUp(self):
        self.lists = {
            'produce': [],
            'dairy': [],
            'grains': [],
            'shelf': [],
            'canned': [],
            'frozen': [],
            'misc': []
        }

    def test_snack_splitting_and_categorization(self):
        default_snacks = {
            'mon': 'Apple slices with peanut butter',
            'tue': 'Cheese and crackers',
            'fri': 'Crackers with hummus'
        }
        
        snack_items = []
        for snack in default_snacks.values():
            parts = re.split(r' with | and |, ', snack, flags=re.IGNORECASE)
            for part in parts:
                clean_part = part.strip().lower()
                clean_part = clean_part.replace('slices', '').replace('rounds', '').strip()
                if clean_part:
                    snack_items.append(clean_part)
        
        for item in snack_items:
            categorize_ingredient(item, self.lists)
            
        # Verify components are split and categorized
        self.assertIn('apple', self.lists['produce'])
        self.assertIn('peanut butter', self.lists['shelf'])
        self.assertIn('cheese', self.lists['dairy'])
        self.assertIn('crackers', self.lists['shelf'])
        self.assertIn('hummus', self.lists['dairy'])
        
    def test_butter_differentiation(self):
        # Regular butter should be dairy
        categorize_ingredient('butter', self.lists)
        self.assertIn('butter', self.lists['dairy'])
        
        # Peanut butter should be shelf
        categorize_ingredient('peanut butter', self.lists)
        self.assertIn('peanut butter', self.lists['shelf'])
        
    def test_grains_vs_canned(self):
        categorize_ingredient('rice', self.lists)
        self.assertIn('rice', self.lists['grains'])
        
        categorize_ingredient('canned beans', self.lists)
        self.assertIn('canned beans', self.lists['canned'])

if __name__ == '__main__':
    unittest.main()
