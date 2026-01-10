#!/usr/bin/env python3
"""
Update recipe index with lunch-specific fields.
Adds lunch_suitable, kid_friendly, prep_style, prep_components,
component_storage_days, and reuses_dinner_ingredients fields.

NOTE: This is a one-time migration script. Lunch defaults are now stored in
config.yml under the lunch_defaults section. See config.example.yml for reference.
"""

import yaml
from pathlib import Path

# Lunch-suitable recipes with their metadata
LUNCH_RECIPES = {
    'cheesy_veggie_quesadilla': {
        'lunch_suitable': True,
        'kid_friendly': True,
        'prep_style': 'component_based',
        'prep_components': ['cooked_beans', 'shredded_cheese', 'diced_vegetables'],
        'component_storage_days': 3,
        'reuses_dinner_ingredients': ['beans', 'cheese', 'bell_peppers', 'onions']
    },
    'greek_quesadillas': {
        'lunch_suitable': True,
        'kid_friendly': True,
        'prep_style': 'component_based',
        'prep_components': ['cooked_beans', 'shredded_cheese', 'chopped_vegetables'],
        'component_storage_days': 3,
        'reuses_dinner_ingredients': ['beans', 'cheese', 'tomatoes', 'cucumbers']
    },
    'sheet_pan_black_bean_quesadillas': {
        'lunch_suitable': True,
        'kid_friendly': True,
        'prep_style': 'component_based',
        'prep_components': ['cooked_black_beans', 'shredded_cheese', 'corn'],
        'component_storage_days': 3,
        'reuses_dinner_ingredients': ['black_beans', 'cheese', 'corn']
    },
    'curried_egg_salad_sandwich': {
        'lunch_suitable': True,
        'kid_friendly': False,  # curry flavor may not appeal to all kids
        'prep_style': 'component_based',
        'prep_components': ['hard_boiled_eggs', 'curry_mayo_mixture'],
        'component_storage_days': 2,
        'reuses_dinner_ingredients': ['eggs', 'curry_powder']
    },
    'refried_bean_burrito': {
        'lunch_suitable': True,
        'kid_friendly': True,
        'prep_style': 'component_based',
        'prep_components': ['refried_beans', 'shredded_cheese', 'rice'],
        'component_storage_days': 3,
        'reuses_dinner_ingredients': ['beans', 'cheese', 'rice']
    },
}

# Additional lunch recipes to add (generic examples - would need actual recipe IDs)
# These are defaults that don't need recipes in the index
LUNCH_DEFAULTS = {
    'pbj': 'PBJ on whole wheat',
    'egg_sandwich': 'Egg sandwich',
    'ravioli': 'Ravioli with butter',
    'chapati_roll': 'Chapati roll with fruit',
    'veggie_burrito': 'Veggie burrito'
}


def update_recipe_index():
    """Add lunch fields to recipe index."""
    index_path = Path('recipes/index.yml')

    # Read current index
    with open(index_path, 'r') as f:
        recipes = yaml.safe_load(f)

    # Track updates
    updated_count = 0

    # Update each recipe
    for recipe in recipes:
        recipe_id = recipe.get('id')

        # Add lunch fields if this recipe is in our lunch list
        if recipe_id in LUNCH_RECIPES:
            lunch_data = LUNCH_RECIPES[recipe_id]
            recipe.update(lunch_data)
            updated_count += 1
        else:
            # Add default values for non-lunch recipes
            recipe.setdefault('lunch_suitable', False)
            recipe.setdefault('kid_friendly', False)
            recipe.setdefault('prep_style', None)
            recipe.setdefault('prep_components', [])
            recipe.setdefault('component_storage_days', 0)
            recipe.setdefault('reuses_dinner_ingredients', [])

    # Write updated index
    with open(index_path, 'w') as f:
        yaml.dump(recipes, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"✅ Updated {updated_count} recipes as lunch-suitable")
    print(f"✅ Added lunch fields to all {len(recipes)} recipes")
    print(f"\nLunch-suitable recipes:")
    for recipe_id in LUNCH_RECIPES:
        print(f"  - {recipe_id}")


if __name__ == '__main__':
    update_recipe_index()
