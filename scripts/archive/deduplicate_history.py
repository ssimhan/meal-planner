#!/usr/bin/env python3
"""Deduplicate and merge week entries in history.yml."""

import yaml
from pathlib import Path
import shutil
from datetime import datetime

HISTORY_FILE = Path('data/history.yml')
BACKUP_FILE = Path(f'data/history_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.yml')

def merge_weeks(target, source):
    """Merge source week data into target week data, preserving more detailed info."""
    # If target is missing dinners but source has them, take source
    if not target.get('dinners') and source.get('dinners'):
        target['dinners'] = source['dinners']
    
    # Merge dinners if both have them (by day match)
    elif target.get('dinners') and source.get('dinners'):
        target_days = {d['day']: d for d in target['dinners']}
        for s_dinner in source['dinners']:
            day = s_dinner['day']
            if day in target_days:
                # Update target dinner with source dinner if source has execution data
                t_dinner = target_days[day]
                if 'made' not in t_dinner and 'made' in s_dinner:
                    t_dinner.update(s_dinner)
                elif 'made' in s_dinner:
                    # Both have execution, maybe merge fields or skip?
                    # For simplicity, if source has more fields, take its values
                    if len(s_dinner) > len(t_dinner):
                        t_dinner.update(s_dinner)
                
                # Deduplicate vegetables list
                if 'vegetables' in t_dinner:
                    t_dinner['vegetables'] = sorted(list(set(t_dinner['vegetables'])))
            else:
                target['dinners'].append(s_dinner)
                # Ensure new dinner also has deduplicated vegetables
                if 'vegetables' in s_dinner:
                    s_dinner['vegetables'] = sorted(list(set(s_dinner['vegetables'])))
    
    # Merge other top-level fields
    for key, value in source.items():
        if key == 'dinners' or key == 'week_of':
            continue
        if key not in target or (not target[key] and value):
            target[key] = value
        elif isinstance(target[key], list) and isinstance(value, list):
            # Unique merge for lists like fridge_vegetables
            target[key] = sorted(list(set(target[key] + value)))

def main():
    if not HISTORY_FILE.exists():
        print(f"Error: {HISTORY_FILE} not found.")
        return

    print(f"Backing up history to {BACKUP_FILE}...")
    shutil.copy(HISTORY_FILE, BACKUP_FILE)

    with open(HISTORY_FILE, 'r') as f:
        data = yaml.safe_load(f) or {'weeks': []}

    weeks = data.get('weeks', [])
    if not weeks:
        print("No weeks found to deduplicate.")
        return

    merged_weeks = {}
    original_count = len(weeks)

    for week in weeks:
        week_of = week.get('week_of')
        if not week_of:
            continue
        
        # Always deduplicate vegetables in the source week before merging or adding
        for dinner in week.get('dinners', []):
            if 'vegetables' in dinner:
                dinner['vegetables'] = sorted(list(set(dinner['vegetables'])))

        if week_of in merged_weeks:
            print(f"Merging duplicate week: {week_of}")
            merge_weeks(merged_weeks[week_of], week)
        else:
            merged_weeks[week_of] = week

    new_weeks = sorted(merged_weeks.values(), key=lambda x: x['week_of'])
    data['weeks'] = new_weeks

    with open(HISTORY_FILE, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"\n✓ Deduplication complete.")
    print(f"  Original entries: {original_count}")
    print(f"  Merged entries:   {len(new_weeks)}")
    print(f"  Cleaned history saved to {HISTORY_FILE}")

if __name__ == '__main__':
    main()
