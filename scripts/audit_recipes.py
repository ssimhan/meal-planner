#!/usr/bin/env python3
"""
Improved recipe audit script that:
1. Checks actual YAML files for ingredients/instructions
2. Only tags obvious non-meals (sauces, components, etc.) as "not meal"
"""

import sys
import os
import yaml
sys.path.insert(0, '.')
from api.utils.storage import supabase

H_ID = '00000000-0000-0000-0000-000000000001'
RECIPES_DIR = 'recipes/details'

# Keywords that indicate something is NOT a standalone meal
# Only if they appear as the main subject, not just an ingredient
NON_MEAL_PATTERNS = [
    ' sauce', ' dressing', ' crema', ' salsa', ' dip', ' spread',
    ' topping', ' frosting', ' glaze', ' marinade', ' seasoning',
    ' mix', ' powder', ' paste', ' puree', ' stock', ' broth'
]

def is_non_meal(recipe_name):
    """Check if recipe name suggests it's a component, not a meal"""
    name_lower = recipe_name.lower()
    
    # Check if it ends with a non-meal keyword or has it as a standalone word
    for pattern in NON_MEAL_PATTERNS:
        if name_lower.endswith(pattern) or f'{pattern} ' in name_lower or f' {pattern.strip()}' == name_lower:
            # Exceptions: if it's clearly a meal despite having the keyword
            if any(meal_word in name_lower for meal_word in ['tacos', 'burrito', 'bowl', 'pasta', 'gnocchi', 'panini', 'sandwich', 'quesadilla', 'enchilada', 'pizza', 'curry', 'pancakes']):
                return False
            return True
    
    return False

def check_yaml_file(recipe_id):
    """Check if YAML file has ingredients and instructions"""
    yaml_path = os.path.join(RECIPES_DIR, f'{recipe_id}.yaml')
    
    if not os.path.exists(yaml_path):
        return False, False
    
    try:
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
        
        has_ingredients = bool(data.get('ingredients'))
        has_instructions = bool(data.get('instructions') or data.get('directions'))
        
        return has_ingredients, has_instructions
    except Exception as e:
        print(f'  Error reading {yaml_path}: {e}')
        return False, False

def main():
    # First, remove all the tags we added before
    print('Removing previous audit tags...')
    res = supabase.table('recipes').select('*').eq('household_id', H_ID).execute()
    
    for recipe in res.data:
        metadata = recipe.get('metadata') or {}
        tags = metadata.get('tags', [])
        if isinstance(tags, str):
            tags = [tags] if tags else []
        
        # Remove our audit tags
        new_tags = [t for t in tags if t not in ['not meal', 'missing ingredients', 'missing instructions']]
        
        if len(new_tags) != len(tags):
            metadata['tags'] = new_tags
            metadata.pop('name', None)
            metadata.pop('id', None)
            supabase.table('recipes').update({'metadata': metadata}).eq('id', recipe['id']).eq('household_id', H_ID).execute()
    
    print('✓ Cleared previous tags\n')
    
    # Now do proper audit
    print(f'Auditing {len(res.data)} recipes...\n')
    
    not_meal_count = 0
    missing_ingredients_count = 0
    missing_instructions_count = 0
    
    for recipe in res.data:
        recipe_id = recipe['id']
        name = recipe['name']
        metadata = recipe.get('metadata') or {}
        
        tags = metadata.get('tags', [])
        if isinstance(tags, str):
            tags = [tags] if tags else []
        
        new_tags = list(tags)
        needs_update = False
        
        # Check if it's a non-meal (sauce, dressing, etc.)
        if is_non_meal(name) and 'not meal' not in new_tags:
            new_tags.append('not meal')
            needs_update = True
            not_meal_count += 1
            print(f'🔧 {name}: Component/sauce → "not meal"')
        
        # Check YAML file for ingredients/instructions
        has_ingredients, has_instructions = check_yaml_file(recipe_id)
        
        if not has_ingredients and 'missing ingredients' not in new_tags:
            new_tags.append('missing ingredients')
            needs_update = True
            missing_ingredients_count += 1
            print(f'📝 {name}: Missing ingredients')
        
        if not has_instructions and 'missing instructions' not in new_tags:
            new_tags.append('missing instructions')
            needs_update = True
            missing_instructions_count += 1
            print(f'📝 {name}: Missing instructions')
        
        if needs_update:
            metadata['tags'] = new_tags
            metadata.pop('name', None)
            metadata.pop('id', None)
            supabase.table('recipes').update({'metadata': metadata}).eq('id', recipe_id).eq('household_id', H_ID).execute()
    
    print(f'\n\n✓ Audit complete!\n')
    print(f'Final tag counts:')
    print(f'  - "not meal": {not_meal_count} recipes (sauces, components, etc.)')
    print(f'  - "missing ingredients": {missing_ingredients_count} recipes')
    print(f'  - "missing instructions": {missing_instructions_count} recipes')

if __name__ == '__main__':
    main()
