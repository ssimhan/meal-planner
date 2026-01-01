# Execution Tracking & Insights Implementation Plan

**Created:** 2026-01-01
**Status:** Ready for implementation
**Estimated effort:** 2-3 focused work sessions

## Overview

Two major features to add to the meal planner system:

1. **Dynamic Execution Tracking** - Track what you actually did vs. what was planned, and refresh the meal plan in real-time to adjust for the rest of the week
2. **Trends & Insights** - Analyze historical data to identify patterns and provide actionable recommendations

## Feature 1: Dynamic Execution Tracking

### Goals
- Track actual meals made, prep time, energy levels, and deviations from plan
- Automatically refresh the weekly HTML plan to reflect:
  - ✅ Completed tasks
  - ⚠️ Deviations and their impact on remaining days
  - Updated freezer backup count
  - Adjusted prep requirements for remaining days

### Schema Design

**New file structure:**
```
data/
  execution/
    2025-12-29-execution.yml
    2026-01-05-execution.yml
```

**Execution file schema (`data/execution/YYYY-MM-DD-execution.yml`):**

```yaml
week_of: '2025-12-29'
last_updated: '2025-12-31T20:15:00'

daily_logs:
  mon:
    date: '2025-12-29'

    lunch:
      planned: "Veggie quesadillas with cheese and beans"
      actual: "PBJ - ran out of time"
      prep_time_minutes: 5
      notes: "Too tired from weekend"

    dinner:
      planned: "Cauliflower Rasam"
      actual: "Cauliflower Rasam"
      made: true
      made_2x_for_freezer: true
      prep_time_minutes: 45
      actual_prep_start: "17:30"
      actual_dinner_ready: "18:15"
      family_rating: 4  # out of 5 (1=disliked, 5=loved)
      notes: "Kids liked it, doubled batch successfully. Good Monday meal."

    prep_tasks:
      planned:
        - "Chop all vegetables for Mon-Fri dinners"
        - "Batch cook Monday dinner (2x)"
        - "Prep lunch components for Tue/Wed/Thu/Fri"
        - "Portion snacks for entire week"
      completed:
        - "Chop Mon-Wed vegetables only"
        - "Made dinner 2x successfully"
        - "Portioned some snacks"
      skipped:
        - "Prep Thu/Fri lunch components - too tired"
        - "Chop Thu/Fri vegetables - ran out of time"
      energy_level: 3  # 1-5 scale (1=exhausted, 5=high energy)
      notes: "Started strong but ran out of steam by 8pm. Didn't finish Thu/Fri prep."

    vegetables_used: ["cauliflower", "tomato", "cilantro", "onion", "garlic"]

    freezer_action:
      added: ["Cauliflower Rasam (4 servings) - frozen 2025-12-29"]
      used: []

  tue:
    date: '2025-12-30'

    lunch:
      planned: "Pasta salad with vegetables"
      actual: "Pasta salad with vegetables"
      prep_time_minutes: 10
      notes: "Components were prepped Monday, just assembled"

    dinner:
      planned: "Chickpea Chaat Salad"
      actual: "Chickpea Chaat Salad"
      made: true
      made_2x_for_freezer: false
      prep_time_minutes: 30
      family_rating: 3
      notes: "Decent, kids preferred Monday's meal"

    prep_tasks:
      planned:
        - "Assemble Tuesday lunch"
        - "Check freezer backup inventory"
      completed:
        - "Assemble Tuesday lunch"
        - "Checked freezer - we have 3 meals"
      skipped: []
      energy_level: 3

    vegetables_used: ["bell pepper", "carrot", "cucumber", "cilantro", "tomato"]

    freezer_action:
      added: []
      used: []

  wed:
    date: '2025-12-31'

    lunch:
      planned: "Grilled cheese with tomato soup"
      actual: "Leftover Chickpea Chaat"
      notes: "Used leftovers instead"

    dinner:
      planned: "Chickpea Salad Wrap"
      actual: "Freezer backup - Cauliflower Rasam"
      made: false
      reason_skipped: "Too tired, used freezer backup from Monday"
      prep_time_minutes: 10  # just reheating
      family_rating: 4
      notes: "Grateful for freezer backup. No energy for cooking."

    prep_tasks:
      planned:
        - "Verify Thu/Fri lunch components ready"
        - "Load Instant Pot for Thursday"
      completed: []
      skipped:
        - "Didn't prep anything - too exhausted"
      energy_level: 1  # very low energy
      notes: "Completely exhausted. Skipped all prep. Thu/Fri will need adjustment."

    vegetables_used: []  # used freezer meal

    freezer_action:
      added: []
      used: ["Cauliflower Rasam (4 servings) - used 2025-12-31"]

  thu:
    date: '2026-01-01'
    # To be filled in...

  fri:
    date: '2026-01-02'
    # To be filled in...

weekly_summary:
  freezer_backup_current: 2  # down from 3, used 1
  meals_as_planned: 2  # Mon, Tue
  meals_deviated: 1  # Wed
  meals_skipped: 0
  freezer_meals_used: 1  # Wed
  total_prep_time_minutes: 100  # through Wed
  avg_energy_level: 2.3  # (3+3+1)/3
  vegetables_purchased: ["cauliflower", "sweet potato", "carrot", "cilantro", "tomato", "onion", "garlic", "bell pepper", "cucumber"]
  vegetables_used: ["cauliflower", "tomato", "cilantro", "onion", "garlic", "bell pepper", "carrot", "cucumber"]
  vegetables_wasted: []  # still have sweet potato unused as of Wed
  vegetables_remaining: ["sweet potato", "carrot", "onion", "garlic"]

  plan_adherence_pct: 67  # 2 of 3 meals as planned
  notes: "Week started strong but energy dropped Wed. Thu/Fri need replanning."
```

### GitHub Actions Integration

**File: `.github/workflows/meal-checkin.yml`**

```yaml
name: Daily Meal Check-in
on:
  workflow_dispatch:
    inputs:
      week_of:
        description: 'Week start date (YYYY-MM-DD)'
        required: true
      day:
        description: 'Day (mon/tue/wed/thu/fri)'
        required: true
        type: choice
        options:
          - mon
          - tue
          - wed
          - thu
          - fri

      # Lunch tracking
      lunch_actual:
        description: 'What did you actually make for lunch?'
        required: true
      lunch_prep_time:
        description: 'Lunch prep time (minutes)'
        required: false
        default: '0'

      # Dinner tracking
      dinner_made:
        description: 'Did you make the planned dinner?'
        required: true
        type: choice
        options:
          - 'yes'
          - 'no - used freezer backup'
          - 'no - made something else'
          - 'no - ate out'
      dinner_actual:
        description: 'If different from plan, what did you make?'
        required: false
      dinner_prep_time:
        description: 'Dinner prep time (minutes)'
        required: false
        default: '0'
      dinner_rating:
        description: 'Family rating (1-5)'
        required: false
        type: choice
        options:
          - '5'
          - '4'
          - '3'
          - '2'
          - '1'
      made_2x:
        description: 'Did you make 2x and freeze half?'
        required: false
        type: boolean
        default: false

      # Energy & prep tracking
      energy_level:
        description: 'Your energy level today (1-5)'
        required: true
        type: choice
        options:
          - '5'
          - '4'
          - '3'
          - '2'
          - '1'
      prep_completed:
        description: 'What prep tasks did you complete? (comma-separated)'
        required: false
      prep_skipped:
        description: 'What prep tasks did you skip? (comma-separated)'
        required: false

      # Freezer tracking
      freezer_added:
        description: 'What did you add to freezer? (comma-separated)'
        required: false
      freezer_used:
        description: 'What freezer meals did you use? (comma-separated)'
        required: false

      # Notes
      notes:
        description: 'Any additional notes?'
        required: false

jobs:
  log-execution:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install pyyaml

      - name: Log daily execution
        run: |
          python3 scripts/log_execution.py \
            --week "${{ inputs.week_of }}" \
            --day "${{ inputs.day }}" \
            --lunch-actual "${{ inputs.lunch_actual }}" \
            --lunch-prep-time "${{ inputs.lunch_prep_time }}" \
            --dinner-made "${{ inputs.dinner_made }}" \
            --dinner-actual "${{ inputs.dinner_actual }}" \
            --dinner-prep-time "${{ inputs.dinner_prep_time }}" \
            --dinner-rating "${{ inputs.dinner_rating }}" \
            --made-2x "${{ inputs.made_2x }}" \
            --energy-level "${{ inputs.energy_level }}" \
            --prep-completed "${{ inputs.prep_completed }}" \
            --prep-skipped "${{ inputs.prep_skipped }}" \
            --freezer-added "${{ inputs.freezer_added }}" \
            --freezer-used "${{ inputs.freezer_used }}" \
            --notes "${{ inputs.notes }}"

      - name: Refresh meal plan
        run: |
          python3 scripts/refresh_plan.py "${{ inputs.week_of }}"

      - name: Commit and push changes
        run: |
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"
          git add data/execution/ plans/
          git commit -m "Update meal execution: ${{ inputs.week_of }} ${{ inputs.day }}"
          git push
```

### Implementation Scripts

#### Script 1: `scripts/log_execution.py`

```python
#!/usr/bin/env python3
"""
Log daily meal execution data.

Usage:
    python3 scripts/log_execution.py --week 2025-12-29 --day mon \
        --lunch-actual "PBJ" --dinner-made yes --energy-level 3
"""

import argparse
import yaml
from pathlib import Path
from datetime import datetime, timedelta

def main():
    parser = argparse.ArgumentParser(description='Log daily meal execution')
    parser.add_argument('--week', required=True, help='Week start date (YYYY-MM-DD)')
    parser.add_argument('--day', required=True, choices=['mon', 'tue', 'wed', 'thu', 'fri'])
    parser.add_argument('--lunch-actual', required=True)
    parser.add_argument('--lunch-prep-time', type=int, default=0)
    parser.add_argument('--dinner-made', required=True, choices=['yes', 'no - used freezer backup', 'no - made something else', 'no - ate out'])
    parser.add_argument('--dinner-actual', default='')
    parser.add_argument('--dinner-prep-time', type=int, default=0)
    parser.add_argument('--dinner-rating', type=int, default=0)
    parser.add_argument('--made-2x', type=bool, default=False)
    parser.add_argument('--energy-level', type=int, required=True, choices=[1, 2, 3, 4, 5])
    parser.add_argument('--prep-completed', default='')
    parser.add_argument('--prep-skipped', default='')
    parser.add_argument('--freezer-added', default='')
    parser.add_argument('--freezer-used', default='')
    parser.add_argument('--notes', default='')

    args = parser.parse_args()

    # Load or create execution file
    exec_dir = Path('data/execution')
    exec_dir.mkdir(parents=True, exist_ok=True)
    exec_file = exec_dir / f'{args.week}-execution.yml'

    if exec_file.exists():
        with open(exec_file, 'r') as f:
            data = yaml.safe_load(f)
    else:
        data = {
            'week_of': args.week,
            'last_updated': datetime.now().isoformat(),
            'daily_logs': {},
            'weekly_summary': {
                'freezer_backup_current': 3,  # default
                'meals_as_planned': 0,
                'meals_deviated': 0,
                'freezer_meals_used': 0,
                'total_prep_time_minutes': 0,
            }
        }

    # Load the planned meal from the meal plan
    plan_file = Path(f'plans/{args.week}-weekly-plan.html')
    # TODO: Parse HTML to extract planned lunch/dinner for this day
    # For now, we'll require manual input

    # Calculate date for this day
    week_start = datetime.strptime(args.week, '%Y-%m-%d')
    day_offset = {'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4}[args.day]
    day_date = (week_start + timedelta(days=day_offset)).strftime('%Y-%m-%d')

    # Create daily log entry
    daily_log = {
        'date': day_date,
        'lunch': {
            'actual': args.lunch_actual,
            'prep_time_minutes': args.lunch_prep_time,
        },
        'dinner': {
            'made': args.dinner_made == 'yes',
            'prep_time_minutes': args.dinner_prep_time,
        },
        'prep_tasks': {
            'completed': [t.strip() for t in args.prep_completed.split(',') if t.strip()],
            'skipped': [t.strip() for t in args.prep_skipped.split(',') if t.strip()],
        },
        'energy_level': args.energy_level,
        'freezer_action': {
            'added': [t.strip() for t in args.freezer_added.split(',') if t.strip()],
            'used': [t.strip() for t in args.freezer_used.split(',') if t.strip()],
        },
        'notes': args.notes,
    }

    if args.dinner_rating > 0:
        daily_log['dinner']['family_rating'] = args.dinner_rating

    if args.dinner_actual:
        daily_log['dinner']['actual'] = args.dinner_actual

    if args.made_2x:
        daily_log['dinner']['made_2x_for_freezer'] = True

    # Update data
    data['daily_logs'][args.day] = daily_log
    data['last_updated'] = datetime.now().isoformat()

    # Update weekly summary
    update_weekly_summary(data)

    # Write back
    with open(exec_file, 'w') as f:
        yaml.dump(data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"✓ Logged execution for {args.week} {args.day}")
    print(f"  Energy level: {args.energy_level}/5")
    print(f"  Dinner made: {args.dinner_made}")
    print(f"  Total prep time: {args.lunch_prep_time + args.dinner_prep_time} minutes")

def update_weekly_summary(data):
    """Recalculate weekly summary statistics."""
    summary = data['weekly_summary']

    # Count meals
    meals_planned = 0
    meals_deviated = 0
    freezer_used_count = 0
    total_prep_time = 0
    total_energy = 0
    day_count = 0

    for day, log in data['daily_logs'].items():
        if 'dinner' in log:
            if log['dinner'].get('made', False):
                meals_planned += 1
            else:
                meals_deviated += 1

        if log.get('freezer_action', {}).get('used'):
            freezer_used_count += len(log['freezer_action']['used'])

        total_prep_time += log.get('lunch', {}).get('prep_time_minutes', 0)
        total_prep_time += log.get('dinner', {}).get('prep_time_minutes', 0)

        if 'energy_level' in log:
            total_energy += log['energy_level']
            day_count += 1

    summary['meals_as_planned'] = meals_planned
    summary['meals_deviated'] = meals_deviated
    summary['freezer_meals_used'] = freezer_used_count
    summary['total_prep_time_minutes'] = total_prep_time

    if day_count > 0:
        summary['avg_energy_level'] = round(total_energy / day_count, 1)

    # Calculate plan adherence
    total_meals = meals_planned + meals_deviated
    if total_meals > 0:
        summary['plan_adherence_pct'] = round((meals_planned / total_meals) * 100)

if __name__ == '__main__':
    main()
```

#### Script 2: `scripts/refresh_plan.py`

```python
#!/usr/bin/env python3
"""
Refresh the weekly meal plan HTML based on actual execution.
Marks completed items, highlights deviations, updates remaining tasks.

Usage:
    python3 scripts/refresh_plan.py 2025-12-29
"""

import sys
import yaml
from pathlib import Path
from datetime import datetime

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/refresh_plan.py YYYY-MM-DD")
        sys.exit(1)

    week_of = sys.argv[1]

    # Load execution data
    exec_file = Path(f'data/execution/{week_of}-execution.yml')
    if not exec_file.exists():
        print(f"No execution data found for week {week_of}")
        sys.exit(1)

    with open(exec_file, 'r') as f:
        execution = yaml.safe_load(f)

    # Load current plan
    plan_file = Path(f'plans/{week_of}-weekly-plan.html')
    if not plan_file.exists():
        print(f"No plan found for week {week_of}")
        sys.exit(1)

    with open(plan_file, 'r') as f:
        html_content = f.read()

    # Generate updated HTML with execution data
    updated_html = inject_execution_data(html_content, execution)

    # Write updated plan
    with open(plan_file, 'w') as f:
        f.write(updated_html)

    print(f"✓ Refreshed plan: {plan_file}")

    # Show summary
    summary = execution['weekly_summary']
    print(f"\nWeek Summary:")
    print(f"  Plan adherence: {summary.get('plan_adherence_pct', 0)}%")
    print(f"  Avg energy level: {summary.get('avg_energy_level', 0)}/5")
    print(f"  Freezer backups remaining: {summary.get('freezer_backup_current', 0)}")

    # Identify gaps for remaining days
    identify_remaining_gaps(execution)

def inject_execution_data(html_content, execution):
    """
    Inject execution data into HTML plan.

    Strategy:
    1. Add a "Progress" section at top showing week-to-date status
    2. Mark completed tasks with ✅
    3. Mark deviations with ⚠️
    4. Update freezer backup count
    5. Add alerts for remaining days based on what's been prepped
    """

    # TODO: Implement HTML injection
    # This will require parsing the HTML structure and adding:
    # - Progress indicators (checkmarks, warnings)
    # - Updated freezer count in Overview tab
    # - Alerts for remaining days (e.g., "Thu vegetables not prepped - plan to use freezer backup")
    # - Summary statistics

    # For now, add a simple banner at the top
    days_logged = len(execution.get('daily_logs', {}))
    summary = execution['weekly_summary']

    progress_html = f"""
    <div style="background: #fffbea; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #92400e;">Week Progress</h3>
        <p style="margin: 0; color: #78350f;">
            <strong>{days_logged}/5 days</strong> logged •
            <strong>{summary.get('plan_adherence_pct', 0)}%</strong> adherence •
            <strong>{summary.get('freezer_backup_current', 0)}</strong> freezer backups •
            Avg energy: <strong>{summary.get('avg_energy_level', 0)}/5</strong>
        </p>
    </div>
    """

    # Inject after the <h1> title
    html_content = html_content.replace('</h1>', '</h1>\n' + progress_html, 1)

    return html_content

def identify_remaining_gaps(execution):
    """Identify what prep is missing for remaining days and suggest actions."""

    daily_logs = execution.get('daily_logs', {})
    days = ['mon', 'tue', 'wed', 'thu', 'fri']

    # Find the last logged day
    last_logged_idx = 0
    for i, day in enumerate(days):
        if day in daily_logs:
            last_logged_idx = i

    if last_logged_idx == 4:  # All days logged
        print("\n✅ Week complete!")
        return

    # Check what prep is missing
    print(f"\n📋 Remaining Days Analysis:")

    # Check if Monday prep covered Thu/Fri
    mon_log = daily_logs.get('mon', {})
    mon_completed = mon_log.get('prep_tasks', {}).get('completed', [])
    mon_skipped = mon_log.get('prep_tasks', {}).get('skipped', [])

    thu_fri_veg_prepped = any('thu' in task.lower() or 'fri' in task.lower()
                               for task in mon_completed)

    if not thu_fri_veg_prepped and last_logged_idx < 3:
        print("  ⚠️ Thursday/Friday vegetables not prepped on Monday")
        print("     → Recommend: Use freezer backups for Thu/Fri OR prep Wednesday")

    # Check energy trends
    recent_energy = [log.get('energy_level', 3) for log in daily_logs.values()]
    avg_energy = sum(recent_energy) / len(recent_energy) if recent_energy else 3

    if avg_energy < 2.5:
        print(f"  ⚠️ Low energy week (avg {avg_energy:.1f}/5)")
        print("     → Recommend: Plan to use freezer backups for remaining days")

    # Check freezer status
    freezer_count = execution['weekly_summary'].get('freezer_backup_current', 0)
    if freezer_count < 2:
        print(f"  ⚠️ Low freezer backup count ({freezer_count})")
        print("     → Recommend: Make 2x batch of next dinner and freeze")

if __name__ == '__main__':
    main()
```

---

## Feature 2: Trends & Insights

### Enhanced History Schema

**Update `data/history.yml` structure:**

```yaml
weeks:
  - week_of: '2025-12-29'

    # High-level metrics
    plan_adherence_pct: 67
    total_prep_time_minutes: 180
    avg_energy_level: 2.3
    freezer_meals_used: 1
    vegetables_wasted: []

    # Detailed dinner tracking
    dinners:
      - recipe_id: cauliflower_rasam
        cuisine: indian
        meal_type: soup_stew
        day: mon

        # Execution tracking
        planned_day: mon
        actual_day: mon
        made: true
        family_rating: 4
        prep_time_minutes: 45
        made_2x: true

        vegetables: ["cauliflower", "cilantro", "lemon", "tomato"]

      - recipe_id: chickpea_chaat_salad
        cuisine: indian
        meal_type: salad
        day: tue
        planned_day: tue
        actual_day: tue
        made: true
        family_rating: 3
        prep_time_minutes: 30
        made_2x: false
        vegetables: ["bell pepper", "carrot", "cilantro", "cucumber", "tomato"]

      - recipe_id: chickpea_salad_wrap
        cuisine: mexican
        meal_type: tacos_wraps
        day: wed
        planned_day: wed
        actual_day: null
        made: false
        reason_skipped: "Too tired, used freezer backup"
        vegetables: []  # didn't use
```

### Analysis Script

**File: `scripts/analyze_trends.py`**

```python
#!/usr/bin/env python3
"""
Generate trends and insights from meal planning history.

Usage:
    python3 scripts/analyze_trends.py [--weeks N] [--output FILE]
"""

import argparse
import yaml
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

def main():
    parser = argparse.ArgumentParser(description='Analyze meal planning trends')
    parser.add_argument('--weeks', type=int, default=8, help='Number of weeks to analyze')
    parser.add_argument('--output', default='insights-report.md', help='Output file')

    args = parser.parse_args()

    # Load history
    history_path = Path('data/history.yml')
    with open(history_path, 'r') as f:
        history = yaml.safe_load(f)

    weeks = history['weeks'][-args.weeks:]

    print(f"Analyzing {len(weeks)} weeks of data...")

    # Generate insights
    insights = {
        'recipe_success': analyze_recipe_success(weeks),
        'energy_time': analyze_energy_time(weeks),
        'plan_adaptation': analyze_plan_adaptation(weeks),
    }

    # Generate markdown report
    report = generate_report(insights, len(weeks))

    # Write report
    output_path = Path(args.output)
    with open(output_path, 'w') as f:
        f.write(report)

    print(f"✓ Generated insights report: {output_path}")

def analyze_recipe_success(weeks):
    """Analyze which recipes are successful vs. skipped."""

    recipe_stats = defaultdict(lambda: {
        'planned': 0,
        'made': 0,
        'skipped': 0,
        'ratings': [],
        'prep_times': [],
    })

    for week in weeks:
        for dinner in week.get('dinners', []):
            recipe_id = dinner['recipe_id']
            stats = recipe_stats[recipe_id]

            stats['planned'] += 1

            if dinner.get('made', True):  # default to made if not tracked
                stats['made'] += 1
                if 'family_rating' in dinner:
                    stats['ratings'].append(dinner['family_rating'])
                if 'prep_time_minutes' in dinner:
                    stats['prep_times'].append(dinner['prep_time_minutes'])
            else:
                stats['skipped'] += 1

    # Calculate success rates
    for recipe_id, stats in recipe_stats.items():
        if stats['planned'] > 0:
            stats['success_rate'] = (stats['made'] / stats['planned']) * 100
        else:
            stats['success_rate'] = 0

        if stats['ratings']:
            stats['avg_rating'] = sum(stats['ratings']) / len(stats['ratings'])
        else:
            stats['avg_rating'] = 0

        if stats['prep_times']:
            stats['avg_prep_time'] = sum(stats['prep_times']) / len(stats['prep_times'])
        else:
            stats['avg_prep_time'] = 0

    return dict(recipe_stats)

def analyze_energy_time(weeks):
    """Analyze energy levels and actual prep times."""

    day_stats = defaultdict(lambda: {
        'energy_levels': [],
        'prep_times': [],
        'freezer_backup_used': 0,
        'total_days': 0,
    })

    weekly_stats = {
        'total_prep_times': [],
        'avg_energy_levels': [],
        'freezer_usage': [],
    }

    for week in weeks:
        # Week-level stats
        if 'total_prep_time_minutes' in week:
            weekly_stats['total_prep_times'].append(week['total_prep_time_minutes'])
        if 'avg_energy_level' in week:
            weekly_stats['avg_energy_levels'].append(week['avg_energy_level'])
        if 'freezer_meals_used' in week:
            weekly_stats['freezer_usage'].append(week['freezer_meals_used'])

        # Day-level stats (from execution tracking)
        exec_file = Path(f"data/execution/{week['week_of']}-execution.yml")
        if exec_file.exists():
            with open(exec_file, 'r') as f:
                execution = yaml.safe_load(f)

            for day, log in execution.get('daily_logs', {}).items():
                stats = day_stats[day]
                stats['total_days'] += 1

                if 'energy_level' in log:
                    stats['energy_levels'].append(log['energy_level'])

                prep_time = (log.get('lunch', {}).get('prep_time_minutes', 0) +
                            log.get('dinner', {}).get('prep_time_minutes', 0))
                stats['prep_times'].append(prep_time)

                if log.get('freezer_action', {}).get('used'):
                    stats['freezer_backup_used'] += 1

    return {
        'by_day': dict(day_stats),
        'weekly': weekly_stats,
    }

def analyze_plan_adaptation(weeks):
    """Analyze how often and why plans are adapted."""

    constraint_adherence = {
        'no_prep_friday': {'adhered': 0, 'violated': 0},
        'freezer_backup_maintained': {'adhered': 0, 'violated': 0},
        'monday_full_prep': {'adhered': 0, 'violated': 0},
    }

    deviation_reasons = Counter()
    deviation_patterns = defaultdict(int)

    for week in weeks:
        # Check execution data
        exec_file = Path(f"data/execution/{week['week_of']}-execution.yml")
        if not exec_file.exists():
            continue

        with open(exec_file, 'r') as f:
            execution = yaml.safe_load(f)

        # Check Friday no-prep adherence
        fri_log = execution.get('daily_logs', {}).get('fri', {})
        fri_prep_time = (fri_log.get('lunch', {}).get('prep_time_minutes', 0) +
                        fri_log.get('dinner', {}).get('prep_time_minutes', 0))

        if fri_prep_time <= 15:  # Allow 15min for reheating
            constraint_adherence['no_prep_friday']['adhered'] += 1
        else:
            constraint_adherence['no_prep_friday']['violated'] += 1

        # Check freezer backup maintenance
        freezer_count = execution.get('weekly_summary', {}).get('freezer_backup_current', 0)
        if freezer_count >= 3:
            constraint_adherence['freezer_backup_maintained']['adhered'] += 1
        else:
            constraint_adherence['freezer_backup_maintained']['violated'] += 1

        # Check Monday full prep completion
        mon_log = execution.get('daily_logs', {}).get('mon', {})
        mon_skipped = mon_log.get('prep_tasks', {}).get('skipped', [])

        if not mon_skipped or len(mon_skipped) == 0:
            constraint_adherence['monday_full_prep']['adhered'] += 1
        else:
            constraint_adherence['monday_full_prep']['violated'] += 1

        # Track deviation reasons
        for day, log in execution.get('daily_logs', {}).items():
            if not log.get('dinner', {}).get('made', True):
                reason = log['dinner'].get('reason_skipped', 'unknown')
                deviation_reasons[reason] += 1
                deviation_patterns[f"{day}_skip"] += 1

    return {
        'constraint_adherence': constraint_adherence,
        'deviation_reasons': dict(deviation_reasons),
        'deviation_patterns': dict(deviation_patterns),
    }

def generate_report(insights, num_weeks):
    """Generate markdown insights report."""

    lines = []
    lines.append(f"# Meal Planning Insights Report")
    lines.append(f"")
    lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"**Analysis period:** Last {num_weeks} weeks")
    lines.append(f"")

    # Section 1: Recipe Success Patterns
    lines.append("## Recipe Success Patterns")
    lines.append("")

    recipe_stats = insights['recipe_success']

    # Top performers
    top_recipes = sorted(
        [(k, v) for k, v in recipe_stats.items() if v['planned'] >= 2],
        key=lambda x: x[1]['success_rate'],
        reverse=True
    )[:10]

    lines.append("### Top Performers (High Success Rate)")
    lines.append("")
    for recipe_id, stats in top_recipes:
        if stats['success_rate'] >= 80:
            rating_str = f"{stats['avg_rating']:.1f}★" if stats['avg_rating'] > 0 else "No ratings"
            prep_str = f"{stats['avg_prep_time']:.0f}min" if stats['avg_prep_time'] > 0 else "N/A"
            lines.append(f"- **{recipe_id}**: {stats['success_rate']:.0f}% success ({stats['made']}/{stats['planned']}), {rating_str}, ~{prep_str} prep")

    lines.append("")

    # Frequent skips
    skip_recipes = sorted(
        [(k, v) for k, v in recipe_stats.items() if v['planned'] >= 2 and v['success_rate'] < 60],
        key=lambda x: x[1]['success_rate']
    )[:5]

    if skip_recipes:
        lines.append("### Frequently Skipped (< 60% Success)")
        lines.append("")
        for recipe_id, stats in skip_recipes:
            lines.append(f"- **{recipe_id}**: {stats['success_rate']:.0f}% success ({stats['made']}/{stats['planned']})")
            lines.append(f"  → Recommendation: Consider removing from rotation or moving to less busy days")
        lines.append("")

    # Family favorites
    favorite_recipes = sorted(
        [(k, v) for k, v in recipe_stats.items() if v['avg_rating'] >= 4.0],
        key=lambda x: x[1]['avg_rating'],
        reverse=True
    )[:5]

    if favorite_recipes:
        lines.append("### Family Favorites (4.0★+)")
        lines.append("")
        for recipe_id, stats in favorite_recipes:
            lines.append(f"- **{recipe_id}**: {stats['avg_rating']:.1f}★ average rating")
        lines.append("")

    # Section 2: Energy & Time Analysis
    lines.append("## Energy & Time Analysis")
    lines.append("")

    energy_stats = insights['energy_time']

    lines.append("### Energy Levels by Day")
    lines.append("")
    for day in ['mon', 'tue', 'wed', 'thu', 'fri']:
        day_data = energy_stats['by_day'].get(day, {})
        if day_data.get('energy_levels'):
            avg_energy = sum(day_data['energy_levels']) / len(day_data['energy_levels'])
            freezer_pct = (day_data['freezer_backup_used'] / day_data['total_days'] * 100) if day_data['total_days'] > 0 else 0

            energy_emoji = "✅" if avg_energy >= 3.5 else "⚠️" if avg_energy >= 2.5 else "🔴"

            lines.append(f"- **{day.upper()}**: {avg_energy:.1f}/5 {energy_emoji}")
            if freezer_pct > 30:
                lines.append(f"  - Freezer backup used {freezer_pct:.0f}% of time")

    lines.append("")

    lines.append("### Prep Time Analysis")
    lines.append("")

    weekly_prep = energy_stats['weekly']['total_prep_times']
    if weekly_prep:
        avg_weekly_prep = sum(weekly_prep) / len(weekly_prep)
        lines.append(f"- **Average weekly prep time**: {avg_weekly_prep:.0f} minutes")
        lines.append("")

    for day in ['mon', 'tue', 'wed', 'thu', 'fri']:
        day_data = energy_stats['by_day'].get(day, {})
        if day_data.get('prep_times'):
            avg_prep = sum(day_data['prep_times']) / len(day_data['prep_times'])
            lines.append(f"- **{day.upper()}**: ~{avg_prep:.0f} minutes average")

    lines.append("")

    # Section 3: Plan Adaptation Insights
    lines.append("## Plan Adaptation Insights")
    lines.append("")

    adaptation = insights['plan_adaptation']

    lines.append("### Constraint Adherence")
    lines.append("")

    for constraint, stats in adaptation['constraint_adherence'].items():
        total = stats['adhered'] + stats['violated']
        if total > 0:
            adherence_pct = (stats['adhered'] / total) * 100
            status = "✅" if adherence_pct >= 75 else "⚠️" if adherence_pct >= 50 else "🔴"

            constraint_name = constraint.replace('_', ' ').title()
            lines.append(f"- **{constraint_name}**: {adherence_pct:.0f}% {status}")

            if adherence_pct < 75:
                if constraint == 'no_prep_friday':
                    lines.append(f"  → You prep on Friday {100-adherence_pct:.0f}% of the time")
                    lines.append(f"  → Recommendation: Consider relaxing Friday no-prep rule or increasing freezer backups")
                elif constraint == 'freezer_backup_maintained':
                    lines.append(f"  → Freezer backup count below 3 on {100-adherence_pct:.0f}% of weeks")
                    lines.append(f"  → Recommendation: Prioritize batch cooking on Mondays")
                elif constraint == 'monday_full_prep':
                    lines.append(f"  → Monday prep incomplete {100-adherence_pct:.0f}% of the time")
                    lines.append(f"  → Recommendation: Reduce Monday prep scope or allocate more time")

    lines.append("")

    # Deviation patterns
    if adaptation['deviation_reasons']:
        lines.append("### Common Reasons for Deviations")
        lines.append("")
        for reason, count in sorted(adaptation['deviation_reasons'].items(), key=lambda x: x[1], reverse=True):
            lines.append(f"- {reason}: {count} times")
        lines.append("")

    # Recommendations
    lines.append("## Recommendations")
    lines.append("")

    # Calculate overall adherence
    total_adherence = []
    for stats in adaptation['constraint_adherence'].values():
        total = stats['adhered'] + stats['violated']
        if total > 0:
            total_adherence.append((stats['adhered'] / total) * 100)

    if total_adherence:
        avg_adherence = sum(total_adherence) / len(total_adherence)

        if avg_adherence >= 75:
            lines.append("✅ **Your meal planning system is working well!** Overall adherence is high.")
        elif avg_adherence >= 50:
            lines.append("⚠️ **Your meal planning system needs some adjustments.** Consider:")
        else:
            lines.append("🔴 **Your meal planning system needs significant changes.** Priority recommendations:")

        lines.append("")

    # Specific recommendations based on data
    mon_energy = energy_stats['by_day'].get('mon', {}).get('energy_levels', [])
    fri_energy = energy_stats['by_day'].get('fri', {}).get('energy_levels', [])

    if mon_energy:
        avg_mon_energy = sum(mon_energy) / len(mon_energy)
        if avg_mon_energy < 3.0:
            lines.append("1. **Monday energy is low** - Consider moving some prep to Sunday afternoon or reducing Monday scope")

    if fri_energy:
        avg_fri_energy = sum(fri_energy) / len(fri_energy)
        if avg_fri_energy < 2.5:
            lines.append("2. **Friday energy is consistently low** - Strictly enforce freezer backup usage on Fridays")

    freezer_usage = energy_stats['weekly']['freezer_usage']
    if freezer_usage:
        avg_freezer_usage = sum(freezer_usage) / len(freezer_usage)
        if avg_freezer_usage > 2:
            lines.append("3. **High freezer backup dependency** - This is good! Consider increasing freezer backup production")

    return '\n'.join(lines)

if __name__ == '__main__':
    main()
```

---

## Implementation Phases

### Phase 1: Execution Tracking Foundation (Session 1)
**Goal:** Get basic execution logging working

1. Create directory structure (`data/execution/`)
2. Implement `scripts/log_execution.py` (basic version)
3. Test manual logging: `python3 scripts/log_execution.py --week 2025-12-29 --day mon ...`
4. Verify YAML files are created correctly

**Validation:** Can log a full day's execution manually

---

### Phase 2: GitHub Actions Integration (Session 2)
**Goal:** Automate logging via your daily check-in workflow

1. Create `.github/workflows/meal-checkin.yml`
2. Test workflow dispatch from GitHub UI
3. Integrate into your existing daily check-in process
4. Implement `scripts/refresh_plan.py` (basic version with progress banner)

**Validation:** Can log execution via GitHub Actions, plan HTML is updated

---

### Phase 3: Trends Analysis (Session 3)
**Goal:** Generate insights from historical data

1. Implement `scripts/analyze_trends.py`
2. Test with existing history data (will work even without execution tracking)
3. Generate first insights report
4. Schedule weekly automated insights via GitHub Actions (optional)

**Validation:** Generate insights report showing recipe patterns, energy levels, constraint adherence

---

## Quick Start Commands

Once implemented:

```bash
# Log today's execution manually
python3 scripts/log_execution.py --week 2025-12-29 --day mon \
  --lunch-actual "PBJ" \
  --dinner-made yes \
  --energy-level 3 \
  --notes "Good day"

# Refresh the plan
python3 scripts/refresh_plan.py 2025-12-29

# Generate insights
python3 scripts/analyze_trends.py --weeks 8 --output insights-2026-01-01.md
```

Via GitHub Actions:
```
1. Go to Actions tab
2. Run "Daily Meal Check-in" workflow
3. Fill in form with today's data
4. Workflow auto-commits updated execution and plan
```

---

## Future Enhancements

Once core functionality is working:

1. **Predictive adjustments** - Auto-suggest Thursday/Friday changes based on Monday energy
2. **Vegetable waste tracking** - Alert when vegetables are about to expire
3. **Smart recipe suggestions** - Recommend recipes based on what's actually working
4. **Mobile-friendly interface** - Make GitHub Actions form easier to use on phone
5. **Automated reminders** - Slack/email reminders to log execution daily
6. **Visual dashboards** - Charts showing trends over time

---

## Notes

- Start simple: Phase 1 can be done in 1-2 hours
- GitHub Actions integration is optional - manual logging works fine
- Trends analysis will provide value even with just planned data (no execution tracking)
- The system is designed to be forgiving - missing data won't break anything
