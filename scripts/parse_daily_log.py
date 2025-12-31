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


def update_logs(date_str, parsed_data):
    """Append to logs.yml"""
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
