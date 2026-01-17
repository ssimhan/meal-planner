#!/usr/bin/env python3
"""
Intelligent lunch selection algorithm for meal planning system.

Selects lunch recipes based on:
- Component-based prep model (prep Mon/Tue for Thu/Fri lunches)
- Kid-friendly constraints
- Ingredient reuse from dinner plans
- Energy-based scheduling (light assembly on Thu/Fri)
- Repeatable defaults for decision fatigue reduction
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import yaml
import os

@dataclass
class LunchSuggestion:
    """Represents a lunch suggestion with prep details."""
    recipe_id: str
    recipe_name: str
    kid_friendly: bool
    prep_style: str  # 'quick_fresh', 'component_based', 'batch_cookable'
    prep_components: List[str]
    storage_days: int
    prep_day: str  # When to prep components (mon, tue, wed)
    assembly_notes: str
    reuses_ingredients: List[str]  # Ingredients from dinner plans
    default_option: Optional[str] = None  # Fallback repeatable option
    kid_profiles: Optional[Dict[str, str]] = None  # {name: description}


class LunchSelector:
    """Selects lunch recipes based on weekly dinner plan and constraints."""

    def __init__(self, recipe_index_path: str = 'recipes/index.yml', config_path: str = 'config.yml', recipes: List[Dict[str, Any]] = None):
        """Initialize selector with recipe index."""
        self.recipe_index_path = recipe_index_path
        self.config_path = config_path
        if recipes:
            self.recipes = recipes
        else:
            self.recipes = self._load_recipes()
        self.config = self._load_config()
        self.kid_profiles = self.config.get('kid_profiles', {})

        # Load lunch defaults from config.yml (with fallback to hardcoded values)
        self.defaults = self.config.get('lunch_defaults', {
            'kids': [
                'PBJ on whole wheat',
                'Egg sandwich or scrambled egg sandwich',
                'Toad-in-a-hole (egg cooked in bread)',
                'Ravioli with brown butter or simple tomato sauce',
                'Chapati or dosa rolls with fruit',
                'Veggie burrito or pizza roll',
                'Quesadilla with cheese and beans'
            ],
            'adult': [
                'Leftovers from previous night\'s dinner (preferred)',
                'Grain bowl: prepped grain + roasted vegetables + protein',
                'Salad with dinner components'
            ]
        })
        self.lunch_recipes = self._filter_lunch_suitable()

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration."""
        if os.path.exists(self.config_path):
             with open(self.config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        return {}

    def _load_recipes(self) -> List[Dict[str, Any]]:
        """Load recipe index from YAML."""
        with open(self.recipe_index_path, 'r') as f:
            return yaml.safe_load(f) or []

    def _filter_lunch_suitable(self) -> List[Dict[str, Any]]:
        """Filter recipes suitable for lunch based on meal_type."""
        # Meal types that work well for lunch
        lunch_meal_types = {
            'sandwich', 'salad', 'grain_bowl', 'tacos_wraps',
            'soup_stew', 'pasta_noodles', 'appetizer'
        }

        lunch_recipes = []
        for r in self.recipes:
            # Include if explicitly marked as lunch_suitable
            if r.get('lunch_suitable', False):
                lunch_recipes.append(r)
                continue

            # Include if meal_type is lunch-friendly
            meal_type = r.get('meal_type', 'unknown')
            if meal_type in lunch_meal_types:
                lunch_recipes.append(r)

        return lunch_recipes

    def select_weekly_lunches(
        self,
        dinner_plan: List[Dict[str, Any]],
        week_of: str,
        current_lunches: Dict[str, Any] = None
    ) -> Dict[str, LunchSuggestion]:
        """
        Select lunches for the entire week based on dinner plan.

        Args:
            dinner_plan: List of dinner recipes with their scheduled days
            week_of: ISO date string (YYYY-MM-DD) for start of week
            current_lunches: Optional dictionary of already assigned lunches
        """
        weekly_lunches = {}
        current_lunches = current_lunches or {}

        # Extract all ingredients used in dinners this week
        dinner_ingredients = self._extract_dinner_ingredients(dinner_plan)

        # Select lunches for each day
        for day in ['mon', 'tue', 'wed', 'thu', 'fri']:
            # If we already have a lunch (e.g. assigned leftover), respect it
            if day in current_lunches and current_lunches[day]:
                l = current_lunches[day]
                # Convert dict to LunchSuggestion if needed
                if isinstance(l, dict):
                    weekly_lunches[day] = LunchSuggestion(
                        recipe_id=l.get('recipe_id'),
                        recipe_name=l.get('recipe_name', 'Unknown'),
                        kid_friendly=l.get('kid_friendly', True),
                        prep_style=l.get('prep_style', 'leftovers'),
                        prep_components=l.get('prep_components', []),
                        storage_days=l.get('storage_days', 0),
                        prep_day=l.get('prep_day', day),
                        assembly_notes=l.get('assembly_notes', 'Assigned from wizard'),
                        reuses_ingredients=l.get('reuses_ingredients', []),
                        kid_profiles=l.get('kid_profiles')
                    )
                else:
                    weekly_lunches[day] = l
                continue

            suggestion = self._select_daily_lunch(
                day=day,
                dinner_ingredients=dinner_ingredients,
                dinner_plan=dinner_plan
            )
            weekly_lunches[day] = suggestion

        return weekly_lunches

    def _extract_dinner_ingredients(
        self,
        dinner_plan: List[Dict[str, Any]]
    ) -> Dict[str, List[str]]:
        """
        Extract ingredients from dinner plan organized by day.

        Returns:
            Dict mapping day -> list of ingredients
        """
        ingredients_by_day = {}

        for dinner in dinner_plan:
            day = dinner['day']
            # Get vegetables from dinner
            vegetables = list(dinner.get('vegetables', [])) # Copy!

            # Look up recipe to get additional ingredients
            recipe = self._find_recipe_by_id(dinner['recipe_id'])
            if recipe:
                # Extract common pantry items that might be reused
                main_veg = recipe.get('main_veg', [])
                for v in main_veg:
                    if v not in vegetables:
                        vegetables.append(v)

            ingredients_by_day[day] = vegetables

        return ingredients_by_day

    def _find_recipe_by_id(self, recipe_id: str) -> Optional[Dict[str, Any]]:
        """Find recipe by ID in index."""
        for recipe in self.recipes:
            if recipe.get('id') == recipe_id:
                return recipe
        return None

    def _select_daily_lunch(
        self,
        day: str,
        dinner_ingredients: Dict[str, List[str]],
        dinner_plan: List[Dict[str, Any]]
    ) -> LunchSuggestion:
        """
        Select lunch for a specific day.

        Strategy:
        - Priority 1: Suggest leftovers from previous night's dinner (adult)
        - Priority 2: Find lunch recipes (with ingredient reuse bonus)
        - Priority 3: Fall back to repeatable defaults
        - Monday/Tuesday: Can use quick_fresh or prep components for later
        - Wednesday: Use components prepped Mon/Tue
        - Thursday/Friday: Use components prepped Mon/Tue/Wed (ONLY assembly)
        """

        # Priority 1: Check if we can suggest leftovers from previous night
        day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
        current_day_idx = day_order.index(day)

        if current_day_idx > 0:  # Not Monday
            previous_day = day_order[current_day_idx - 1]
            previous_dinner = next((d for d in dinner_plan if d['day'] == previous_day), None)

            if previous_dinner:
                # Suggest leftovers for adult, default for kids
                return self._create_leftovers_suggestion(day, previous_dinner)

        # Priority 2: Get ingredients available from recent dinners
        available_ingredients = self._get_available_ingredients(
            day=day,
            dinner_ingredients=dinner_ingredients
        )

        # Find lunch recipes
        candidate_recipes = self._find_reusable_lunch_recipes(
            available_ingredients=available_ingredients,
            day=day
        )

        if candidate_recipes:
            # Select best match
            selected = self._rank_and_select(candidate_recipes, day)
            return self._create_suggestion(selected, day, available_ingredients)
        else:
            # Priority 3: Fall back to default
            return self._create_default_suggestion(day)

    def _get_available_ingredients(
        self,
        day: str,
        dinner_ingredients: Dict[str, List[str]]
    ) -> List[str]:
        """
        Get ingredients available for reuse on a given day.

        Consider:
        - Previous night's dinner (for leftovers)
        - Earlier in the week (for batch-prepped components)
        """
        day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
        current_day_idx = day_order.index(day)

        available = []

        # Include ingredients from all previous days this week
        for prev_day in day_order[:current_day_idx + 1]:
            if prev_day in dinner_ingredients:
                available.extend(dinner_ingredients[prev_day])

        return list(set(available))  # Deduplicate

    def _find_reusable_lunch_recipes(
        self,
        available_ingredients: List[str],
        day: str
    ) -> List[Dict[str, Any]]:
        """
        Find lunch recipes suitable for the day.

        Filters by:
        - Prep style compatible with day (Thu/Fri must be component_based or quick_fresh)
        - Kid-friendly (preferred but not required)
        - Ingredient reuse is BONUS points, not required
        """
        candidates = []

        for recipe in self.lunch_recipes:
            # Check prep style compatibility FIRST
            prep_style = recipe.get('prep_style')

            if day in ['thu', 'fri']:
                # Thursday/Friday: ONLY component_based or quick_fresh
                # (components prepped earlier, just assemble)
                if prep_style not in ['component_based', 'quick_fresh']:
                    continue

            # Check if recipe reuses any available ingredients (BONUS, not required)
            reuses_ingredients = recipe.get('reuses_dinner_ingredients', [])
            overlap = set(reuses_ingredients) & set(available_ingredients)

            candidates.append({
                'recipe': recipe,
                'overlap_count': len(overlap),
                'overlap_ingredients': list(overlap)
            })

        return candidates

    def _rank_and_select(
        self,
        candidates: List[Dict[str, Any]],
        day: str
    ) -> Dict[str, Any]:
        """
        Rank candidates and select best match.

        Scoring:
        - More ingredient overlap = higher score
        - Kid-friendly = bonus points
        - Component-based on Thu/Fri = bonus points
        """
        scored = []

        for candidate in candidates:
            recipe = candidate['recipe']
            score = 0

            # Ingredient overlap score
            score += candidate['overlap_count'] * 10

            # Kid-friendly bonus
            if recipe.get('kid_friendly', False):
                score += 5

            # Component-based on busy days bonus
            if day in ['thu', 'fri'] and recipe.get('prep_style') == 'component_based':
                score += 3

            scored.append({
                'recipe': recipe,
                'score': score,
                'overlap_ingredients': candidate['overlap_ingredients']
            })

        # Sort by score descending
        scored.sort(key=lambda x: x['score'], reverse=True)

        return scored[0]  # Return highest scored

    def _create_suggestion(
        self,
        selected: Dict[str, Any],
        day: str,
        available_ingredients: List[str]
    ) -> LunchSuggestion:
        """Create LunchSuggestion from selected recipe."""
        recipe = selected['recipe']
        overlap_ingredients = selected['overlap_ingredients']

        # Determine prep day based on when lunch is served
        prep_day = self._determine_prep_day(day, recipe.get('prep_style'))

        # Generate assembly notes
        assembly_notes = self._generate_assembly_notes(
            day=day,
            prep_style=recipe.get('prep_style'),
            prep_day=prep_day
        )

        return LunchSuggestion(
            recipe_id=recipe.get('id'),
            recipe_name=recipe.get('name', recipe.get('id')),
            kid_friendly=recipe.get('kid_friendly', False),
            prep_style=recipe.get('prep_style', 'quick_fresh'),
            prep_components=recipe.get('prep_components', []),
            storage_days=recipe.get('component_storage_days', 0),
            prep_day=prep_day,
            assembly_notes=assembly_notes,
            reuses_ingredients=overlap_ingredients,
            default_option=None,
            kid_profiles=self._resolve_profile_conflicts(recipe)
        )

    def _resolve_profile_conflicts(self, recipe: Dict[str, Any]) -> Dict[str, str]:
        """
        Check if recipe works for each profile.
        Returns map of Profile Name -> Recipe Description
        """
        if not self.kid_profiles:
            return {}

        results = {}
        recipe_name = recipe.get('name', recipe.get('id'))
        
        for name, profile in self.kid_profiles.items():
            avoid = set(profile.get('avoid_ingredients', []))
            recipe_contains = set(recipe.get('avoid_contains', []))
            
            # Check for conflict
            conflict = avoid.intersection(recipe_contains)
            
            if conflict:
                # For now, just mark it. In future, could select alternative.
                conflict_str = ", ".join(list(conflict))
                results[name] = f"{recipe_name} (⚠️ Contains {conflict_str} - SUBSTITUTE)"
            else:
                results[name] = recipe_name
                
        return results

    def _create_leftovers_suggestion(
        self,
        day: str,
        previous_dinner: Dict[str, Any]
    ) -> LunchSuggestion:
        """Create suggestion to use leftovers from previous night's dinner."""
        # Get the previous day for assembly notes
        day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
        current_day_idx = day_order.index(day)
        previous_day = day_order[current_day_idx - 1]

        # Look up the full recipe to check for leftover potential/kid favorite
        recipe = self._find_recipe_by_id(previous_dinner['recipe_id'])
        dinner_name = previous_dinner.get('recipe_name', 'previous dinner')
        
        is_pipeline = False
        if recipe:
            leftover_pot = recipe.get('leftover_potential', 'low')
            is_kid_fav = recipe.get('kid_favorite', False)
            if leftover_pot == 'high' or is_kid_fav:
                is_pipeline = True

        if is_pipeline:
            # PLANNED PIPELINE: Everyone eats leftovers
            pipeline_name = f"Leftovers: {dinner_name}"
            return LunchSuggestion(
                recipe_id=f'pipeline_{day}',
                recipe_name=pipeline_name,
                kid_friendly=True,
                prep_style='quick_fresh',
                prep_components=[],
                storage_days=1,
                prep_day=previous_day,
                assembly_notes=f'Planned Leftover Pipeline: Reheat {previous_day.capitalize()} dinner for everyone. Pack in morning.',
                reuses_ingredients=previous_dinner.get('vegetables', []),
                default_option=None,
                kid_profiles={name: f"Reheated {dinner_name}" for name in self.kid_profiles} if self.kid_profiles else None
            )

        # STANDARD LEFTOVERS: Adult only
        # Get default for kids (rotate through defaults)
        day_idx = day_order.index(day)
        default_idx = day_idx % len(self.defaults['kids'])
        kids_default = self.defaults['kids'][default_idx]

        return LunchSuggestion(
            recipe_id=f'leftovers_{day}',
            recipe_name=f"{kids_default} OR Adult: Leftovers from {dinner_name}",
            kid_friendly=True,
            prep_style='quick_fresh',
            prep_components=[],
            storage_days=1,
            prep_day=previous_day,
            assembly_notes=f'Kids: {kids_default} (<10 mins) | Adult: Reheat {previous_day.capitalize()} dinner leftovers',
            reuses_ingredients=previous_dinner.get('vegetables', []),
            default_option=kids_default,
            kid_profiles={name: kids_default for name in self.kid_profiles} if self.kid_profiles else None
        )

    def _create_default_suggestion(self, day: str) -> LunchSuggestion:
        """Create default suggestion when no recipes match."""
        import random
        # 1. Try to find a random safe lunch-suitable recipe first
        safe_lunch_recipes = [r for r in self.lunch_recipes if self._is_safe(r)]
        if safe_lunch_recipes:
            selected_recipe = random.choice(safe_lunch_recipes)
            return self._create_suggestion({'recipe': selected_recipe, 'overlap_ingredients': []}, day, [])

        # 2. Fall back to config defaults if available
        kids_defaults = self.defaults.get('kids', [])
        if kids_defaults:
            # Rotate through defaults based on day
            day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
            day_idx = day_order.index(day) if day in day_order else 0
            default_idx = day_idx % len(kids_defaults)
            default_option = kids_defaults[default_idx]
        else:
            default_option = "Simple Lunch"

        return LunchSuggestion(
            recipe_id=f'default_{day}',
            recipe_name=default_option,
            kid_friendly=True,
            prep_style='quick_fresh',
            prep_components=[],
            storage_days=0,
            prep_day=day,
            assembly_notes='Make fresh in <10 minutes',
            reuses_ingredients=[],
            default_option=default_option,
            kid_profiles={name: default_option for name in self.kid_profiles} if self.kid_profiles else None
        )

    def _is_safe(self, recipe: Dict[str, Any]) -> bool:
        """Check if recipe is safe for all kids."""
        if not self.kid_profiles: return True
        recipe_contains = set(recipe.get('avoid_contains', []))
        for profile in self.kid_profiles.values():
            avoid = set(profile.get('avoid_ingredients', []))
            if avoid.intersection(recipe_contains):
                return False
        return True

    def _determine_prep_day(self, lunch_day: str, prep_style: str) -> str:
        """
        Determine when to prep components for a given lunch day.

        Strategy:
        - Monday lunch: Prep Sunday evening or Monday morning (if component-based)
        - Tuesday lunch: Prep Monday evening
        - Wednesday lunch: Prep Monday or Tuesday
        - Thursday lunch: Prep Monday or Tuesday (NOT Wednesday)
        - Friday lunch: Prep Monday or Tuesday (NOT Wednesday)
        """
        if prep_style == 'quick_fresh':
            return lunch_day  # Prep same day

        day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
        lunch_idx = day_order.index(lunch_day)

        if lunch_idx == 0:  # Monday
            return 'sun'  # Prep Sunday for Monday lunch
        elif lunch_idx == 1:  # Tuesday
            return 'mon'  # Prep Monday evening
        elif lunch_idx == 2:  # Wednesday
            return 'tue'  # Prep Tuesday evening
        else:  # Thursday or Friday
            return 'mon'  # Prep Monday evening for maximum freshness window

    def _generate_assembly_notes(
        self,
        day: str,
        prep_style: str,
        prep_day: str
    ) -> str:
        """Generate human-readable assembly notes."""
        if prep_style == 'quick_fresh':
            return 'Make fresh in <10 minutes'

        if day == prep_day:
            return f'Prep components {day.capitalize()} evening'
        else:
            return f'All components prepped {prep_day.capitalize()} - assemble only'


def main():
    """Example usage of LunchSelector."""
    selector = LunchSelector()

    # Example dinner plan
    dinner_plan = [
        {
            'recipe_id': 'cheesy_veggie_quesadilla',
            'recipe_name': 'Cheesy Veggie Quesadilla',
            'day': 'mon',
            'vegetables': ['bell_peppers', 'onions', 'corn']
        },
        {
            'recipe_id': 'dal_tadka',
            'recipe_name': 'Dal Tadka',
            'day': 'tue',
            'vegetables': ['tomatoes', 'onions']
        },
        {
            'recipe_id': 'pasta_primavera',
            'recipe_name': 'Pasta Primavera',
            'day': 'wed',
            'vegetables': ['broccoli', 'carrots', 'bell_peppers']
        },
        {
            'recipe_id': 'refried_bean_burrito',
            'recipe_name': 'Refried Bean Burrito',
            'day': 'thu',
            'vegetables': ['beans', 'cheese']
        },
        {
            'recipe_id': 'curried_egg_salad_sandwich',
            'recipe_name': 'Curried Egg Salad Sandwich',
            'day': 'fri',
            'vegetables': ['eggs', 'curry_powder']
        }
    ]

    # Select weekly lunches
    lunches = selector.select_weekly_lunches(
        dinner_plan=dinner_plan,
        week_of='2026-01-05'
    )

    # Print results
    # Print results
    for day, suggestion in lunches.items():
        print(f"\n{day.upper()}:")
        print(f"  Recipe: {suggestion.recipe_name}")
        print(f"  Kid-friendly: {suggestion.kid_friendly}")
        print(f"  Prep style: {suggestion.prep_style}")
        print(f"  Prep day: {suggestion.prep_day}")
        print(f"  Components: {', '.join(suggestion.prep_components)}")
        print(f"  Assembly: {suggestion.assembly_notes}")
        print(f"  Reuses: {', '.join(suggestion.reuses_ingredients)}")
        
        if suggestion.kid_profiles:
            print(f"  Kids:")
            for name, desc in suggestion.kid_profiles.items():
                print(f"    - {name}: {desc}")

        if suggestion.default_option:
            print(f"  Default option: {suggestion.default_option}")


if __name__ == '__main__':
    main()
