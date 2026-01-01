#!/usr/bin/env python3
"""
Scan repo for .yml/.yaml files and validate their syntax.
Exits with 1 if any invalid files are found.
"""
import sys
import yaml
from pathlib import Path

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

if __name__ == '__main__':
    validate_yaml_files()
