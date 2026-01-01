#!/usr/bin/env python3
"""
Archive meal history older than 6 months to separate files.
Usage: python3 scripts/archive_history.py
"""

import yaml
import sys
from pathlib import Path
from datetime import datetime, timedelta

def main():
    history_file = Path('data/history.yml')
    archive_dir = Path('data/archive')
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    if not history_file.exists():
        print("No history.yml found.")
        sys.exit(0)
        
    with open(history_file, 'r') as f:
        data = yaml.safe_load(f) or {'weeks': []}
        
    weeks = data.get('weeks', [])
    if not weeks:
        print("History is empty.")
        sys.exit(0)
        
    # Cutoff date: 6 months ago
    cutoff_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
    
    to_archive = []
    to_keep = []
    
    for week in weeks:
        if week['week_of'] < cutoff_date:
            to_archive.append(week)
        else:
            to_keep.append(week)
            
    if not to_archive:
        print("No old history to archive.")
        sys.exit(0)
        
    # Group by year for archiving
    by_year = {}
    for week in to_archive:
        year = week['week_of'][:4]
        if year not in by_year:
            by_year[year] = []
        by_year[year].append(week)
        
    # Write archives
    for year, year_weeks in by_year.items():
        archive_file = archive_dir / f'history_{year}.yml'
        
        # Load existing archive if any
        existing_weeks = []
        if archive_file.exists():
            with open(archive_file, 'r') as f:
                arch_data = yaml.safe_load(f) or {'weeks': []}
                existing_weeks = arch_data.get('weeks', [])
                
        # Merge and sort
        # Simple merge: append new ones. 
        # (Assuming we run this periodically and don't double archive, strictly removing from main)
        all_weeks = existing_weeks + year_weeks
        # Sort by date
        all_weeks.sort(key=lambda x: x['week_of'])
        
        # Write back
        with open(archive_file, 'w') as f:
            yaml.dump({'weeks': all_weeks}, f, default_flow_style=False, sort_keys=False)
            
        print(f"Archived {len(year_weeks)} weeks to {archive_file}")
        
    # Update main history
    data['weeks'] = to_keep
    with open(history_file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        
    print(f"Updated history.yml. Kept {len(to_keep)} weeks.")

if __name__ == '__main__':
    main()
