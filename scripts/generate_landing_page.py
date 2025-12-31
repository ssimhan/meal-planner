#!/usr/bin/env python3
"""
Generate landing page for GitHub Pages deployment.

Reads template from templates/landing-page-template.html and populates it with:
- Latest meal plan week
- Freezer backup count from inventory.yml
- Days until next Sunday (shopping day)
- List of past meal plans
"""

import os
import yaml
from datetime import datetime, timedelta
from pathlib import Path


def get_next_sunday():
    """Calculate days until next Sunday (shopping day)."""
    today = datetime.now()
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7  # If today is Sunday, next Sunday is 7 days away

    if days_until_sunday == 0:
        return "Today!"
    elif days_until_sunday == 1:
        return "Tomorrow"
    else:
        return f"In {days_until_sunday} days"


def get_current_week_range():
    """Get the current week's date range (Monday-Sunday)."""
    today = datetime.now()
    # Calculate Monday of current week
    monday = today - timedelta(days=today.weekday())
    # Calculate Sunday of current week
    sunday = monday + timedelta(days=6)

    return f"Week of {monday.strftime('%b %d')} - {sunday.strftime('%d, %Y')}"


def get_freezer_backup_count(inventory_path):
    """Read freezer backup count from inventory.yml."""
    try:
        with open(inventory_path, 'r') as f:
            inventory = yaml.safe_load(f)

        backups = inventory.get('freezer', {}).get('backups', [])
        return len(backups)
    except Exception as e:
        print(f"Warning: Could not read inventory.yml: {e}")
        return 0


def get_latest_plan(plans_dir):
    """Find the most recent meal plan HTML file."""
    try:
        plans = list(Path(plans_dir).glob('*.html'))
        if not plans:
            return None, None

        # Sort by filename (which includes date) in reverse order
        plans.sort(reverse=True)
        latest = plans[0]

        # Extract date from filename (format: YYYY-MM-DD-weekly-plan.html)
        filename = latest.name
        date_str = filename[:10]  # First 10 chars are YYYY-MM-DD

        # Parse date and create readable range
        plan_date = datetime.strptime(date_str, '%Y-%m-%d')
        end_date = plan_date + timedelta(days=6)
        week_range = f"Week of {plan_date.strftime('%b %d')} - {end_date.strftime('%d, %Y')}"

        return f"plans/{filename}", week_range
    except Exception as e:
        print(f"Warning: Could not find latest plan: {e}")
        return None, None


def get_workflow_status(inputs_dir):
    """Detect workflow status from input files.

    Returns dict with:
    - current_week: {date_range, status, badges_html}
    - next_week: {date_range, status, badges_html, action_html}
    """
    result = {
        'current_week': None,
        'next_week': None
    }

    try:
        if not inputs_dir.exists():
            return result

        # Get all input files
        input_files = sorted(inputs_dir.glob('*.yml'))
        if not input_files:
            return result

        today = datetime.now()
        current_monday = today - timedelta(days=today.weekday())

        for input_file in input_files:
            with open(input_file, 'r') as f:
                data = yaml.safe_load(f)

            week_str = data.get('week_of')
            week_date = datetime.strptime(week_str, '%Y-%m-%d').date()
            end_date = week_date + timedelta(days=6)
            date_range = f"{week_date.strftime('%b %d')} - {end_date.strftime('%d, %Y')}"

            # Determine if this is current or next week
            is_current = week_date <= current_monday.date() < (week_date + timedelta(days=7))

            # Get workflow status
            wf_status = data.get('workflow', {}).get('status', 'intake_complete')
            fm_status = data.get('farmers_market', {}).get('status', 'proposed')

            # Generate status badges and action text
            if wf_status == 'plan_complete':
                badges = '<span class="badge badge-active">✓ plan active</span>'
                action = None
            elif wf_status == 'intake_complete':
                if fm_status == 'confirmed':
                    badges = '<span class="badge badge-ready">→ ready to generate</span>'
                    action = '<strong>Action needed:</strong> Run <code>./mealplan next</code> to generate plan'
                else:
                    badges = '<span class="badge badge-waiting">⏳ awaiting veggies</span>'
                    action = '<strong>Action needed:</strong> Review and confirm farmers market vegetables'
            else:
                badges = '<span class="badge badge-waiting">⏳ new week</span>'
                action = '<strong>Action needed:</strong> Create new week with <code>./mealplan next</code>'

            week_info = {
                'date_range': date_range,
                'status': wf_status,
                'fm_status': fm_status,
                'badges_html': badges,
                'action_html': action
            }

            if is_current:
                result['current_week'] = week_info
            elif not result['next_week']:  # First future week
                result['next_week'] = week_info

        return result

    except Exception as e:
        print(f"Warning: Could not detect workflow status: {e}")
        return result


def get_past_plans_list(plans_dir):
    """Generate HTML list of past meal plans organized by year and month."""
    try:
        plans = list(Path(plans_dir).glob('*.html'))
        if not plans:
            return '<p style="color: var(--text-muted);">No meal plans available yet.</p>'

        # Sort by filename (reverse chronological)
        plans.sort(reverse=True)

        # Group plans by year and month
        from collections import defaultdict
        plans_by_month = defaultdict(list)

        for plan in plans:
            filename = plan.name
            date_str = filename[:10]
            plan_date = datetime.strptime(date_str, '%Y-%m-%d')
            end_date = plan_date + timedelta(days=6)

            # Group by YYYY-MM
            month_key = plan_date.strftime('%Y-%m')
            month_label = plan_date.strftime('%B %Y')  # e.g., "January 2026"
            week_label = f"{plan_date.strftime('%b %d')} - {end_date.strftime('%d, %Y')}"

            plans_by_month[month_key].append({
                'filename': filename,
                'month_label': month_label,
                'week_label': week_label
            })

        # Generate HTML with collapsible month sections
        html_parts = []
        for month_key in sorted(plans_by_month.keys(), reverse=True):
            month_plans = plans_by_month[month_key]
            month_label = month_plans[0]['month_label']

            html_parts.append(f'<details open style="margin-bottom: 20px;">')
            html_parts.append(f'    <summary style="cursor: pointer; font-family: \'Space Mono\', monospace; font-weight: 700; font-size: 0.875rem; color: var(--accent-green); padding: 12px; background: rgba(45, 106, 79, 0.05); border-radius: 2px; list-style: none;">')
            html_parts.append(f'        <span style="margin-right: 8px;">▸</span>{month_label}')
            html_parts.append(f'    </summary>')
            html_parts.append(f'    <div style="padding: 10px 0 0 20px;">')

            for plan_info in month_plans:
                html_parts.append(
                    f'        <div style="padding: 10px 0; border-bottom: 1px solid var(--border-subtle);">'
                    f'<a href="plans/{plan_info["filename"]}" style="color: var(--accent-green); text-decoration: none; font-weight: 400;">'
                    f'📅 {plan_info["week_label"]}</a></div>'
                )

            html_parts.append(f'    </div>')
            html_parts.append(f'</details>')

        return '\n'.join(html_parts)
    except Exception as e:
        print(f"Warning: Could not generate past plans list: {e}")
        return '<p style="color: var(--text-muted);">Error loading meal plans.</p>'


def get_contextual_actions(workflow_status, latest_plan_url, github_repo_url):
    """Generate contextual quick action buttons based on workflow state."""
    actions = []

    # Priority 1: Check next week's status for actionable items
    if workflow_status['next_week']:
        nw = workflow_status['next_week']
        status = nw['status']
        fm_status = nw.get('fm_status', 'proposed')

        if status == 'intake_complete':
            # Farmers market vegetables need review/confirmation
            if fm_status == 'proposed':
                actions.append({
                    'icon': '📝',
                    'text': 'Review Farmers Market Veggies',
                    'url': f"{github_repo_url}/tree/main/inputs",
                    'priority': 1
                })
            # Vegetables confirmed, ready to generate plan
            elif fm_status == 'confirmed':
                actions.append({
                    'icon': '🚀',
                    'text': 'Generate Next Week\'s Plan',
                    'url': f"{github_repo_url}#readme",
                    'priority': 1
                })

    # Priority 2: Current week actions
    if workflow_status['current_week']:
        cw = workflow_status['current_week']
        if cw['status'] == 'plan_complete' and latest_plan_url and latest_plan_url != '#':
            actions.append({
                'icon': '🛒',
                'text': 'View Shopping List',
                'url': f"{latest_plan_url}#groceries",
                'priority': 2
            })

    # Priority 3: Always show - Daily check-in
    actions.append({
        'icon': '✏️',
        'text': 'Daily Check-in',
        'url': f"{github_repo_url}/issues?q=is%3Aissue+is%3Aopen+label%3Adaily-checkin",
        'priority': 3
    })

    # Priority 4: Always show - Past plans
    actions.append({
        'icon': '📅',
        'text': 'Past Meal Plans',
        'url': '#past-plans',
        'priority': 4
    })

    # Priority 5: Always show - GitHub repo
    actions.append({
        'icon': '🔧',
        'text': 'View on GitHub',
        'url': github_repo_url,
        'priority': 5
    })

    # Sort by priority and generate HTML
    actions.sort(key=lambda x: x['priority'])
    html_items = []
    for action in actions:
        html_items.append(
            f'<a href="{action["url"]}" class="action-button">{action["icon"]} {action["text"]}</a>'
        )

    return '\n'.join(html_items)


def generate_landing_page(template_path, output_path, plans_dir, inventory_path, inputs_dir, github_repo_url):
    """Generate landing page from template."""

    # Read template
    with open(template_path, 'r') as f:
        template = f.read()

    # Get dynamic data
    freezer_count = get_freezer_backup_count(inventory_path)
    days_until_shopping = get_next_sunday()
    latest_plan_url, week_range = get_latest_plan(plans_dir)
    past_plans_html = get_past_plans_list(plans_dir)
    workflow_status = get_workflow_status(inputs_dir)

    # Fallback if no plans exist yet
    if not latest_plan_url:
        latest_plan_url = "#"
        week_range = "No meal plans yet"

    # Format workflow status HTML
    current_week_html = ""
    next_week_html = ""

    if workflow_status['current_week']:
        cw = workflow_status['current_week']
        current_week_html = f"""
            <h3>📅 {cw['date_range']}</h3>
            {cw['badges_html']}
        """

    if workflow_status['next_week']:
        nw = workflow_status['next_week']
        action_block = f'<p style="margin-top: 12px; font-size: 0.875rem; color: var(--text-muted);">{nw["action_html"]}</p>' if nw['action_html'] else ''
        next_week_html = f"""
            <h3>📅 {nw['date_range']}</h3>
            {nw['badges_html']}
            {action_block}
        """

    # Generate contextual quick actions
    quick_actions_html = get_contextual_actions(workflow_status, latest_plan_url, github_repo_url)

    # Replace placeholders
    html = template.replace('{WEEK_DATE_RANGE}', week_range)
    html = html.replace('{LATEST_PLAN_URL}', latest_plan_url)
    html = html.replace('{FREEZER_BACKUP_COUNT}', str(freezer_count))
    html = html.replace('{DAYS_UNTIL_SHOPPING}', days_until_shopping)
    html = html.replace('{PAST_PLANS_LIST}', past_plans_html)
    html = html.replace('{GITHUB_REPO_URL}', github_repo_url)
    html = html.replace('{DAILY_CHECKIN_URL}', f"{github_repo_url}/issues?q=is%3Aissue+is%3Aopen+label%3Adaily-checkin")
    html = html.replace('{CURRENT_WEEK_STATUS}', current_week_html)
    html = html.replace('{NEXT_WEEK_STATUS}', next_week_html)
    html = html.replace('{QUICK_ACTIONS}', quick_actions_html)

    # Write output
    with open(output_path, 'w') as f:
        f.write(html)

    print(f"✅ Landing page generated: {output_path}")
    print(f"   - Week: {week_range}")
    print(f"   - Freezer backups: {freezer_count}")
    print(f"   - Shopping: {days_until_shopping}")


if __name__ == '__main__':
    # Paths
    repo_root = Path(__file__).parent.parent
    template_path = repo_root / 'templates' / 'landing-page-template.html'
    output_path = repo_root / '_site' / 'index.html'
    plans_dir = repo_root / '_site' / 'plans'
    inventory_path = repo_root / 'data' / 'inventory.yml'
    inputs_dir = repo_root / 'inputs'

    # GitHub repository URL (can be overridden by environment variable)
    github_repo = os.environ.get('GITHUB_REPOSITORY', 'ssimhan/meal-planner')
    github_repo_url = f"https://github.com/{github_repo}"

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Generate landing page
    generate_landing_page(
        template_path=template_path,
        output_path=output_path,
        plans_dir=plans_dir,
        inventory_path=inventory_path,
        inputs_dir=inputs_dir,
        github_repo_url=github_repo_url
    )
