#!/usr/bin/env python3
"""Parse daily check-in comments/body and update execution logs."""

import argparse
import re
import subprocess
import sys
from datetime import datetime, timedelta

def get_week_start(date_obj):
    """Return Monday of the week for the given date."""
    start = date_obj - timedelta(days=date_obj.weekday())
    return start.strftime('%Y-%m-%d')

def parse_checkboxes(text):
    """Parse markdown text for checked items.
    
    Returns a dict with extracted info.
    """
    lines = text.split('\n')
    data = {
        'made': None,
        'made_2x': False,
        'freezer_meal': None,
        'actual_meal': None,
        'vegetables': [],
        'kids_feedback': None,
        'kids_complaints': None,
        'notes': None
    }
    
    # State tracking
    section = None
    
    for line in lines:
        line = line.strip()
        
        # Checkboxes: - [x] Status
        checked_match = re.match(r'^-\s*\[[xX]\]\s*(.*)', line)
        checked_text = checked_match.group(1).strip() if checked_match else None
        
        # Section extraction
        if 'Did you make the planned dinner?' in line:
            section = 'made'
        elif 'If "Used freezer backup"' in line:
            section = 'freezer_details'
        elif 'What vegetables did you use' in line:
            section = 'vegetables'
        elif 'Kids\' feedback' in line:
            section = 'feedback'
        elif 'Any complaints' in line:
            section = 'complaints'
        elif 'Notes (optional)' in line:
            section = 'notes'
        elif line.startswith('###'):
            section = None # Reset on new header

        if checked_text:
            # Map checked items based on section or content
            if "Made as planned" in checked_text:
                data['made'] = 'yes'
                if "+ froze 2x" in checked_text:
                    data['made_2x'] = True
            elif "Used freezer backup" in checked_text:
                data['made'] = 'freezer'
            elif "Made something else" in checked_text:
                data['made'] = 'no'
            elif "Ate out" in checked_text:
                data['made'] = 'no'
                data['actual_meal'] = "Ate out"
            
            # Vegetables
            if section == 'vegetables':
                # clean emojis if any? None in template
                data['vegetables'].append(checked_text)
                
            # Freezer details
            if section == 'freezer_details':
                # Extract meal name "Bisi Bele Bath (frozen ...)" => "Bisi Bele Bath"
                meal_name = re.split(r'\s*\(frozen', checked_text)[0].strip()
                data['freezer_meal'] = meal_name
                
            # Feedback
            if section == 'feedback':
                data['kids_feedback'] = checked_text
                
        # Free text extraction (for actual meal, complaints, notes)
        # This is harder with just line iteration.
        # We'll rely on "<!-- key:name -->" markers or next lines?
        # The template has comments.
        pass

    # Extract free text using regex for multiline sections
    # 1. Actual Meal
    actual_match = re.search(r'If "Made something else".*?<!-- Enter meal name below -->\s*(.*?)\s*---', text, re.DOTALL)
    if actual_match:
        content = actual_match.group(1).strip()
        if content and content != "[Free text]":
            data['actual_meal'] = content

    # 2. Complaints
    complaints_match = re.search(r'Any complaints\?.*?\<!-- key:complaints -->\s*(.*?)\s*---', text, re.DOTALL)
    if complaints_match:
        content = complaints_match.group(1).strip()
        if content and content != "[Free text]":
            data['kids_complaints'] = content

    # 3. Notes (Notes is at the end)
    notes_match = re.search(r'Notes \(optional\).*?<!-- key:notes -->\s*(.*)', text, re.DOTALL)
    if notes_match:
        content = notes_match.group(1).strip()
        if content and content != "[Free text for any other observations]":
            data['notes'] = content

    return data

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--comment', required=True, help="Issue body text")
    parser.add_argument('--date', required=True, help="Issue created_at (ISO)")
    parser.add_argument('--issue-title', required=True)
    args = parser.parse_args()

    # Parse date
    try:
        dt = datetime.fromisoformat(args.date.replace('Z', '+00:00'))
    except ValueError:
        # Fallback for testing or different formats
        dt = datetime.now() # Should not happen in CI
        
    week_start = get_week_start(dt)
    day_short = dt.strftime('%a').lower() # mon, tue...

    print(f"Processing check-in for {dt.date()} ({day_short}) - Week of {week_start}")

    # Parse Checkboxes
    data = parse_checkboxes(args.comment)
    
    if not data['made']:
        print("Skipping: No 'made' status selected.")
        return

    # Construct Command
    cmd = [
        "python3", "scripts/log_execution.py",
        "--week", week_start,
        "--day", day_short,
        "--made", data['made']
    ]
    
    if data['made_2x']:
        cmd.append("--made-2x")
        
    if data['vegetables']:
        cmd.extend(["--vegetables", ",".join(data['vegetables'])])
        
    if data['kids_feedback']:
        cmd.extend(["--kids-feedback", data['kids_feedback']])
        
    if data['freezer_meal']:
        cmd.extend(["--freezer-meal", data['freezer_meal']])
        
    if data['actual_meal']:
        cmd.extend(["--actual-meal", data['actual_meal']])
        
    if data['kids_complaints']:
        cmd.extend(["--kids-complaints", data['kids_complaints']])
        
    if data['notes']:
        cmd.extend(["--reason", data['notes']]) # Map notes to reason if free text? Or just ignore?
        # log_execution.py has --reason map to "deviations". Notes might be general.
        # But for now, let's just log it if we can, or skip.
        pass

    print(f"Running: {' '.join(cmd)}")
    
    # Execute
    subprocess.run(cmd, check=True)

if __name__ == '__main__':
    main()
