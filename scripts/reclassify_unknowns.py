#!/usr/bin/env python3
"""
Bulk reclassify the remaining 36 unknown recipes based on manual analysis.
This is a one-time script to fix the remaining unknowns.
"""

import yaml
from pathlib import Path

# Mapping from recipe_id to new template
RECLASSIFICATIONS = {
    # Simple snacks (13)
    'baby_carrots': 'simple_snack',
    'chex_cereal': 'simple_snack',
    'freeze_dried_fruits': 'simple_snack',
    'fruit_bar': 'simple_snack',
    'mini_orange': 'simple_snack',
    'raisins': 'simple_snack',
    'sliced_cucumber': 'simple_snack',
    'sliced_bell_pepper': 'simple_snack',
    'strawberries': 'simple_snack',
    'sunflower_seeds': 'simple_snack',
    'veggie_straws': 'simple_snack',
    'wheat_thins_or_triscuits': 'simple_snack',
    'homemade_popcorn': 'simple_snack',

    # Snack bars (7)
    'carrot_cake_bars': 'snack_bar',
    'chocolate_banana_bark': 'snack_bar',
    'healthy_breakfast_bars_with_jam': 'snack_bar',
    'healthy_homemade_fruit_roll_ups_flavor_guide': 'snack_bar',
    'porridge_fingers': 'snack_bar',
    'easy_fruit_snacks_gummies': 'snack_bar',
    'vegan_chocolate_mousse': 'snack_bar',

    # Breakfast (6)
    'granny_eggs': 'breakfast',
    'hard_boiled_egg': 'breakfast',
    'instant_nei_appam': 'breakfast',
    'paneeer_corn_utthapam': 'breakfast',
    'favorite_yogurt_drinks': 'breakfast',
    'mango_yogurt': 'breakfast',

    # Sandwich (3)
    'cucumber_cream_cheese_bagel': 'sandwich',
    'high_protein_marry_me_breakfast_toast': 'sandwich',
    'veggie_roti': 'sandwich',

    # Grain bowl (2)
    'mexican_sabudana_khichdi': 'grain_bowl',
    'sweet_and_sour_quinoa': 'grain_bowl',

    # Miscellaneous (5)
    'pretzels': 'baked_goods',
    'yogurt_bites': 'frozen_treat',
    'petra_a_sunglow_kitchen_comment_cheese_and_i_will_send_you_the_recipe_creamy_thick_and_tangy_this_sunflower_seed_cream_cheese_is_the_best_dairy_free_cream_instagram': 'sauce_dip',
    'mexican_papdi_chaat': 'appetizer',
    'pinto_bean_casserole': 'dump_and_go',
}

def main():
    index_path = Path('recipes/index.yml')

    print("Loading recipe index...")
    with open(index_path, 'r') as f:
        recipes = yaml.safe_load(f)

    print(f"Total recipes: {len(recipes)}")

    # Count before
    unknown_before = sum(1 for r in recipes if r.get('template') == 'unknown')
    print(f"Unknown recipes before: {unknown_before}")

    # Reclassify
    reclassified_count = 0
    for recipe in recipes:
        recipe_id = recipe.get('id')
        if recipe_id in RECLASSIFICATIONS:
            old_template = recipe.get('template')
            new_template = RECLASSIFICATIONS[recipe_id]
            recipe['template'] = new_template
            reclassified_count += 1
            print(f"  ✓ {recipe_id}: {old_template} → {new_template}")

    # Count after
    unknown_after = sum(1 for r in recipes if r.get('template') == 'unknown')

    print(f"\nReclassified: {reclassified_count} recipes")
    print(f"Unknown recipes after: {unknown_after}")

    # Show new distribution
    from collections import Counter
    template_counts = Counter(r.get('template') for r in recipes)
    print("\nNew template distribution:")
    for template, count in sorted(template_counts.items(), key=lambda x: -x[1]):
        print(f"  {template:20s}: {count:3d}")

    # Write back
    print("\nWriting updated index...")
    with open(index_path, 'w') as f:
        yaml.dump(recipes, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print("✓ Done!")

if __name__ == '__main__':
    main()
