#!/usr/bin/env python3
"""
Meal Plan Validation Script

Validates that a generated weekly meal plan meets all constraints:
- All dinners (Mon-Fri) are present
- No avoided ingredients
- Busy days have no-chop recipes or prep notes
- Late class days have heavy snacks
- No meal_type repetition within the week
- At least one vegetable per dinner
- Exactly one from-scratch recipe per week (optional check)

Usage:
    python scripts/validate_plan.py plans/YYYY-MM-DD-weekly-plan.md inputs/YYYY-MM-DD.yml
"""

import sys
import yaml
import re
from pathlib import Path


class PlanValidator:
    """Validates a meal plan against constraints."""

    def __init__(self, plan_file, input_file, history_file, index_file):
        self.plan_file = Path(plan_file)
        self.input_file = Path(input_file)
        self.history_file = Path(history_file)
        self.index_file = Path(index_file)
        self.errors = []
        self.warnings = []

    def validate(self):
        """Run all validation checks."""
        print(f"Validating plan: {self.plan_file}")
        print("=" * 60)

        # Load files
        plan_content = self._load_plan()
        inputs = self._load_inputs()
        history = self._load_history()
        recipes = self._load_recipes()

        # Run validation checks
        self._check_all_dinners_present(plan_content)
        self._check_farmers_market_list(plan_content, inputs)
        self._check_busy_day_constraints(plan_content, inputs)
        self._check_late_class_snacks(plan_content, inputs)
        self._check_meal_type_repetition(plan_content)
        self._check_vegetables_per_dinner(plan_content)
        self._check_avoided_ingredients(plan_content, inputs, recipes)
        self._check_from_scratch_recipe(plan_content, inputs)
        self._check_lunch_prep(plan_content)
        self._check_recent_repetition(plan_content, history)

        # Report results
        return self._print_results()

    def _load_plan(self):
        """Load the plan markdown file."""
        if not self.plan_file.exists():
            self.errors.append(f"Plan file not found: {self.plan_file}")
            return ""

        with open(self.plan_file, 'r') as f:
            return f.read()

    def _load_inputs(self):
        """Load the input YAML file."""
        if not self.input_file.exists():
            self.errors.append(f"Input file not found: {self.input_file}")
            return {}

        with open(self.input_file, 'r') as f:
            return yaml.safe_load(f)

    def _load_history(self):
        """Load the history YAML file."""
        if not self.history_file.exists():
            return {'weeks': []}

        with open(self.history_file, 'r') as f:
            data = yaml.safe_load(f)
            return data if data else {'weeks': []}

    def _load_recipes(self):
        """Load the recipe index."""
        if not self.index_file.exists():
            self.warnings.append(f"Recipe index not found: {self.index_file}")
            return []

        with open(self.index_file, 'r') as f:
            return yaml.safe_load(f)

    def _check_all_dinners_present(self, content):
        """Check that all Mon-Fri dinners are specified."""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        for day in days:
            pattern = rf'^## {day}\s*\n.*?\*\*Dinner:\*\*\s+(.+)'
            if not re.search(pattern, content, re.MULTILINE | re.DOTALL):
                self.errors.append(f"Missing dinner for {day}")

    def _check_farmers_market_list(self, content, inputs):
        """Check that farmers market list matches confirmed vegetables."""
        confirmed_veg = set(inputs.get('farmers_market', {}).get('confirmed_veg', []))

        # Extract vegetables from plan
        match = re.search(
            r'## Farmers Market Shopping List\n(.*?)(?=\n##|\Z)',
            content,
            re.DOTALL
        )

        if not match:
            self.errors.append("Missing Farmers Market Shopping List section")
            return

        plan_veg = set()
        for line in match.group(1).strip().split('\n'):
            if line.startswith('- '):
                plan_veg.add(line[2:].strip())

        # Compare
        missing = confirmed_veg - plan_veg
        extra = plan_veg - confirmed_veg

        if missing:
            self.warnings.append(f"Confirmed vegetables not in plan: {', '.join(missing)}")
        if extra:
            self.warnings.append(f"Plan vegetables not in confirmed list: {', '.join(extra)}")

    def _check_busy_day_constraints(self, content, inputs):
        """Check that busy days have no-chop meals or prep notes."""
        busy_days = set(inputs.get('schedule', {}).get('busy_days', []))

        day_map = {'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
                   'thu': 'Thursday', 'fri': 'Friday'}

        for day_abbr in busy_days:
            day_name = day_map.get(day_abbr)
            if not day_name:
                continue

            # Find the day's section
            pattern = rf'## {day_name}\s*\n(.*?)(?=\n##|\Z)'
            match = re.search(pattern, content, re.DOTALL)

            if not match:
                continue

            day_section = match.group(1)

            # Check for no-chop or prep notes
            has_no_chop = 'Quick no-chop meal' in day_section
            has_prep_note = 'Prep vegetables Wednesday evening' in day_section

            if not (has_no_chop or has_prep_note):
                self.errors.append(
                    f"{day_name} is a busy day but lacks no-chop meal or prep notes"
                )

    def _check_late_class_snacks(self, content, inputs):
        """Check that late class days have heavy snacks."""
        late_class_days = set(inputs.get('schedule', {}).get('late_class_days', []))

        day_map = {'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
                   'thu': 'Thursday', 'fri': 'Friday'}

        for day_abbr in late_class_days:
            day_name = day_map.get(day_abbr)
            if not day_name:
                continue

            # Check for heavy snack section
            pattern = rf'## Heavy Snack \({day_name} - Late Class Day\)'
            if not re.search(pattern, content):
                self.errors.append(f"Missing heavy snack for late class day: {day_name}")

    def _check_meal_type_repetition(self, content):
        """Check that no meal_type is used more than once."""
        # Extract all dinner lines with format: **Dinner:** Name (cuisine meal_type)
        dinners = re.findall(r'\*\*Dinner:\*\*\s+(.+?)\s+\((.+?)\)', content)

        meal_types = []
        for _, cuisine_and_type in dinners:
            # Parse "cuisine meal_type" format
            parts = cuisine_and_type.strip().split()
            if len(parts) >= 2:
                meal_type = parts[-1]  # Last part is meal_type
                meal_types.append(meal_type)
            elif len(parts) == 1:
                # Fallback: single word is meal_type
                meal_types.append(parts[0])

        meal_type_counts = {}
        for meal_type in meal_types:
            meal_type_counts[meal_type] = meal_type_counts.get(meal_type, 0) + 1

        # Check for repetition
        for meal_type, count in meal_type_counts.items():
            if count > 1:
                self.errors.append(f"Meal type '{meal_type}' used {count} times (max 1 per week)")

    def _check_vegetables_per_dinner(self, content):
        """Check that each dinner has at least one vegetable."""
        # Extract dinner sections
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

        for day in days:
            pattern = rf'## {day}\s*\n.*?\*\*Dinner:\*\*\s+(.+?)\n- Main vegetables:\s+(.+?)(?=\n|$)'
            match = re.search(pattern, content, re.DOTALL)

            if match:
                veg_list = match.group(2).strip()
                if veg_list in ['none', 'None', '']:
                    self.warnings.append(f"{day} dinner has no vegetables")

    def _check_avoided_ingredients(self, content, inputs, recipes):
        """Check that dinners don't contain avoided ingredients."""
        avoid = set(inputs.get('preferences', {}).get('avoid_ingredients', []))

        if not avoid:
            return

        # Extract recipe names from plan
        dinners = re.findall(r'\*\*Dinner:\*\*\s+(.+?)\s+\(', content)

        # Create recipe lookup
        recipe_map = {r['name']: r for r in recipes}

        for dinner_name in dinners:
            recipe = recipe_map.get(dinner_name)
            if not recipe:
                continue

            avoided_in_recipe = set(recipe.get('avoid_contains', []))
            violations = avoided_in_recipe & avoid

            if violations:
                self.errors.append(
                    f"Recipe '{dinner_name}' contains avoided ingredients: {', '.join(violations)}"
                )

    def _check_from_scratch_recipe(self, content, inputs):
        """Check that exactly one from-scratch recipe is selected."""
        limit = inputs.get('preferences', {}).get('novelty_recipe_limit', 1)

        # Check for from-scratch section
        has_section = bool(re.search(r'## From Scratch Recipe This Week', content))

        if limit == 1 and not has_section:
            self.warnings.append("No from-scratch recipe selected (expected 1)")
        elif limit == 0 and has_section:
            self.warnings.append("From-scratch recipe selected when limit is 0")

    def _check_lunch_prep(self, content):
        """Check that lunch prep is specified for each day."""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

        for day in days:
            pattern = rf'## {day}\s*\n.*?\*\*Lunch Prep:\*\*\s+\[Recipe for 2 kids \+ 1 adult\]'
            if not re.search(pattern, content, re.DOTALL):
                self.warnings.append(f"{day} missing lunch prep placeholder")

    def _check_recent_repetition(self, content, history):
        """Check that recipes weren't used in the last 3 weeks."""
        # Get recent recipe IDs
        recent = set()
        for week in history.get('weeks', [])[-3:]:
            for dinner in week.get('dinners', []):
                recent.add(dinner.get('recipe_id'))

        # Extract recipe names from plan
        dinners = re.findall(r'\*\*Dinner:\*\*\s+(.+?)\s+\(', content)

        # Convert names to IDs (simple normalization)
        for name in dinners:
            recipe_id = name.lower().replace(' ', '_').replace('-', '_')
            # Remove special characters
            recipe_id = re.sub(r'[^a-z0-9_]', '', recipe_id)

            if recipe_id in recent:
                self.warnings.append(f"Recipe '{name}' was used in the last 3 weeks")

    def _print_results(self):
        """Print validation results."""
        print("\nValidation Results:")
        print("=" * 60)

        if not self.errors and not self.warnings:
            print("✓ All checks passed!")
            print("\nPlan is valid and ready to use.")
            return True

        if self.errors:
            print(f"\n✗ {len(self.errors)} ERROR(S):")
            for error in self.errors:
                print(f"  • {error}")

        if self.warnings:
            print(f"\n⚠ {len(self.warnings)} WARNING(S):")
            for warning in self.warnings:
                print(f"  • {warning}")

        print("\n" + "=" * 60)

        if self.errors:
            print("\nPlan validation FAILED. Please fix errors before using.")
            return False
        else:
            print("\nPlan validation PASSED with warnings.")
            print("Review warnings but plan is usable.")
            return True


def main():
    """Main entry point."""
    if len(sys.argv) < 3:
        print("Meal Plan Validator")
        print("\nUsage:")
        print("  python scripts/validate_plan.py <plan_file> <input_file>")
        print("\nExample:")
        print("  python scripts/validate_plan.py plans/2025-12-29-weekly-plan.md inputs/2025-12-29.yml")
        sys.exit(1)

    plan_file = sys.argv[1]
    input_file = sys.argv[2]
    history_file = 'data/history.yml'
    index_file = 'recipes/index.yml'

    validator = PlanValidator(plan_file, input_file, history_file, index_file)
    success = validator.validate()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
