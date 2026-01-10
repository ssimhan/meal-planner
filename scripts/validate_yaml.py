#!/usr/bin/env python3
"""
Scan repo for .yml/.yaml files and validate their syntax.
Also validates config.yml schema when --config flag is used.
Exits with 1 if any invalid files are found.
"""
import sys
import yaml
from pathlib import Path
from typing import Dict, Any, List

def validate_yaml_files():
    root = Path('.')
    files = list(root.rglob('*.yml')) + list(root.rglob('*.yaml'))
    
    # Exclude venv, .git, etc
    exclude_dirs = {'.git', '.venv', '_site', 'node_modules', '.gemini'}
    files_to_check = []
    
    for f in files:
        # Check if file path contains excluded dir
        if any(d in f.parts for d in exclude_dirs):
            continue
        files_to_check.append(f)
        
    print(f"Checking {len(files_to_check)} YAML files...")
    
    errors = 0
    for f in files_to_check:
        try:
            with open(f, 'r') as stream:
                yaml.safe_load(stream)
                # print(f"✓ {f}")
        except yaml.YAMLError as exc:
            print(f"❌ INVALID: {f}")
            print(exc)
            errors += 1
        except Exception as e:
            print(f"❌ ERROR: {f} - {e}")
            errors += 1
            
    if errors > 0:
        print(f"\nFound {errors} invalid YAML files.")
        sys.exit(1)
    else:
        print("\nAll YAML files are valid.")
        sys.exit(0)

def validate_config_schema(config_path: str = 'config.yml') -> bool:
    """
    Validate config.yml against expected schema.
    Returns True if valid, False otherwise.
    """
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"❌ Config file not found: {config_path}")
        return False
    except yaml.YAMLError as e:
        print(f"❌ Invalid YAML in {config_path}: {e}")
        return False

    errors = []

    # Required top-level keys
    required_keys = ['timezone', 'schedule', 'preferences', 'kid_profiles']
    for key in required_keys:
        if key not in config:
            errors.append(f"Missing required key: {key}")

    # Validate timezone (basic check)
    if 'timezone' in config:
        if not isinstance(config['timezone'], str):
            errors.append("timezone must be a string (e.g., 'America/Los_Angeles')")

    # Validate schedule
    if 'schedule' in config:
        schedule = config['schedule']
        valid_days = {'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}

        for field in ['office_days', 'busy_days', 'late_class_days']:
            if field in schedule:
                if not isinstance(schedule[field], list):
                    errors.append(f"schedule.{field} must be a list")
                else:
                    for day in schedule[field]:
                        if day not in valid_days:
                            errors.append(f"Invalid day '{day}' in schedule.{field}. Valid: {valid_days}")

    # Validate preferences
    if 'preferences' in config:
        prefs = config['preferences']

        if 'vegetarian' in prefs and not isinstance(prefs['vegetarian'], bool):
            errors.append("preferences.vegetarian must be true or false")

        if 'avoid_ingredients' in prefs:
            if not isinstance(prefs['avoid_ingredients'], list):
                errors.append("preferences.avoid_ingredients must be a list")

        if 'novelty_recipe_limit' in prefs:
            if not isinstance(prefs['novelty_recipe_limit'], int) or prefs['novelty_recipe_limit'] < 0:
                errors.append("preferences.novelty_recipe_limit must be a non-negative integer")

    # Validate kid_profiles
    if 'kid_profiles' in config:
        profiles = config['kid_profiles']
        if not isinstance(profiles, dict):
            errors.append("kid_profiles must be a dictionary (name: {preferences, avoid_ingredients})")
        else:
            for name, profile in profiles.items():
                if not isinstance(profile, dict):
                    errors.append(f"kid_profiles.{name} must be a dictionary")
                else:
                    for field in ['preferences', 'avoid_ingredients']:
                        if field in profile and not isinstance(profile[field], list):
                            errors.append(f"kid_profiles.{name}.{field} must be a list")

    # Validate lunch_defaults (optional)
    if 'lunch_defaults' in config:
        lunch = config['lunch_defaults']
        if not isinstance(lunch, dict):
            errors.append("lunch_defaults must be a dictionary")
        else:
            for category in ['kids', 'adult']:
                if category in lunch and not isinstance(lunch[category], list):
                    errors.append(f"lunch_defaults.{category} must be a list of strings")

    # Validate snack_defaults (optional)
    if 'snack_defaults' in config:
        snacks = config['snack_defaults']
        if not isinstance(snacks, dict):
            errors.append("snack_defaults must be a dictionary")
        else:
            if 'by_day' in snacks:
                if not isinstance(snacks['by_day'], dict):
                    errors.append("snack_defaults.by_day must be a dictionary")
                else:
                    valid_days = {'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}
                    for day in snacks['by_day'].keys():
                        if day not in valid_days:
                            errors.append(f"Invalid day '{day}' in snack_defaults.by_day")

            if 'fallback' in snacks:
                if not isinstance(snacks['fallback'], dict):
                    errors.append("snack_defaults.fallback must be a dictionary")

    # Print results
    if errors:
        print(f"❌ Config validation failed for {config_path}:")
        for error in errors:
            print(f"  - {error}")
        return False
    else:
        print(f"✓ Config schema valid: {config_path}")
        return True


if __name__ == '__main__':
    # Check for --config flag
    if '--config' in sys.argv:
        config_path = 'config.yml'
        if len(sys.argv) > 2 and not sys.argv[2].startswith('--'):
            config_path = sys.argv[2]

        if validate_config_schema(config_path):
            sys.exit(0)
        else:
            sys.exit(1)
    else:
        validate_yaml_files()
