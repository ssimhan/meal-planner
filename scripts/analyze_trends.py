#!/usr/bin/env python3
"""Analyze execution history and generate insights report."""

import argparse
import yaml
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

# Default path if argument not provided
DEFAULT_HISTORY_FILE = Path('data/history.yml')

def load_history(filepath):
    path = Path(filepath)
    if not path.exists():
        print(f"Error: {path} not found.")
        return {'weeks': []}
    with open(path, 'r') as f:
        return yaml.safe_load(f) or {'weeks': []}

def calculate_recipe_stats(weeks):
    stats = defaultdict(lambda: {'planned': 0, 'made': 0, 'skipped': 0, 'ratings': []})
    
    for week in weeks:
        if 'dinners' not in week:
            continue
            
        for dinner in week['dinners']:
            # Skip if no execution data - assumes 'made' key is indicator of logged data
            if 'made' not in dinner:
                continue
                
            r_id = dinner['title'] if 'title' in dinner else dinner.get('recipe_id', 'Unknown')
            
            stats[r_id]['planned'] += 1
            
            made = dinner.get('made', True)
            
            if made is True or made == 'yes' or made == 'freezer_backup':
                 stats[r_id]['made'] += 1
            else:
                 stats[r_id]['skipped'] += 1
                 
            if 'kids_feedback' in dinner:
                stats[r_id]['ratings'].append(dinner['kids_feedback'])
                
    return stats

def calculate_veg_stats(weeks):
    veg_counts = Counter()
    total_weeks_logged = 0
    
    for week in weeks:
        week_vegs = set()
        logged_days = 0
        for dinner in week.get('dinners', []):
            if 'vegetables_used' in dinner:
                logged_days += 1
                for v in dinner['vegetables_used']:
                    val_lower = v.lower().strip()
                    if val_lower:
                        week_vegs.add(val_lower)
                        veg_counts[val_lower] += 1
        
        if logged_days > 0:
            total_weeks_logged += 1
            
    return veg_counts, total_weeks_logged

def calculate_adherence(weeks):
    adherence_scores = []
    for week in weeks:
        if 'plan_adherence_pct' in week:
            adherence_scores.append((week['week_of'], week['plan_adherence_pct']))
    return adherence_scores

def calculate_freezer_stats(weeks):
    usage_count = 0
    added_count = 0
    
    for week in weeks:
        if 'dinners' in week:
            for dinner in week['dinners']:
                if dinner.get('made') == 'freezer' or dinner.get('made') == 'freezer_backup':
                    usage_count += 1
                if dinner.get('made_2x_for_freezer'):
                    added_count += 1
                    
    return {'usage': usage_count, 'added': added_count}

def generate_markdown_report(recipe_stats, veg_counts, weeks_logged, adherence, freezer_stats):
    lines = []
    lines.append(f"# 📊 Meal Planning Insights Report")
    lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d')}\n")
    
    # 1. Recipe Performance
    lines.append("## 🥘 Recipe Performance\n")
    lines.append("| Recipe | Success Rate | Times Made | Avg Rating |")
    lines.append("|---|---|---|---|")
    
    sorted_recipes = sorted(recipe_stats.items(), key=lambda x: (x[1]['made'] / x[1]['planned'] if x[1]['planned']>0 else 0), reverse=True)
    
    if not sorted_recipes:
        lines.append("\n_No recipe data finding._\n")
    else:
        for r_id, data in sorted_recipes:
            planned = data['planned']
            if planned == 0: continue
            made = data['made']
            rate = (made / planned) * 100
            
            rating_str = "-"
            if data['ratings']:
                rating_counts = Counter(data['ratings'])
                top_rating = rating_counts.most_common(1)[0][0]
                rating_str = top_rating
                
            lines.append(f"| {r_id} | {rate:.0f}% | {made}/{planned} | {rating_str} |")
        lines.append("\n")

    # 2. Vegetable Usage
    lines.append("## 🥦 Vegetable Consumption\n")
    if weeks_logged > 0:
        lines.append(f"**Weeks Analyzed:** {weeks_logged}")
        lines.append("| Vegetable | Total Used | Avg per Week |")
        lines.append("|---|---|---|")
        for veg, count in veg_counts.most_common(10):
            avg = count / weeks_logged
            lines.append(f"| {veg.title()} | {count} | {avg:.1f} |")
    else:
        lines.append("_No vegetable usage data found._")
    lines.append("\n")
    
    # 3. Adherence
    lines.append("## 📈 Plan Adherence\n")
    if adherence:
        lines.append("| Week | Adherence % |")
        lines.append("|---|---|")
        for week_date, score in adherence:
            lines.append(f"| {week_date} | {score}% |")
    else:
        lines.append("_No adherence data found._")
    lines.append("\n")
    
    # 4. Freezer stats
    lines.append("## 🧊 Freezer Activity\n")
    lines.append(f"- **Meals Used:** {freezer_stats['usage']}")
    lines.append(f"- **Batches Added:** {freezer_stats['added']}")
    
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description='Analyze meal plan execution trends.')
    parser.add_argument('--output', help='Output markdown file path')
    parser.add_argument('--history-file', default=str(DEFAULT_HISTORY_FILE), help='Path to history file')
    args = parser.parse_args()
    
    data = load_history(args.history_file)
    weeks = data.get('weeks', [])
    
    recipe_stats = calculate_recipe_stats(weeks)
    veg_counts, weeks_logged = calculate_veg_stats(weeks)
    adherence = calculate_adherence(weeks)
    freezer_stats = calculate_freezer_stats(weeks)
    
    report = generate_markdown_report(recipe_stats, veg_counts, weeks_logged, adherence, freezer_stats)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report written to {args.output}")
    else:
        print(report)

if __name__ == '__main__':
    main()
