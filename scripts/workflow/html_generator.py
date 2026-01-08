import re
import yaml
from pathlib import Path
from datetime import datetime, timedelta

def generate_lunch_html(lunch_suggestion, day_name):
    """Generate HTML markup for a lunch section."""
    html = []
    html.append('            <div class="lunch-section">')
    if lunch_suggestion.recipe_id.startswith('pipeline_'):
        html.append('                <span class="energy-level energy-morning-ok" style="float: right; font-size: 0.7rem;">PLANNED PIPELINE</span>')
    html.append('                <h4>🥪 Lunch</h4>')
    if hasattr(lunch_suggestion, 'kid_profiles') and lunch_suggestion.kid_profiles:
        for name, desc in lunch_suggestion.kid_profiles.items():
            html.append(f'                <p><strong>{name}:</strong> {desc}</p>')
    elif lunch_suggestion.default_option:
        html.append(f'                <p><strong>Kids (2):</strong> {lunch_suggestion.recipe_name}</p>')
    else:
        html.append(f'                <p><strong>Kids (2):</strong> {lunch_suggestion.recipe_name}')
        if lunch_suggestion.kid_friendly:
            html.append(' 👶')
        html.append('</p>')
    if lunch_suggestion.default_option:
        html.append(f'                <p><strong>Adult (1):</strong> Leftovers or grain bowl</p>')
    else:
        html.append(f'                <p><strong>Adult (1):</strong> Leftovers or grain bowl with dinner components</p>')
    if not lunch_suggestion.default_option:
        if lunch_suggestion.prep_components:
            components_str = ', '.join(lunch_suggestion.prep_components)
            html.append(f'                <p><strong>Components:</strong> {components_str}')
        else:
            html.append(f'                <p><strong>Components:</strong> Fresh ingredients')
        if lunch_suggestion.reuses_ingredients:
            reused_str = ', '.join(lunch_suggestion.reuses_ingredients)
            html.append(f' <span style="color: var(--accent-sage);">♻️ Reuses: {reused_str}</span>')
        html.append('</p>')
    html.append(f'                <p><strong>Prep:</strong> {lunch_suggestion.assembly_notes}</p>')
    if not lunch_suggestion.default_option and lunch_suggestion.prep_style == 'component_based' and lunch_suggestion.storage_days > 0:
        html.append(f'                <p style="font-size: var(--text-xs); color: var(--text-muted);"><em>Components last {lunch_suggestion.storage_days} days refrigerated</em></p>')
    html.append('            </div>')
    return '\n'.join(html)

def generate_html_plan(inputs, history, selected_dinners, from_scratch_recipe=None, selected_lunches=None):
    """Generate the weekly plan as HTML."""
    template_path = Path('templates/weekly-plan-template.html')
    with open(template_path, 'r') as f:
        template_content = f.read()
    week_of = inputs['week_of']
    week_start = datetime.strptime(week_of, '%Y-%m-%d').date()
    week_end = week_start + timedelta(days=4)
    week_range = f"{week_start.strftime('%b %d, %Y')} - {week_end.strftime('%b %d, %Y')}"
    styles_end = template_content.find('</head>')
    html_head = template_content[:styles_end]
    html_head = html_head.replace('{WEEK_START_DATE}', week_start.strftime('%b %d, %Y'))
    html_head = html_head.replace('{WEEK_END_DATE}', week_end.strftime('%b %d, %Y'))
    html = []
    html.append(html_head)
    html.append('</head>')
    html.append('<body>')
    html.append('    <div class="container">')
    html.append(f'        <h1>📅 Weekly Meal Plan: {week_range}</h1>')
    if inputs.get('replan_notice'):
        html.append(f'        <div style="background: var(--accent-gold); color: black; padding: 10px; margin-bottom: 20px; text-align: center; border-radius: 4px; font-weight: bold; font-size: 0.9rem;">🔄 {inputs["replan_notice"]}</div>')
    html.append('')
    html.append('        <div class="tab-nav">')
    html.append('            <button class="tab-button active" onclick="showTab(\'overview\')">Overview</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'monday\')">Monday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'tuesday\')">Tuesday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'wednesday\')">Wednesday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'thursday\')">Thursday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'friday\')">Friday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'saturday\')">Saturday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'sunday\')">Sunday</button>')
    html.append('            <button class="tab-button" onclick="showTab(\'groceries\')">Groceries</button>')
    html.append('        </div>')
    week_history = None
    if history and 'weeks' in history:
        for week_data in history['weeks']:
            if week_data.get('week_of') == week_of:
                week_history = week_data
                break
    html.extend(generate_overview_tab(inputs, history, selected_dinners, from_scratch_recipe, selected_lunches or {}))
    html.extend(generate_weekday_tabs(inputs, selected_dinners, selected_lunches or {}, week_history))
    html.extend(generate_weekend_tabs())
    html.extend(generate_groceries_tab(inputs, selected_dinners, selected_lunches or {}))
    html.append('    </div>')
    html.append('')
    html.append('    <script>')
    html.append('        function showTab(tabName) {')
    html.append('            const tabContents = document.querySelectorAll(\'.tab-content\');')
    html.append('            tabContents.forEach(content => {')
    html.append('                content.classList.remove(\'active\');')
    html.append('            });')
    html.append('')
    html.append('            const tabButtons = document.querySelectorAll(\'.tab-button\');')
    html.append('            tabButtons.forEach(button => {')
    html.append('                button.classList.remove(\'active\');')
    html.append('            });')
    html.append('')
    html.append('            document.getElementById(tabName).classList.add(\'active\');')
    html.append('            event.target.classList.add(\'active\');')
    html.append('        }')
    html.append('    </script>')
    html.append('</body>')
    html.append('</html>')
    return '\n'.join(html)

def generate_overview_tab(inputs, history, selected_dinners, from_scratch_recipe, selected_lunches=None):
    """Generate the Overview tab content."""
    html = []
    html.append('        <!-- Overview Tab -->')
    html.append('        <div id="overview" class="tab-content active">')
    html.append('            <div class="freezer-backup">')
    html.append('                <h3>🧊 Freezer Backup Status</h3>')
    freezer_meals = []
    inventory_path = Path('data/inventory.yml')
    if inventory_path.exists():
        try:
            with open(inventory_path, 'r') as f:
                inventory = yaml.safe_load(f)
                if inventory and 'freezer' in inventory and 'backups' in inventory['freezer']:
                    freezer_meals = inventory['freezer']['backups']
        except Exception: pass
    if freezer_meals:
        html.append(f'                <p style="margin-bottom: 15px;">You have <strong>{len(freezer_meals)}/3</strong> backup meals in stock:</p>')
        html.append('                <ul>')
        for item in freezer_meals:
            meal = item.get('meal', 'Unknown Meal')
            date = item.get('frozen_date', 'Unknown Date')
            html.append(f'                    <li>{meal} - (Frozen {date})</li>')
        html.append('                </ul>')
    else:
        html.append('                <p style="margin-bottom: 15px; color: var(--accent-terracotta);">⚠️ <strong>Freezer Empty!</strong> No backup meals found.</p>')
    batch_suggestion = "[None identified yet]"
    days_of_week = ['mon', 'tue', 'wed', 'thu', 'fri']
    if selected_lunches:
        for day, suggestion in selected_lunches.items():
            if suggestion.recipe_id.startswith('pipeline_'):
                recipe_n = suggestion.recipe_name.replace("Leftovers: ", "")
                day_order = ['mon', 'tue', 'wed', 'thu', 'fri']
                try:
                    curr_idx = day_order.index(day)
                    prev_day = day_order[curr_idx - 1]
                    batch_suggestion = f"Double the <strong>{recipe_n}</strong> on {prev_day.capitalize()} (Planned for {day.capitalize()} lunch)"
                    break
                except (ValueError, IndexError): continue
    if batch_suggestion == "[None identified yet]":
        for day, recipe in selected_dinners.items():
             if day in days_of_week and recipe.get('meal_type') in ['soup_stew', 'curry', 'pasta_noodles']:
                 batch_suggestion = f"Double the <strong>{recipe.get('name')}</strong> on {day.capitalize()}"
                 break
    html.append(f'                <p style="margin-top: 15px;"><strong>This week\'s suggestion:</strong> {batch_suggestion}</p>')
    html.append('            </div>')
    if from_scratch_recipe:
        html.append('            <div class="from-scratch">')
        html.append('                <h3>🌟 From Scratch Recipe This Week</h3>')
        html.append(f'                <p><strong>{from_scratch_recipe.get("name")}</strong></p>')
        rationale = from_scratch_recipe.get('rationale', "This recipe selected for its unique technique or use of seasonal vegetables.")
        html.append(f'                <p>{rationale}</p>')
        html.append('            </div>')
    html.append('            <div class="week-glance">')
    html.append('                <h3>📋 Week at a Glance</h3>')
    html.append('                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">')
    html.append('                    <thead>')
    html.append('                        <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--accent-green);">')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Day</th>')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Kids Lunch</th>')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Adult Lunch</th>')
    html.append('                            <th style="padding: 12px; text-align: left; font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Dinner</th>')
    html.append('                        </tr>')
    html.append('                    </thead>')
    html.append('                    <tbody>')
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    day_abbr = ['mon', 'tue', 'wed', 'thu', 'fri']
    for i, (day_name, day_key) in enumerate(zip(days, day_abbr)):
        kids_lunch = '-'
        adult_lunch = '-'
        if selected_lunches and day_key in selected_lunches:
            lunch = selected_lunches[day_key]
            if hasattr(lunch, 'kid_profiles') and lunch.kid_profiles:
                 parts = []
                 for n, d in lunch.kid_profiles.items(): parts.append(f"{n}: {d}")
                 kids_lunch = " <br> ".join(parts)
            else: kids_lunch = lunch.recipe_name
            if lunch.default_option: adult_lunch = 'Leftovers or grain bowl'
            else: adult_lunch = 'Leftovers or dinner components'
        dinner_text = ''
        if day_key in selected_dinners:
            recipe = selected_dinners[day_key]
            dinner_text = recipe.get("name", '[Dinner]')
        else: dinner_text = '[Dinner]'
        row_bg = 'transparent' if i % 2 == 0 else 'rgba(0,0,0,0.02)'
        html.append(f'                        <tr style="border-bottom: 1px solid var(--border-subtle); background: {row_bg};">')
        html.append(f'                            <td style="padding: 12px; font-weight: 500;"><strong>{day_name}</strong></td>')
        html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;">{kids_lunch}</td>')
        html.append(f'                            <td style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;"><em>{adult_lunch}</em></td>')
        html.append(f'                            <td style="padding: 12px; font-weight: 500;">{dinner_text}</td>')
        html.append(f'                        </tr>')
    html.append('                    </tbody>')
    html.append('                </table>')
    html.append('            </div>')
    html.append('        </div>')
    return html

def generate_weekday_tabs(inputs, selected_dinners, selected_lunches, week_history=None):
    """Generate tabs for Monday through Friday."""
    html = []
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    day_abbr = ['mon', 'tue', 'wed', 'thu', 'fri']
    late_class_days = inputs.get('schedule', {}).get('late_class_days', ['thu', 'fri'])
    busy_days = set(inputs.get('schedule', {}).get('busy_days', ['thu', 'fri']))
    energy_labels = {
        'mon': ('PM PREP ONLY', 'energy-high'),
        'tue': ('AM + PM PREP', 'energy-mild'),
        'wed': ('PM PREP ONLY', 'energy-mild'),
        'thu': ('MORNING PREP OK', 'energy-morning-ok'),
        'fri': ('NO PREP DAY', 'energy-none')
    }
    for day_name, day_key in zip(days, day_abbr):
        label, energy_class = energy_labels[day_key]
        html.append(f'        <!-- {day_name} Tab -->')
        html.append(f'        <div id="{day_name.lower()}" class="tab-content">')
        html.append(f'            <div class="day-header">')
        html.append(f'                {day_name} <span class="energy-level {energy_class}">{label}</span>')
        html.append(f'            </div>')
        if day_key in selected_lunches:
            html.append(generate_lunch_html(selected_lunches[day_key], day_name))
        html.extend(generate_snack_section(day_key, late_class_days))
        if day_key in selected_dinners:
            html.extend(generate_dinner_section(selected_dinners[day_key], day_key, busy_days))
        html.extend(generate_prep_section(day_key, day_name, selected_dinners, selected_lunches, week_history))
        html.append('        </div>')
    return html

def generate_snack_section(day_key, late_class_days):
    """Generate snack section for a day."""
    html = []
    default_snacks = {
        'mon': 'Apple slices with peanut butter',
        'tue': 'Cheese and crackers',
        'wed': 'Cucumber rounds with cream cheese',
        'thu': 'Grapes',
        'fri': 'Crackers with hummus'
    }
    is_late_class = day_key in late_class_days
    def make_school_safe(snack_name):
        safety_map = {'peanut butter': 'Sunbutter', 'almond butter': 'Sunbutter', 'cashew': 'seeds', 'walnut': 'seeds', 'pecan': 'seeds', 'almond': 'seeds', 'nut': 'seed'}
        safe_name = snack_name
        changed = False
        for restricted, sub in safety_map.items():
            if restricted in safe_name.lower():
                safe_name = re.sub(re.escape(restricted), sub, safe_name, flags=re.IGNORECASE)
                changed = True
        return safe_name, changed
    html.append('            <div class="snacks">')
    original_snack = default_snacks.get(day_key, "Simple snack")
    safe_snack, changed = make_school_safe(original_snack)
    html.append(f'                <h4>🏫 School Snack</h4>')
    html.append(f'                <p style="font-size: var(--text-sm); margin-top: 4px;">{safe_snack}</p>')
    if changed:
        html.append(f'                <h4 style="margin-top: 12px; color: var(--text-default);">🏠 Home Snack</h4>')
        html.append(f'                <p style="font-size: var(--text-sm); margin-top: 4px;">{original_snack} (Nuts OK)</p>')
    html.append('            </div>')
    if is_late_class:
        html.append('            <div class="heavy-snack">')
        html.append('                <h4>🍎 Heavy Snack (Late Class Day)</h4>')
        heavy_snack_original = 'Apple slices with peanut butter' if day_key == 'thu' else 'Banana with almond butter'
        heavy_snack_safe, changed = make_school_safe(heavy_snack_original)
        html.append(f'                <p style="font-size: var(--text-sm);">Format: Fruit + protein/fat for sustained energy</p>')
        html.append(f'                <p><strong>{heavy_snack_safe}</strong></p>')
        if changed:
             html.append(f'                <p style="font-size: var(--text-xs); color: var(--text-muted);">(Home: {heavy_snack_original} ok)</p>')
        html.append('            </div>')
    return html

def generate_dinner_section(recipe, day_key, busy_days):
    """Generate dinner section for a day."""
    html = []
    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')
    recipe_name = recipe.get('name', '')
    recipe_file = f"{recipe_name}.html"
    cuisine = recipe.get('cuisine', 'unknown')
    meal_type = recipe.get('meal_type', 'unknown')
    html.append(f'                <div class="meal-type"><a href="../recipes/raw_html/{recipe_file}">{recipe_name}</a> - {cuisine.title()} {meal_type.replace("_", " ").title()}</div>')
    main_veg = recipe.get('main_veg', [])
    if main_veg:
        unique_veg = []
        for v in main_veg:
            if v not in unique_veg: unique_veg.append(v)
        veg_str = ', '.join(unique_veg)
        html.append(f'                <div class="vegetables">Main vegetables: {veg_str}</div>')
    html.append('                <div class="prep-notes">')
    if day_key == 'mon': html.append('                    <strong>Prep notes:</strong> Consider making 2x batch and freeze half for backup')
    elif day_key in ['tue', 'wed']: html.append('                    <strong>Prep notes:</strong> All vegetables prepped Monday - just cook and assemble')
    elif day_key == 'thu':
        if recipe.get('no_chop_compatible', False): html.append('                    <strong>Prep notes:</strong> NO CHOPPING - using pre-prepped ingredients from Monday')
        else: html.append('                    <strong>Prep notes:</strong> Can prep in morning (8-9am) if needed - NO chopping after noon, NO evening prep')
    elif day_key == 'fri':
        if recipe.get('no_chop_compatible', False): html.append('                    <strong>Prep notes:</strong> NO PREP - using pre-prepped ingredients from Monday or Thursday AM')
        else: html.append('                    <strong>Prep notes:</strong> ⚠️ WARNING: This recipe requires chopping but Friday is strictly no-prep!')
    html.append('                </div>')
    html.append('                <div class="evening-assembly">')
    if day_key in busy_days: html.append('                    <strong>Evening assembly (5-9pm):</strong> Reheat and serve only')
    else: html.append('                    <strong>Evening assembly (5-9pm):</strong> Minimal tasks - assemble, heat, serve')
    html.append('                </div>')
    html.append('            </div>')
    return html

def fuzzy_match_prep_task(task, completed_tasks):
    """Check if a task has been completed using fuzzy matching."""
    task_lower = task.lower()
    task_keywords = set(task_lower.split())
    for completed in completed_tasks:
        completed_lower = completed.lower()
        completed_keywords = set(completed_lower.split())
        common_keywords = task_keywords & completed_keywords
        if len(common_keywords) >= max(2, len(task_keywords) * 0.6): return True
    return False

def generate_granular_prep_tasks(selected_dinners, selected_lunches, day_keys, task_context="", completed_tasks=None):
    """Generate granular, ingredient-level prep tasks for specified days."""
    tasks = []
    completed_tasks = completed_tasks or []
    for day_key in day_keys:
        if day_key in selected_dinners:
            recipe = selected_dinners[day_key]
            recipe_name = recipe.get('name', 'dinner')
            day_name = day_key.capitalize()
            
            # Check for manual prep steps first
            if recipe.get('prep_steps'):
                for step in recipe['prep_steps']:
                    # Add context to the step so it's clear which meal it's for
                    task = f"{step} (for {day_name})"
                    if not fuzzy_match_prep_task(task, completed_tasks): 
                        tasks.append(task)
            else:
                # Fallback to auto-generation based on main_veg
                main_vegs = recipe.get('main_veg', [])
                for veg in main_vegs:
                    veg_clean = veg.replace('_', ' ')
                    task = f"Chop {veg_clean} for {day_name} {recipe_name}"
                    if not fuzzy_match_prep_task(task, completed_tasks): 
                        tasks.append(task)
                        
    for day_key in day_keys:
        if day_key in selected_lunches:
            lunch = selected_lunches[day_key]
            for component in lunch.prep_components:
                component_clean = component.replace('_', ' ')
                day_name = day_key.capitalize()
                task = f"Prep {component_clean} for {day_name} lunch"
                if not fuzzy_match_prep_task(task, completed_tasks): tasks.append(task)
    return tasks

def extract_prep_tasks_for_db(selected_dinners, selected_lunches):
    """
    Extract all prep tasks for the week as structured objects for database persistence.
    """
    structured_tasks = []
    days = ['mon', 'tue', 'wed', 'thu', 'fri']
    
    # Dinner Tasks
    for day in days:
        if day in selected_dinners:
            recipe = selected_dinners[day]
            recipe_name = recipe.get('name', 'dinner')
            recipe_id = recipe.get('id', 'unknown_recipe')
            
            # Manual prep steps
            if recipe.get('prep_steps'):
                for idx, step in enumerate(recipe['prep_steps']):
                    task_id = f"dinner_{day}_{recipe_id}_step_{idx}"
                    structured_tasks.append({
                        "id": task_id,
                        "task": step,
                        "meal_id": recipe_id,
                        "meal_name": recipe_name,
                        "day": day,
                        "type": "dinner",
                        "status": "pending"
                    })
            else:
                # Fallback: Main Veg
                main_vegs = recipe.get('main_veg', [])
                for idx, veg in enumerate(main_vegs):
                    veg_clean = veg.replace('_', ' ')
                    task_id = f"dinner_{day}_{recipe_id}_veg_{idx}"
                    structured_tasks.append({
                        "id": task_id,
                        "task": f"Chop {veg_clean}",
                        "meal_id": recipe_id,
                        "meal_name": recipe_name,
                        "day": day,
                        "type": "dinner",
                        "status": "pending"
                    })

    # Lunch Tasks
    for day in days:
        if day in selected_lunches:
            lunch = selected_lunches[day]
            # Handle lunch object or dict
            prep_components = getattr(lunch, 'prep_components', [])
            recipe_name = getattr(lunch, 'recipe_name', 'Lunch')
            recipe_id = getattr(lunch, 'recipe_id', f'lunch_{day}')
            
                for component in prep_components:
                component_clean = component.replace('_', ' ')
                task_id = f"lunch_{day}_{component_clean.replace(' ', '_').lower()}"
                structured_tasks.append({
                    "id": task_id,
                    "task": f"Prep {component_clean}",
                    "meal_id": recipe_id,
                    "meal_name": recipe_name,
                    "day": day,
                    "type": "lunch",
                    "status": "pending"
                })
                
    return structured_tasks

def generate_prep_section(day_key, day_name, selected_dinners, selected_lunches, week_history=None):
    """Generate prep tasks section for a day."""
    html = []
    completed_prep = []
    if week_history and 'daily_feedback' in week_history:
        for day, feedback in week_history['daily_feedback'].items():
            if 'prep_completed' in feedback: completed_prep.extend(feedback['prep_completed'])
    default_snacks = {'mon': 'Apple slices with peanut butter', 'tue': 'Cheese and crackers', 'wed': 'Cucumber rounds with cream cheese', 'thu': 'Grapes', 'fri': 'Crackers with hummus'}
    if day_key == 'mon':
        granular_tasks = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['mon', 'tue'], "Mon/Tue", completed_prep)
        if default_snacks.get('tue') == 'Cheese and crackers': granular_tasks.append('Cube cheese brick for Tuesday snack')
        general_tasks = ['Portion snacks into grab-and-go containers for early week', 'Identify freezer-friendly dinner to double (batch cook)']
        if 'tue' in selected_lunches and selected_lunches['tue'].recipe_id.startswith('pipeline_'):
            general_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['tue'].recipe_name}")
        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (MON-TUE PREP)</h4>')
        html.append('                <ul>')
        for task in granular_tasks: html.append(f'                    <li data-prep-task="{task}">{task}</li>')
        for task in general_tasks: html.append(f'                    <li data-prep-task="{task}">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')
    elif day_key == 'tue':
        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (WED-FRI PREP)</h4>')
        am_tasks = []
        if 'tue' in selected_lunches: am_tasks.append(f'Assemble Tuesday lunch: {selected_lunches["tue"].recipe_name}')
        am_tasks.extend(["Portion Monday's batch-cooked items", 'Check freezer backup inventory (verify 3 meals)'])
        html.append('                <div style="margin-top: 15px;">')
        html.append('                    <strong>☀️ AM Prep (Morning):</strong>')
        html.append('                    <ul>')
        for task in am_tasks: html.append(f'                        <li data-prep-task="{task}" data-prep-time="am">{task}</li>')
        html.append('                    </ul>')
        html.append('                </div>')
        pm_granular_tasks = generate_granular_prep_tasks(selected_dinners, selected_lunches, ['wed', 'thu', 'fri'], "Wed-Fri", completed_prep)
        pm_general_tasks = ['Portion snacks for rest of week']
        if 'wed' in selected_lunches and selected_lunches['wed'].recipe_id.startswith('pipeline_'): pm_general_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['wed'].recipe_name}")
        html.append('                <div style="margin-top: 15px;">')
        html.append('                    <strong>🌙 PM Prep (Evening 5-9pm):</strong>')
        html.append('                    <ul>')
        for task in pm_granular_tasks: html.append(f'                        <li data-prep-task="{task}" data-prep-time="pm">{task}</li>')
        for task in pm_general_tasks: html.append(f'                        <li data-prep-task="{task}" data-prep-time="pm">{task}</li>')
        html.append('                    </ul>')
        html.append('                </div>')
        html.append('            </div>')
    elif day_key == 'wed':
        wed_tasks = ['Finish any remaining veg/lunch prep for Thu/Fri', 'Load Instant Pot or slow cooker for Thursday if needed', 'Final check: All Thu/Fri components ready']
        if 'thu' in selected_lunches and selected_lunches['thu'].recipe_id.startswith('pipeline_'): wed_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['thu'].recipe_name}")
        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (BACKUP PREP)</h4>')
        html.append('                <ul>')
        for task in wed_tasks: html.append(f'                    <li data-prep-task="{task}">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')
    elif day_key == 'thu':
        thu_tasks = ['Light prep allowed (8-9am) if needed']
        if 'thu' in selected_dinners:
            recipe = selected_dinners['thu']
            if recipe.get('effort_level') == 'normal': thu_tasks.append(f"Start initial steps for {recipe.get('name')} if time allows")
        thu_tasks.extend(['NO chopping after noon', 'NO evening prep - only reheating/assembly', 'Fallback: Use freezer backup if energy is depleted'])
        if 'fri' in selected_lunches and selected_lunches['fri'].recipe_id.startswith('pipeline_'): thu_tasks.append(f"Pack leftovers for tomorrow's lunch: {selected_lunches['fri'].recipe_name}")
        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (MORNING PREP OK)</h4>')
        html.append('                <ul>')
        for task in thu_tasks: html.append(f'                    <li data-prep-task="{task}" data-prep-time="am">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')
    elif day_key == 'fri':
        fri_tasks = ['ALL DAY: NO chopping allowed', 'ALL DAY: NO cooking allowed - only reheating', 'Only actions: reheating, simple assembly', 'Fallback: Use freezer backup if energy is depleted']
        html.append('            <div class="prep-tasks">')
        html.append(f'                <h4>{day_name} Prep Tasks (NO PREP DAY - STRICT)</h4>')
        html.append('                <ul>')
        for task in fri_tasks: html.append(f'                    <li data-prep-task="{task}">{task}</li>')
        html.append('                </ul>')
        html.append('            </div>')
    return html

def generate_weekend_tabs():
    """Generate Saturday and Sunday tabs."""
    html = []
    html.append('        <!-- Saturday Tab -->')
    html.append('        <div id="saturday" class="tab-content">')
    html.append('            <div class="day-header">')
    html.append('                Saturday <span class="energy-level energy-mild">WEEKEND - FLEXIBLE</span>')
    html.append('            </div>')
    html.append('            <div class="section" style="background: rgba(212, 165, 116, 0.08); padding: 20px; border-radius: 2px; margin: 20px 0;">')
    html.append('                <h4 style="color: var(--accent-terracotta); margin-bottom: 10px;">🏠 Weekend Meals</h4>')
    html.append('                <p style="font-size: var(--text-sm); color: var(--text-muted);">Meals for Saturday are set to "Make at home" by default. Check the dashboard to update what you actually made and identify any leftovers.</p>')
    html.append('            </div>')
    html.append('            <div class="lunch-section">')
    html.append('                <h4>🥪 Kids Lunch</h4>')
    html.append('                <p><strong>Plan:</strong> Make at home</p>')
    html.append('            </div>')
    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')
    html.append('                <div class="meal-type">Make at home</div>')
    html.append('            </div>')
    html.append('            <div class="prep-tasks">')
    html.append('                <h4>🌙 Afternoon Prep (Optional)</h4>')
    html.append('                <ul>')
    html.append('                    <li>Review next week\'s meal plan</li>')
    html.append('                    <li>Make grocery list (see Groceries tab)</li>')
    html.append('                    <li>Clean out fridge and freezer</li>')
    html.append('                </ul>')
    html.append('            </div>')
    html.append('        </div>')
    html.append('        <!-- Sunday Tab -->')
    html.append('        <div id="sunday" class="tab-content">')
    html.append('            <div class="day-header">')
    html.append('                Sunday <span class="energy-level energy-mild">GROCERY SHOPPING DAY</span>')
    html.append('            </div>')
    html.append('            <div class="prep-tasks">')
    html.append('                <h4>☀️ AM Prep (Morning - Grocery Shopping)</h4>')
    html.append('                <ul style="list-style: none; margin-left: 0;">')
    html.append('                    <li style="margin: 8px 0; padding-left: 0;">✓ Farmers market shopping (fresh produce for next week)</li>')
    html.append('                    <li style="margin: 8px 0; padding-left: 0;">✓ Regular grocery shopping (use Groceries tab for full list)</li>')
    html.append('                    <li style="margin: 8px 0; padding-left: 0;">✓ Put away all groceries</li>')
    html.append('                </ul>')
    html.append('            </div>')
    html.append('            <div class="lunch-section">')
    html.append('                <h4>🥪 Kids Lunch</h4>')
    html.append('                <p><strong>Plan:</strong> Make at home</p>')
    html.append('            </div>')
    html.append('            <div class="meal-card">')
    html.append('                <h3>🍽️ Dinner</h3>')
    html.append('                <div class="meal-type">Make at home</div>')
    html.append('            </div>')
    html.append('        </div>')
    return html

def generate_groceries_tab(inputs, selected_dinners, selected_lunches):
    """Generate the Groceries tab."""
    html = []
    html.append('        <!-- Groceries Tab -->')
    html.append('        <div id="groceries" class="tab-content">')
    html.append('            <h2>🛒 Comprehensive Shopping List</h2>')
    produce, dairy, grains, shelf, canned, frozen, misc = [], [], [], [], [], [], []
    default_snacks = {'mon': 'Apple slices with peanut butter', 'tue': 'Cheese and crackers', 'wed': 'Cucumber rounds with cream cheese', 'thu': 'Grapes', 'fri': 'Crackers with hummus'}
    snack_items = []
    for snack in default_snacks.values():
        parts = re.split(r' with | and |, ', snack, flags=re.IGNORECASE)
        for part in parts:
            clean_part = part.strip().lower().replace('slices', '').replace('rounds', '').strip()
            if clean_part: snack_items.append(clean_part)
    def categorize_ingredient(item, target_lists):
        c = item.lower().replace('_', ' ')
        if any(k in c for k in ['peanut butter', 'almond butter', 'cracker', 'pretzel', 'popcorn', 'pitted dates', 'nut', 'trail mix', 'granola', 'rice cake']): target_lists['shelf'].append(c)
        elif any(k in c for k in ['apple', 'banana', 'grape', 'cucumber', 'carrot', 'tomato', 'pepper', 'onion', 'garlic', 'vegetable', 'fruit', 'lemon', 'lime', 'ginger']): target_lists['produce'].append(c)
        elif any(k in c for k in ['cheese', 'yogurt', 'cream cheese', 'hummus', 'milk', 'butter', 'paneer']): target_lists['dairy'].append(c)
        elif any(k in c for k in ['rice', 'quinoa', 'pasta', 'bread', 'tortilla', 'roll', 'bagel', 'couscous']): target_lists['grains'].append(c)
        elif any(k in c for k in ['canned', 'beans', 'chickpea', 'tomato sauce', 'soup base', 'chana']): target_lists['canned'].append(c)
        else: target_lists['misc'].append(c)
    lists = {'produce': produce, 'dairy': dairy, 'grains': grains, 'shelf': shelf, 'canned': canned, 'frozen': frozen, 'misc': misc}
    for item in snack_items: categorize_ingredient(item, lists)
    for day, recipe in selected_dinners.items():
        if day in ['mon', 'tue', 'wed', 'thu', 'fri'] and recipe:
            produce.extend(recipe.get('main_veg', []))
            categorize_ingredient(recipe.get('name', '').lower(), lists)
    for day, lunch in selected_lunches.items():
        if lunch:
            for comp in lunch.prep_components: categorize_ingredient(comp, lists)
    def clean(items): return sorted(list(set([i.replace('_', ' ').title() for i in items if i])))
    cat_data = [('Fresh Produce', clean(produce)), ('Dairy & Refrigerated', clean(dairy)), ('Shelf Stable', clean(shelf)), ('Grains, Pasta & Bread', clean(grains)), ('Canned & Dry Goods', clean(canned)), ('Frozen', clean(frozen)), ('Misc', clean(misc))]
    for category, items in cat_data:
        html.append('            <div class="grocery-section">')
        html.append(f'                <h4>{category}</h4>')
        html.append('                <ul>')
        if not items: html.append('                    <li>Check staples</li>')
        else:
            for item in items: html.append(f'                    <li>{item}</li>')
        html.append('                </ul>')
        html.append('            </div>')
    html.append('        </div>')
    return html
