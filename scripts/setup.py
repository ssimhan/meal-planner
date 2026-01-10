#!/usr/bin/env python3
"""
Interactive setup script for Meal Planner.
Generates a personalized config.yml based on user input.

Usage:
    python3 scripts/setup.py
"""

import sys
import yaml
from pathlib import Path
from typing import List, Dict, Any


def print_header(text: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(text)
    print("=" * 60)


def get_input(prompt: str, default: str = None) -> str:
    """Get user input with optional default value."""
    if default:
        response = input(f"{prompt} [{default}]: ").strip()
        return response if response else default
    return input(f"{prompt}: ").strip()


def get_yes_no(prompt: str, default: bool = True) -> bool:
    """Get yes/no input from user."""
    default_str = "Y/n" if default else "y/N"
    response = input(f"{prompt} [{default_str}]: ").strip().lower()

    if not response:
        return default
    return response in ['y', 'yes']


def get_list_input(prompt: str, example: str = None) -> List[str]:
    """Get comma-separated list input from user."""
    if example:
        print(f"  Example: {example}")

    response = get_input(prompt)
    if not response:
        return []

    return [item.strip() for item in response.split(',') if item.strip()]


def get_days(prompt: str, default: List[str] = None) -> List[str]:
    """Get day abbreviations from user."""
    valid_days = {'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}

    while True:
        if default:
            print(f"  Current: {', '.join(default)}")
        print("  Valid days: mon, tue, wed, thu, fri, sat, sun")

        days = get_list_input(prompt)
        if not days and default:
            return default

        invalid = [d for d in days if d.lower() not in valid_days]
        if invalid:
            print(f"  ❌ Invalid days: {', '.join(invalid)}")
            print("  Please use 3-letter abbreviations (mon, tue, etc.)")
            continue

        return [d.lower() for d in days]


def setup_timezone() -> str:
    """Setup timezone configuration."""
    print_header("TIMEZONE CONFIGURATION")

    print("\nSet your local timezone for accurate daily check-ins.")
    print("Common timezones:")
    print("  - America/Los_Angeles (Pacific)")
    print("  - America/New_York (Eastern)")
    print("  - America/Chicago (Central)")
    print("  - Europe/London")
    print("  - Asia/Tokyo")

    return get_input("\nEnter your timezone", "America/Los_Angeles")


def setup_schedule() -> Dict[str, List[str]]:
    """Setup weekly schedule configuration."""
    print_header("WEEKLY SCHEDULE")

    print("\nDefine your typical weekly schedule:")

    office_days = get_days("\nOffice days (in-person work)", ['mon', 'wed', 'fri'])
    busy_days = get_days("Busy days (need quick/easy meals)", ['thu', 'fri'])
    late_class_days = get_days("Late activity days (soccer, music, etc.)", [])

    return {
        'office_days': office_days,
        'busy_days': busy_days,
        'late_class_days': late_class_days
    }


def setup_preferences() -> Dict[str, Any]:
    """Setup dietary preferences."""
    print_header("DIETARY PREFERENCES")

    vegetarian = get_yes_no("\nAre you vegetarian?", True)

    print("\nIngredients to avoid (allergies or dislikes):")
    avoid = get_list_input("Enter ingredients to avoid, comma-separated", "mushrooms, eggplant, cilantro")

    print("\nNovelty recipe limit:")
    print("  How many 'from scratch' new recipes per week?")
    print("  Recommended: 1 (one new recipe, rest are familiar)")

    while True:
        limit_str = get_input("Enter number", "1")
        try:
            limit = int(limit_str)
            if limit >= 0:
                break
            print("  ❌ Please enter a non-negative number")
        except ValueError:
            print("  ❌ Please enter a valid number")

    return {
        'vegetarian': vegetarian,
        'avoid_ingredients': avoid,
        'novelty_recipe_limit': limit
    }


def setup_kid_profiles() -> Dict[str, Dict[str, List[str]]]:
    """Setup kid profiles."""
    print_header("FAMILY PROFILES")

    print("\nAdd profiles for family members who need meal planning.")
    print("(Kids with school lunches, individual allergies, etc.)")

    has_kids = get_yes_no("\nDo you want to add family profiles?", True)

    if not has_kids:
        return {}

    profiles = {}

    while True:
        name = get_input("\nEnter name (or press Enter to finish)").strip()
        if not name:
            if profiles:
                break
            print("  ℹ️  Add at least one profile, or answer 'n' above to skip")
            continue

        print(f"\nProfile for {name}:")
        allergies = get_list_input("  Allergies/ingredients to avoid", "nuts, dairy")

        profiles[name] = {
            'preferences': [],
            'avoid_ingredients': allergies
        }

        print(f"  ✓ Added profile for {name}")

        if not get_yes_no("Add another profile?", False):
            break

    return profiles


def setup_lunch_defaults() -> Dict[str, List[str]]:
    """Setup lunch defaults."""
    print_header("LUNCH DEFAULTS")

    print("\nDefault lunch options that rotate through the week.")
    print("These are simple, repeatable meals when no specific lunch is planned.")

    use_defaults = get_yes_no("\nUse standard lunch defaults?", True)

    if use_defaults:
        return {
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
        }

    print("\nCustom lunch defaults:")
    print("Enter 5-7 kid lunch options (simple meals your kids actually eat)")
    kids_lunches = []
    for i in range(1, 8):
        lunch = get_input(f"  {i}. Kid lunch option (or Enter to finish)").strip()
        if not lunch:
            break
        kids_lunches.append(lunch)

    print("\nEnter 2-3 adult lunch options")
    adult_lunches = []
    for i in range(1, 4):
        lunch = get_input(f"  {i}. Adult lunch option (or Enter to finish)").strip()
        if not lunch:
            break
        adult_lunches.append(lunch)

    return {
        'kids': kids_lunches if kids_lunches else ['PBJ on whole wheat'],
        'adult': adult_lunches if adult_lunches else ['Leftovers from previous night\'s dinner']
    }


def setup_snack_defaults() -> Dict[str, Any]:
    """Setup snack defaults."""
    print_header("SNACK DEFAULTS")

    print("\nDaily snack rotation with fallback options.")

    use_defaults = get_yes_no("\nUse standard snack rotation?", True)

    if use_defaults:
        return {
            'by_day': {
                'mon': 'Apple slices with peanut butter',
                'tue': 'Cheese and crackers',
                'wed': 'Cucumber rounds with cream cheese',
                'thu': 'Grapes',
                'fri': 'Crackers with hummus'
            },
            'fallback': {
                'school': 'Fruit or Cheese sticks',
                'home': 'Cucumber or Crackers'
            }
        }

    print("\nEnter snacks for each day (or Enter to skip):")
    by_day = {}
    days = ['mon', 'tue', 'wed', 'thu', 'fri']

    for day in days:
        snack = get_input(f"  {day.capitalize()}").strip()
        if snack:
            by_day[day] = snack

    school_snack = get_input("\nSchool snack fallback (should be nut-free)", "Fruit or Cheese sticks")
    home_snack = get_input("Home snack fallback", "Cucumber or Crackers")

    return {
        'by_day': by_day if by_day else {'mon': 'Fruit'},
        'fallback': {
            'school': school_snack,
            'home': home_snack
        }
    }


def generate_config() -> Dict[str, Any]:
    """Generate complete config through interactive prompts."""
    print("\n" + "=" * 60)
    print("MEAL PLANNER SETUP")
    print("=" * 60)
    print("\nThis wizard will help you create a personalized config.yml")
    print("for your household. Press Ctrl+C at any time to cancel.")

    config = {}

    # Collect all configuration
    config['timezone'] = setup_timezone()
    config['schedule'] = setup_schedule()
    config['preferences'] = setup_preferences()
    config['kid_profiles'] = setup_kid_profiles()
    config['lunch_defaults'] = setup_lunch_defaults()
    config['snack_defaults'] = setup_snack_defaults()

    # Add workflow defaults
    config['workflows'] = {
        'daily_check_in_time': '0 4 * * *'  # 4am UTC = 8pm PST
    }

    return config


def preview_config(config: Dict[str, Any]):
    """Show preview of generated config."""
    print_header("CONFIGURATION PREVIEW")

    print("\nTimezone:", config['timezone'])
    print("\nSchedule:")
    print(f"  Office days: {', '.join(config['schedule']['office_days'])}")
    print(f"  Busy days: {', '.join(config['schedule']['busy_days'])}")
    print(f"  Late class days: {', '.join(config['schedule']['late_class_days']) or 'None'}")

    print("\nPreferences:")
    print(f"  Vegetarian: {config['preferences']['vegetarian']}")
    print(f"  Avoid: {', '.join(config['preferences']['avoid_ingredients']) or 'None'}")
    print(f"  Novelty limit: {config['preferences']['novelty_recipe_limit']}")

    print("\nFamily Profiles:")
    if config['kid_profiles']:
        for name, profile in config['kid_profiles'].items():
            allergies = ', '.join(profile['avoid_ingredients']) if profile['avoid_ingredients'] else 'None'
            print(f"  {name}: Avoids {allergies}")
    else:
        print("  None")

    print(f"\nLunch Defaults: {len(config['lunch_defaults']['kids'])} kid options, {len(config['lunch_defaults']['adult'])} adult options")
    print(f"Snack Defaults: {len(config['snack_defaults']['by_day'])} daily snacks defined")


def main():
    """Main setup flow."""
    try:
        # Check if config.yml already exists
        config_path = Path('config.yml')
        if config_path.exists():
            print("\n⚠️  config.yml already exists!")
            overwrite = get_yes_no("Do you want to overwrite it?", False)
            if not overwrite:
                print("\n✓ Setup cancelled. Your existing config.yml is unchanged.")
                return

            # Backup existing config
            backup_path = Path('config.yml.backup')
            config_path.rename(backup_path)
            print(f"✓ Backed up existing config to {backup_path}")

        # Generate config
        config = generate_config()

        # Show preview
        preview_config(config)

        # Confirm and save
        print_header("SAVE CONFIGURATION")

        if not get_yes_no("\nSave this configuration to config.yml?", True):
            print("\n✓ Setup cancelled. No files were modified.")
            return

        # Write config.yml
        with open('config.yml', 'w') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

        print("\n✅ Configuration saved to config.yml!")

        # Validate
        print("\nValidating configuration...")
        from validate_yaml import validate_config_schema

        if validate_config_schema('config.yml'):
            print("\n" + "=" * 60)
            print("SETUP COMPLETE!")
            print("=" * 60)
            print("\nNext steps:")
            print("  1. Review config.yml and make any manual adjustments")
            print("  2. Start the development server: npm run dev")
            print("  3. Access the dashboard at http://localhost:3000")
            print("\nFor detailed configuration options, see docs/CONFIGURATION.md")

    except KeyboardInterrupt:
        print("\n\n✓ Setup cancelled.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nSetup failed. Please check the error above or manually create config.yml")
        print("from config.example.yml")
        sys.exit(1)


if __name__ == '__main__':
    main()
