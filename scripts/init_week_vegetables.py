#!/usr/bin/env python3
"""Initialize fridge vegetables from the weekly plan HTML."""

import argparse
import yaml
import sys
from pathlib import Path
from bs4 import BeautifulSoup

HISTORY_FILE = Path('data/history.yml')
PLANS_DIR = Path('plans')

def load_history():
    if not HISTORY_FILE.exists():
        return {'weeks': []}
    with open(HISTORY_FILE, 'r') as f:
        return yaml.safe_load(f) or {'weeks': []}

def save_history(history):
    with open(HISTORY_FILE, 'w') as f:
        yaml.dump(history, f, default_flow_style=False, sort_keys=False)

def extract_vegetables_from_html(html_path):
    """Parse HTML and extract Fresh Produce items."""
    if not html_path.exists():
        print(f"Error: Plan file {html_path} not found.")
        sys.exit(1)

    with open(html_path, 'r') as f:
        soup = BeautifulSoup(f, 'html.parser')

    vegetables = set()

    # Strategy 1: Look for "Fresh Produce" section in Groceries tab
    # Structure: div.grocery-section > h4 "Fresh Produce" + ul > li
    grocery_sections = soup.find_all('div', class_='grocery-section')
    fresh_produce_section = None
    
    for section in grocery_sections:
        header = section.find('h4')
        if header and 'Fresh Produce' in header.get_text():
            fresh_produce_section = section
            break
            
    if fresh_produce_section:
        ul = fresh_produce_section.find('ul')
        if ul:
            for li in ul.find_all('li'):
                text = li.get_text().strip()
                # Ignore placeholders
                if '[' in text and ']' in text:
                    continue
                    
                # Basic cleaning: remove quantities if possible
                # e.g. "3 onions" -> "onions" ? 
                # For now, just keep the text as is, or maybe simplistic cleaning
                # The prompt implies simple list: "bell pepper", "broccoli"
                # If the grocery list has "3 x Bell Pepper", we might want "Bell Pepper"
                vegetables.add(text)

    # Strategy 2: If Grocery list yielded nothing (or only placeholders), scrape daily cards
    if not vegetables:
        print("Warning: 'Fresh Produce' section empty or contained placeholders. Scraping daily meal cards...")
        # Look for div.vegetables
        # "Main vegetables: cauliflower, cilantro..."
        veg_divs = soup.find_all('div', class_='vegetables')
        for div in veg_divs:
            text = div.get_text().replace('Main vegetables:', '').strip()
            if not text:
                continue
            # Split by comma
            items = [x.strip() for x in text.split(',')]
            for item in items:
                if item:
                    vegetables.add(item.lower()) # Normalize to lowercase

    return sorted(list(vegetables))

def main():
    parser = argparse.ArgumentParser(description='Initialize fridge vegetables from weekly plan.')
    parser.add_argument('--week', required=True, help='Week start date (YYYY-MM-DD)')
    args = parser.parse_args()

    # 1. Find the plan file
    html_filename = f"{args.week}-weekly-plan.html"
    html_path = PLANS_DIR / html_filename
    
    print(f"Reading plan: {html_path}")
    
    # 2. Extract vegetables
    vegetables = extract_vegetables_from_html(html_path)
    
    if not vegetables:
        print("No vegetables found in the plan.")
        sys.exit(1)
        
    print(f"Found {len(vegetables)} vegetables: {', '.join(vegetables)}")

    # 3. Update history.yml
    history = load_history()
    
    # Find or create week entry
    week_entry = None
    for week in history.get('weeks', []):
        if week.get('week_of') == args.week:
            week_entry = week
            break
            
    if not week_entry:
        print(f"Creating new entry for week {args.week}")
        week_entry = {'week_of': args.week, 'dinners': []}
        history.setdefault('weeks', []).append(week_entry)
        
    # Update fridge_vegetables
    # Note: This overwrites existing list.
    week_entry['fridge_vegetables'] = vegetables
    
    save_history(history)
    print(f"✅ Updated history.yml for week {args.week}")

if __name__ == '__main__':
    main()
