import random
from typing import List, Dict, Any

class SnackSelector:
    """Selects snacks for the week from the recipe index."""

    def __init__(self, recipes: List[Dict[str, Any]], kid_profiles: Dict[str, Any] = None):
        self.recipes = recipes
        self.kid_profiles = kid_profiles or {}
        self.snack_recipes = self._filter_snack_recipes()

    def _filter_snack_recipes(self) -> List[Dict[str, Any]]:
        """Filter for recipes suitable as snacks."""
        snack_types = {'simple_snack', 'snack_bar', 'baked_goods', 'sauce_dip'}
        return [r for r in self.recipes if r.get('meal_type') in snack_types or r.get('snack_suitable')]

    def is_safe(self, recipe: Dict[str, Any]) -> bool:
        """Check if recipe is safe for all kids."""
        for name, profile in self.kid_profiles.items():
            avoid = set(profile.get('avoid_ingredients', []))
            contains = set(recipe.get('avoid_contains', []))
            if avoid.intersection(contains):
                return False
        return True

    def select_weekly_snacks(self, days: List[str]) -> Dict[str, Dict[str, str]]:
        """Select school and home snacks for the week."""
        safe_snacks = [r for r in self.snack_recipes if self.is_safe(r)]
        if not safe_snacks:
            # Fallback to very basic ones if somehow none are safe
            safe_snacks = [{"name": "Fruit", "id": "fruit"}]

        weekly_snacks = {}
        for day in days:
            # Pick two different snacks if possible
            if len(safe_snacks) >= 2:
                selected = random.sample(safe_snacks, 2)
                weekly_snacks[day] = {
                    "school_snack": selected[0].get('name'),
                    "home_snack": selected[1].get('name')
                }
            else:
                s = safe_snacks[0].get('name')
                weekly_snacks[day] = {
                    "school_snack": s,
                    "home_snack": s
                }
        return weekly_snacks
