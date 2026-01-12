#!/usr/bin/env python3
"""
Update Weekly Plan HTML with Actual Data from history.yml

This script regenerates a weekly plan HTML file using actual logged data
from history.yml instead of planned data.
"""

import re
import yaml
from pathlib import Path
from datetime import datetime, timedelta
import os
from api.utils.storage import StorageEngine


def load_history(history_path=None):
    """Load history from DB."""
    try:
        data = StorageEngine.get_history()
        return data
    except Exception as e:
        print(f"Error loading history from DB: {e}")
        return {}


def find_week_in_history(history, week_of):
    """Find a specific week in history."""
    for week in history.get('weeks', []):
        if week.get('week_of') == week_of:
            return week
    return None


def generate_actual_snack_section(day_key, week_history):
    """Generate snack section with actual logged data."""
    html = []

    # Get actual snacks from history
    daily_fb = week_history.get('daily_feedback', {}).get(day_key, {}) if week_history else {}
    school_snack = daily_fb.get('school_snack', '')
    home_snack = daily_fb.get('home_snack', '')

    # If no data logged, show placeholder
    if not school_snack and not home_snack:
        html.append('            <div class="snacks">')
        html.append('                <h4>Snack</h4>')
        html.append('                <p style="font-size: var(--text-sm); margin-top: 4px;"><em>No data logged</em></p>')
        html.append('            </div>')
        return html

    html.append('            <div class="snacks">')

    if school_snack:
        html.append('                <h4>🏫 School Snack</h4>')
        html.append(f'                <p style="font-size: var(--text-sm); margin-top: 4px;">{school_snack}</p>')

    if home_snack:
        html.append('                <h4 style="margin-top: 12px; color: var(--text-default);">🏠 Home Snack</h4>')
        html.append(f'                <p style="font-size: var(--text-sm); margin-top: 4px;">{home_snack}</p>')

    html.append('            </div>')
    return html


def generate_actual_lunch_section(day_key, week_history):
    """Generate lunch section with actual logged data."""
    html = []

    # Get actual lunch from history
    daily_fb = week_history.get('daily_feedback', {}).get(day_key, {}) if week_history else {}
    kids_lunch = daily_fb.get('kids_lunch', '')
    adult_lunch = daily_fb.get('adult_lunch', '')

    html.append('            <div class="lunch-section">')
    html.append('                <h4>🥪 Lunch</h4>')

    if kids_lunch:
        html.append(f'                <p><strong>Kids:</strong> {kids_lunch}</p>')
    else:
        html.append('                <p><strong>Kids:</strong> <em>No data logged</em></p>')

    if adult_lunch:
        html.append(f'                <p><strong>Adult (1):</strong> {adult_lunch}</p>')
    elif not kids_lunch:
        html.append('                <p><em>No data logged</em></p>')
    else:
        html.append('                <p><strong>Adult (1):</strong> <em>Leftovers or grain bowl</em></p>')

    html.append('            </div>')
    return html


def generate_actual_dinner_section(day_key, week_history):
    """Generate dinner section with actual logged data."""
    html = []

    # Find dinner for this day
    dinner = None
    for d in week_history.get('dinners', []):
        if d.get('day') == day_key:
            dinner = d
            break

    if not dinner:
        return []

    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')

    # Get actual meal name or use recipe_id
    meal_name = dinner.get('actual_meal') or dinner.get('recipe_id', 'Unknown').replace('_', ' ').title()
    cuisine = dinner.get('cuisine', 'Various').title()
    meal_type = dinner.get('meal_type', 'Unknown').replace('_', ' ').title()

    html.append(f'                <div class="meal-type">{meal_name} - {cuisine} {meal_type}</div>')

    # Vegetables
    vegetables = dinner.get('vegetables', [])
    if vegetables:
        veg_str = ', '.join(vegetables)
        html.append(f'                <div class="vegetables">Main vegetables: {veg_str}</div>')

    # Prep notes if any
    if dinner.get('made') == 'freezer_backup' and 'freezer_used' in dinner:
        freezer_meal = dinner['freezer_used'].get('meal', 'Unknown')
        frozen_date = dinner['freezer_used'].get('frozen_date', 'Unknown')
        html.append('                <div class="prep-notes">')
        html.append(f'                    <strong>Prep notes:</strong> Frozen {frozen_date}, reheat and serve')
        html.append('                </div>')

    # Evening assembly
    html.append('                <div class="evening-assembly">')
    html.append('                    <strong>Evening assembly (5-9pm):</strong> Minimal tasks - assemble, heat, serve')
    html.append('                </div>')

    html.append('            </div>')
    return html


def generate_overview_table_row(day_name, day_key, week_history):
    """Generate one row for the overview table with actual data."""
    daily_fb = week_history.get('daily_feedback', {}).get(day_key, {})

    # Get data
    kids_lunch = daily_fb.get('kids_lunch', '—')
    adult_lunch = daily_fb.get('adult_lunch', '<em>Leftovers or grain bowl</em>')

    # Combine snacks
    school_snack = daily_fb.get('school_snack', '')
    home_snack = daily_fb.get('home_snack', '')
    if school_snack and home_snack:
        snack_display = f'{school_snack} / {home_snack}'
    elif school_snack:
        snack_display = school_snack
    elif home_snack:
        snack_display = home_snack
    else:
        snack_display = '—'

    # Get dinner
    dinner_name = '—'
    for d in week_history.get('dinners', []):
        if d.get('day') == day_key:
            dinner_name = d.get('actual_meal') or d.get('recipe_id', 'Unknown').replace('_', ' ').title()
            break

    # Determine background
    bg = 'transparent' if day_name in ['Monday', 'Wednesday', 'Friday'] else 'rgba(0,0,0,0.02)'

    html = []
    html.append(f'                        <tr style="border-bottom: 1px solid var(--border-subtle); background: {bg};">')
    html.append(f'                            <td style="padding: 12px; font-weight: 500;"><strong>{day_name}</strong></td>')
    html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;">{kids_lunch}</td>')
    html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;">{snack_display}</td>')
    html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;">{adult_lunch}</td>')
    html.append(f'                            <td style="padding: 12px; font-weight: 500;">{dinner_name}</td>')
    html.append('                        </tr>')

    return '\n'.join(html)


def update_weekly_plan_html(week_of):
    """Update weekly plan HTML with actual data from history.yml."""

    # Load history
    history = load_history()
    week_history = find_week_in_history(history, week_of)

    if not week_history:
        print(f"ERROR: Week {week_of} not found in history.yml")
        return False

    # Load existing HTML to preserve structure
    html_path = Path(f'public/plans/{week_of}-weekly-plan.html')
    if not html_path.exists():
        print(f"ERROR: HTML file {html_path} not found")
        return False

    with open(html_path, 'r') as f:
        html_content = f.read()

    # Update overview table
    days = [
        ('Monday', 'mon'),
        ('Tuesday', 'tue'),
        ('Wednesday', 'wed'),
        ('Thursday', 'thu'),
        ('Friday', 'fri')
    ]

    # Find and replace overview table rows
    table_start = html_content.find('<tbody>')
    table_end = html_content.find('</tbody>')

    if table_start == -1 or table_end == -1:
        print("ERROR: Could not find overview table in HTML")
        return False

    # Generate new table rows
    new_rows = []
    for day_name, day_key in days:
        new_rows.append(generate_overview_table_row(day_name, day_key, week_history))

    new_table_body = '\n'.join(new_rows)
    html_content = (
        html_content[:table_start + 8] +  # Keep <tbody>
        '\n' + new_table_body + '\n                    ' +
        html_content[table_end:]
    )

    # Update individual day tabs
    for day_name, day_key in days:
        # Find the day tab
        day_marker = f'<!-- {day_name} Tab -->'
        day_start = html_content.find(day_marker)
        if day_start == -1:
            continue

        # Find the next tab or end
        next_day_idx = [
            ('Tuesday', 'tue'),
            ('Wednesday', 'wed'),
            ('Thursday', 'thu'),
            ('Friday', 'fri'),
            ('Saturday', 'sat')
        ]

        # Find next section
        day_end = len(html_content)
        for next_name, _ in next_day_idx:
            next_marker = f'<!-- {next_name} Tab -->'
            next_pos = html_content.find(next_marker, day_start + 1)
            if next_pos != -1 and next_pos < day_end:
                day_end = next_pos
                break

        # If no next day found, look for Saturday or Sunday
        if day_end == len(html_content):
            for weekend in ['Saturday', 'Sunday', 'Groceries']:
                weekend_marker = f'<!-- {weekend} Tab -->'
                weekend_pos = html_content.find(weekend_marker, day_start + 1)
                if weekend_pos != -1:
                    day_end = weekend_pos
                    break

        day_section = html_content[day_start:day_end]

        # Replace lunch section
        lunch_start = day_section.find('<div class="lunch-section">')
        if lunch_start != -1:
            lunch_end = day_section.find('</div>', lunch_start) + 6
            new_lunch = '\n'.join(generate_actual_lunch_section(day_key, week_history))
            day_section = day_section[:lunch_start] + new_lunch + '\n' + day_section[lunch_end:]

        # Replace snack section
        snack_start = day_section.find('<div class="snacks">')
        if snack_start != -1:
            snack_end = day_section.find('</div>', snack_start)
            # Find the actual end (might have nested divs)
            depth = 1
            pos = snack_start + len('<div class="snacks">')
            while depth > 0 and pos < len(day_section):
                if day_section[pos:pos+5] == '<div ':
                    depth += 1
                elif day_section[pos:pos+6] == '</div>':
                    depth -= 1
                    if depth == 0:
                        snack_end = pos + 6
                        break
                pos += 1

            new_snack = '\n'.join(generate_actual_snack_section(day_key, week_history))
            day_section = day_section[:snack_start] + new_snack + '\n' + day_section[snack_end:]

        # Replace dinner section if present
        dinner_start = day_section.find('<div class="meal-card">')
        if dinner_start != -1:
            dinner_end = day_section.find('</div>', dinner_start)
            # Find the actual end
            depth = 1
            pos = dinner_start + len('<div class="meal-card">')
            while depth > 0 and pos < len(day_section):
                if day_section[pos:pos+5] == '<div ':
                    depth += 1
                elif day_section[pos:pos+6] == '</div>':
                    depth -= 1
                    if depth == 0:
                        dinner_end = pos + 6
                        break
                pos += 1

            new_dinner = '\n'.join(generate_actual_dinner_section(day_key, week_history))
            if new_dinner:
                day_section = day_section[:dinner_start] + new_dinner + '\n' + day_section[dinner_end:]

        # Replace the day section in full HTML
        html_content = html_content[:day_start] + day_section + html_content[day_end:]

    # Write updated HTML
    with open(html_path, 'w') as f:
        f.write(html_content)

    print(f"✅ Successfully updated {html_path} with actual data from history.yml")
    return True


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 scripts/update_plan_with_actuals.py YYYY-MM-DD")
        sys.exit(1)

    week_of = sys.argv[1]
    success = update_weekly_plan_html(week_of)
    sys.exit(0 if success else 1)
