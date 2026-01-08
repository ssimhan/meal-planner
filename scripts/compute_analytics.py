#!/usr/bin/env python3
"""Compute meal planning analytics from history.yml."""

import yaml
from pathlib import Path
from datetime import datetime, timedelta
import collections

HISTORY_FILE = Path('data/history.yml')
RECIPE_INDEX = Path('recipes/index.yml')

# Map emojis to scores
FEEDBACK_SCORES = {
    '❤️': 5,
    '👍': 4,
    '😐': 3,
    '👎': 2,
    '❌': 1
}

def load_yaml(path):
    if not path.exists():
        return None
    with open(path, 'r') as f:
        return yaml.safe_load(f)

def compute_analytics(history_data=None, start_date=None, end_date=None):
    history = history_data if history_data else load_yaml(HISTORY_FILE)
    recipes = load_yaml(RECIPE_INDEX) or []
    
    if not history or 'weeks' not in history:
        return {"status": "error", "message": "No history found"}

    # Initialize data structures
    recipe_stats = collections.defaultdict(lambda: {
        'count': 0, 
        'made_count': 0, 
        'skip_count': 0, 
        'feedback_scores': [], 
        'cuisines': set(),
        'kid_feedback': []
    })
    
    overall_stats = {
        'total_weeks': len(history['weeks']),
        'total_dinners_planned': 0,
        'total_dinners_made': 0,
        'total_dinners_skipped': 0,
        'total_freezer_used': 0,
        'total_freezer_created': 0,
        'cuisine_distribution': collections.Counter(),
        'weekly_adherence': [],
        'kid_preferences': collections.Counter() # To track overall favs/dislikes
    }

    # Time range: Last 12 weeks
    now = datetime.now()
    twelve_weeks_ago = now - timedelta(weeks=12)
    
    for week in history['weeks']:
        week_date = datetime.strptime(week['week_of'], '%Y-%m-%d')
        is_recent = week_date >= twelve_weeks_ago
        
        overall_stats['weekly_adherence'].append({
            'week_of': week['week_of'],
            'adherence': week.get('plan_adherence_pct', 0)
        })

        # Process Dinners
        for dinner in week.get('dinners', []):
            recipe_id = dinner.get('recipe_id')
            if not recipe_id or recipe_id == 'unplanned_meal':
                continue
            
            overall_stats['total_dinners_planned'] += 1
            
            stats = recipe_stats[recipe_id]
            stats['count'] += 1
            
            made_status = dinner.get('made')
            if made_status is True:
                overall_stats['total_dinners_made'] += 1
                stats['made_count'] += 1
            elif made_status is False:
                overall_stats['total_dinners_skipped'] += 1
                stats['skip_count'] += 1
            elif made_status == 'freezer_backup':
                overall_stats['total_freezer_used'] += 1
                stats['made_count'] += 1 # Technically made something, but from freezer
            
            if dinner.get('made_2x_for_freezer'):
                overall_stats['total_freezer_created'] += 1
            
            if 'cuisine' in dinner:
                overall_stats['cuisine_distribution'][dinner['cuisine']] += 1
                stats['cuisines'].add(dinner['cuisine'])

            # Handle kids_feedback (emoji)
            feedback = dinner.get('kids_feedback')
            if feedback in FEEDBACK_SCORES:
                score = FEEDBACK_SCORES[feedback]
                stats['feedback_scores'].append(score)
                stats['kid_feedback'].append(feedback)
                overall_stats['kid_preferences'][feedback] += 1

        # Process Daily Feedback (Snacks/Lunches)
        if 'daily_feedback' in week:
            for day, feedback in week['daily_feedback'].items():
                for meal_type in ['school_snack', 'home_snack', 'kids_lunch', 'adult_lunch']:
                    f_val = feedback.get(meal_type)
                    if f_val in FEEDBACK_SCORES:
                        overall_stats['kid_preferences'][f_val] += 1

    # Finalize Recipe Popularity
    popularity_table = []
    for rid, stats in recipe_stats.items():
        avg_score = sum(stats['feedback_scores']) / len(stats['feedback_scores']) if stats['feedback_scores'] else 0
        skip_rate = (stats['skip_count'] / stats['count'] * 100) if stats['count'] > 0 else 0
        
        recipe_info = next((r for r in recipes if r['id'] == rid), {})
        
        popularity_table.append({
            'id': rid,
            'name': recipe_info.get('name', rid.replace('_', ' ').title()),
            'count': stats['count'],
            'made_count': stats['made_count'],
            'skip_count': stats['skip_count'],
            'avg_score': round(avg_score, 1),
            'skip_rate': round(skip_rate, 1),
            'cuisines': list(stats['cuisines']),
            'last_feedback': stats['kid_feedback'][-1] if stats['kid_feedback'] else None
        })

    # Sort by score and count
    popularity_table.sort(key=lambda x: (x['avg_score'], x['count']), reverse=True)

    # Retirement Candidates
    retirement_candidates = [
        r for r in popularity_table 
        if (r['avg_score'] > 0 and r['avg_score'] < 3) or r['skip_rate'] > 50
    ]

    return {
        "status": "success",
        "overall": {
            "total_weeks": overall_stats['total_weeks'],
            "adherence_avg": round(sum(w['adherence'] for w in overall_stats['weekly_adherence']) / len(overall_stats['weekly_adherence']), 1) if overall_stats['weekly_adherence'] else 0,
            "total_freezer_used": overall_stats['total_freezer_used'],
            "total_freezer_created": overall_stats['total_freezer_created'],
            "cuisine_distribution": dict(overall_stats['cuisine_distribution']),
            "kid_preference_counts": dict(overall_stats['kid_preferences'])
        },
        "popularity": popularity_table,
        "retirement": retirement_candidates,
        "weekly_adherence": overall_stats['weekly_adherence'][-12:] # Last 12 weeks
    }

if __name__ == "__main__":
    import json
    print(json.dumps(compute_analytics(), indent=2))
