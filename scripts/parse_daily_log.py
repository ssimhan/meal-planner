#!/usr/bin/env python3
"""Parse daily check-in comments and update logs."""

import argparse
import yaml
from datetime import datetime
from pathlib import Path


def parse_comment(comment_text):
    """Extract structured data from free-form comment.

    Looks for patterns like:
    - "Lunch: ..."
    - "Dinner: ..."
    - "Notes: ..."
    """
    data = {
        'lunch': '',
        'dinner': '',
        'notes': ''
    }

    for line in comment_text.split('\n'):
        line = line.strip()
        if line.lower().startswith('lunch:'):
            data['lunch'] = line.split(':', 1)[1].strip()
        elif line.lower().startswith('dinner:'):
            data['dinner'] = line.split(':', 1)[1].strip()
        elif line.lower().startswith('notes:'):
            data['notes'] = line.split(':', 1)[1].strip()

    return data


def check_for_freezer_usage(parsed_data):
    """Check if a freezer backup meal was used.

    Looks for keywords like 'freezer', 'backup', or specific meal names.
    Returns meal name if found, None otherwise.
    """
    text = f"{parsed_data['lunch']} {parsed_data['dinner']} {parsed_data['notes']}".lower()

    # Check for general freezer usage
    if 'freezer' in text or 'backup' in text or 'frozen' in text:
        # Try to extract meal name from notes
        # This is a simple heuristic - can be improved
        for word in ['chana masala', 'bean soup', 'dal', 'curry', 'pasta']:
            if word in text:
                return word.title()
        return 'Unknown Freezer Meal'

    return None


def update_inventory_freezer(meal_used):
    """Remove a freezer backup meal from inventory."""
    inventory_file = Path('data/inventory.yml')

    if not inventory_file.exists():
        return

    with open(inventory_file) as f:
        inventory = yaml.safe_load(f)

    if not inventory or 'freezer' not in inventory or 'backups' not in inventory['freezer']:
        return

    # Find and remove the used meal (first match)
    backups = inventory['freezer']['backups']
    meal_lower = meal_used.lower()

    for i, backup in enumerate(backups):
        if meal_lower in backup['meal'].lower():
            backups.pop(i)
            print(f"  → Removed freezer backup: {backup['meal']}")
            break

    # Update last_updated timestamp
    inventory['last_updated'] = datetime.now().strftime('%Y-%m-%d')

    # Write back
    with open(inventory_file, 'w') as f:
        yaml.dump(inventory, f, default_flow_style=False, sort_keys=False)


def update_logs(date_str, parsed_data):
    """Append to logs.yml and update inventory if needed."""
    logs_file = Path('data/logs.yml')

    # Load or create logs
    if logs_file.exists():
        with open(logs_file) as f:
            logs = yaml.safe_load(f) or {'daily_logs': []}
    else:
        logs = {'daily_logs': []}

    # Ensure daily_logs exists
    if 'daily_logs' not in logs:
        logs['daily_logs'] = []

    # Append new entry
    logs['daily_logs'].append({
        'date': date_str,
        'lunch': parsed_data['lunch'],
        'dinner': parsed_data['dinner'],
        'notes': parsed_data['notes']
    })

    # Write back
    with open(logs_file, 'w') as f:
        yaml.dump(logs, f, default_flow_style=False, sort_keys=False)

    # Check if a freezer backup was used
    freezer_meal = check_for_freezer_usage(parsed_data)
    if freezer_meal:
        print(f"  → Detected freezer backup usage: {freezer_meal}")
        update_inventory_freezer(freezer_meal)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--comment', required=True)
    parser.add_argument('--date', required=True)
    parser.add_argument('--issue-title', required=True)
    args = parser.parse_args()

    # Parse date from issue created_at timestamp
    date_str = datetime.fromisoformat(args.date.replace('Z', '+00:00')).strftime('%Y-%m-%d')

    # Parse comment
    parsed = parse_comment(args.comment)

    # Update logs
    update_logs(date_str, parsed)

    print(f"Logged meals for {date_str}")
