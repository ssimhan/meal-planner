# GitHub Actions Implementation Plan

This document provides the detailed technical plan for migrating from CLI-only workflow to GitHub Actions automation.

## Progress Tracker

**Last Updated:** 2025-12-30

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: GitHub Pages Setup** | ✅ **COMPLETE** | All tasks done. GitHub Pages URL now shows in workflow output. |
| 1.1 Enable GitHub Pages | ✅ Complete | Configured to deploy from GitHub Actions |
| 1.2 Test Access | ✅ Complete | Site accessible at https://ssimhan.github.io/meal-planner/ |
| 1.3 Update Plan Generation | ✅ Complete | workflow.py now displays GitHub Pages URL after generation |
| **Phase 2: Automated Weekly Planning** | 🚧 **IN PROGRESS** | Workflows created and tested locally. Ready to test on GitHub. |
| 2.1 Create Weekly Start Workflow | ✅ Complete | `.github/workflows/weekly-plan-start.yml` created |
| 2.2 Create Plan Generation Workflow | ✅ Complete | `.github/workflows/weekly-plan-generate.yml` created |
| 2.3 Modify workflow.py | ✅ Complete | Added `start-week` and `generate-plan` commands |
| 2.4 Test Workflows | ⏳ **NEXT STEP** | Ready to test manually on GitHub |
| **Phase 3: Daily Check-ins** | ⏸️ Not Started | Planned |
| **Phase 4: Inventory Automation** | ⏸️ Not Started | Planned |
| **Phase 5: Learning & Adaptation** | ⏸️ Not Started | Planned |

**Next Action:** Push Phase 2 changes to GitHub and test the weekly planning workflow manually using `workflow_dispatch`.

## Table of Contents
- [Phase 1: GitHub Pages Setup](#phase-1-github-pages-setup)
- [Phase 2: Automated Weekly Planning](#phase-2-automated-weekly-planning)
- [Phase 3: Daily Check-ins](#phase-3-daily-check-ins)
- [Phase 4: Inventory Automation](#phase-4-inventory-automation)
- [Phase 5: Learning & Adaptation](#phase-5-learning--adaptation)

---

## Phase 1: GitHub Pages Setup

**Goal:** Make meal plans accessible from anywhere via web browser.

### Tasks

#### 1.1 Enable GitHub Pages
1. Go to repo Settings → Pages
2. Source: Deploy from branch `main`
3. Folder: `/` (root)
4. Save

#### 1.2 Test Access
- Wait 2-3 minutes for deployment
- Visit: `https://yourusername.github.io/meal-planner/plans/2026-01-05-weekly-plan.html`
- Verify HTML renders correctly

#### 1.3 Update Plan Generation
- Modify `scripts/workflow.py` to include GitHub Pages URL in output
- Add URL to success message after plan generation

**Success Criteria:**
- [ ] Can view meal plan from phone browser
- [ ] HTML styling loads correctly
- [ ] Recipe links work

**Testing:**
1. Generate a test plan: `./mealplan next`
2. Open GitHub Pages URL on phone
3. Verify all tabs work, fonts load, styling correct

---

## Phase 2: Automated Weekly Planning

**Goal:** Remove CLI dependency for weekly planning - use GitHub web UI instead.

### File Structure
```
.github/
└── workflows/
    ├── weekly-plan-start.yml    # Sunday: Create PR with suggestions
    └── weekly-plan-generate.yml # On PR merge: Generate plan
```

### 2.1 Create Weekly Start Workflow

**File:** `.github/workflows/weekly-plan-start.yml`

```yaml
name: Start Weekly Meal Planning

on:
  schedule:
    - cron: '0 16 * * SUN'  # 8am PST = 16:00 UTC (Sunday)
  workflow_dispatch:  # Manual trigger for testing

jobs:
  create-weekly-input:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install pyyaml

      - name: Create input file with farmers market suggestions
        id: create-input
        run: |
          # Run workflow to create input file
          python3 scripts/workflow.py start-week

          # Extract week date for use in PR
          WEEK_DATE=$(ls -t inputs/*.yml | head -1 | xargs basename | cut -d. -f1)
          echo "week_date=$WEEK_DATE" >> $GITHUB_OUTPUT

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "Weekly planning: Propose farmers market for week of ${{ steps.create-input.outputs.week_date }}"
          branch: weekly-plan/${{ steps.create-input.outputs.week_date }}
          title: "🥕 Week of ${{ steps.create-input.outputs.week_date }}: Review Farmers Market Suggestions"
          body: |
            ## Weekly Meal Planning - Step 1

            Review the proposed farmers market vegetables for this week.

            ### What to do:
            1. Click "Files changed" tab above
            2. Review `inputs/${{ steps.create-input.outputs.week_date }}.yml`
            3. Click the pencil icon to edit the file
            4. Update `confirmed_veg` with what you actually bought
            5. Change `status: proposed` to `status: confirmed`
            6. Commit changes
            7. Merge this PR when ready

            ### What happens next:
            - Merging this PR will automatically generate your meal plan
            - You'll get a comment with a link to view the plan
            - The plan will be accessible at: https://yourusername.github.io/meal-planner/plans/${{ steps.create-input.outputs.week_date }}-weekly-plan.html

            ---
            🤖 Generated by Weekly Meal Planning workflow
          labels: weekly-planning
```

### 2.2 Create Plan Generation Workflow

**File:** `.github/workflows/weekly-plan-generate.yml`

```yaml
name: Generate Meal Plan

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  generate-plan:
    if: |
      github.event.pull_request.merged == true &&
      contains(github.event.pull_request.labels.*.name, 'weekly-planning')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          pip install pyyaml

      - name: Generate meal plan
        id: generate
        run: |
          # Run workflow to generate plan
          python3 scripts/workflow.py generate-plan

          # Extract week date
          WEEK_DATE=$(ls -t plans/*.html | head -1 | xargs basename | cut -d- -f1,2,3)
          echo "week_date=$WEEK_DATE" >> $GITHUB_OUTPUT

      - name: Commit generated plan
        run: |
          git config user.name "Meal Planner Bot"
          git config user.email "mealplanner@users.noreply.github.com"
          git add plans/ data/history.yml
          git commit -m "Generate meal plan for week of ${{ steps.generate.outputs.week_date }}"
          git push

      - name: Comment on PR with plan link
        uses: peter-evans/create-or-update-comment@v4
        with:
          issue-number: ${{ github.event.pull_request.number }}
          body: |
            ✅ **Meal plan generated successfully!**

            📄 **View your plan here:**
            https://yourusername.github.io/meal-planner/plans/${{ steps.generate.outputs.week_date }}-weekly-plan.html

            ---
            🤖 Generated by Meal Plan workflow
```

### 2.3 Modify workflow.py

Add two new command modes to `scripts/workflow.py`:

```python
# Add to argument parser
parser.add_argument('command', choices=['next', 'status', 'reset', 'start-week', 'generate-plan'])

# Add new functions
def start_week():
    """Create input file for new week (called by GitHub Actions)"""
    # Reuse existing intake logic
    # Don't prompt for user input - use defaults
    # Output: inputs/YYYY-MM-DD.yml with proposed vegetables
    pass

def generate_plan():
    """Generate meal plan from latest confirmed input (called by GitHub Actions)"""
    # Find latest input file with status: confirmed
    # Generate plan
    # Update history
    pass
```

**Success Criteria:**
- [ ] Sunday 8am: PR auto-created with farmers market suggestions
- [ ] Can edit input file on GitHub web UI
- [ ] Merging PR triggers plan generation
- [ ] Plan commits automatically
- [ ] Get comment with plan link
- [ ] Can view plan on GitHub Pages

**Testing:**
1. Trigger workflow manually: Actions tab → "Start Weekly Meal Planning" → Run workflow
2. Verify PR created
3. Edit vegetables on GitHub
4. Merge PR
5. Verify plan generated and link works

---

## Phase 3: Daily Check-ins via GitHub Issues

**Goal:** Log daily meals and notes from anywhere (phone, web).

### File Structure
```
.github/
└── workflows/
    ├── daily-checkin-create.yml  # 6pm: Create issue
    └── daily-checkin-parse.yml   # On comment: Parse and log
```

### 3.1 Create Daily Check-in Issue

**File:** `.github/workflows/daily-checkin-create.yml`

```yaml
name: Daily Meal Check-in

on:
  schedule:
    - cron: '0 2 * * *'  # 6pm PST = 2:00 UTC next day
  workflow_dispatch:

jobs:
  create-checkin:
    runs-on: ubuntu-latest
    steps:
      - name: Create daily check-in issue
        uses: actions/github-script@v7
        with:
          script: |
            const today = new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `📝 Daily Check-in: ${today}`,
              body: `## What did you make today?

            Reply to this issue with:
            - **Lunch:** What did you make/eat?
            - **Dinner:** What did you make/eat?
            - **Notes:** Any observations (time, kid reactions, leftovers, etc.)

            ### Examples:
            \`\`\`
            Lunch: PBJ for kids, leftovers for me
            Dinner: Quesadillas - kids loved them, took 15 mins
            Notes: Had leftover beans from Monday
            \`\`\`

            \`\`\`
            Lunch: Ravioli
            Dinner: Skipped - ate out
            Notes: Too tired to cook
            \`\`\`

            This issue will automatically close after logging.

            ---
            🤖 Daily check-in · Auto-created by workflow`,
              labels: ['daily-checkin']
            });
```

### 3.2 Parse Check-in Comments

**File:** `.github/workflows/daily-checkin-parse.yml`

```yaml
name: Parse Daily Check-in

on:
  issue_comment:
    types: [created]

jobs:
  parse-checkin:
    if: contains(github.event.issue.labels.*.name, 'daily-checkin')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: pip install pyyaml

      - name: Parse comment and update logs
        run: |
          python3 scripts/parse_daily_log.py \
            --comment "${{ github.event.comment.body }}" \
            --date "${{ github.event.issue.created_at }}" \
            --issue-title "${{ github.event.issue.title }}"

      - name: Commit log updates
        run: |
          git config user.name "Meal Planner Bot"
          git config user.email "mealplanner@users.noreply.github.com"
          git add data/logs.yml
          git commit -m "Log daily meals from ${{ github.event.issue.title }}" || echo "No changes to commit"
          git push

      - name: Close issue
        uses: peter-evans/close-issue@v3
        with:
          issue-number: ${{ github.event.issue.number }}
          comment: |
            ✅ **Logged successfully!**

            Your meal notes have been saved to `data/logs.yml`.

            ---
            🤖 Auto-closed after logging
```

### 3.3 Create parse_daily_log.py

**File:** `scripts/parse_daily_log.py`

```python
#!/usr/bin/env python3
"""Parse daily check-in comments and update logs."""

import argparse
import yaml
from datetime import datetime
from pathlib import Path

def parse_comment(comment_text):
    """Extract structured data from free-form comment."""
    # Simple parsing - look for patterns:
    # "Lunch: ..." "Dinner: ..." "Notes: ..."
    data = {
        'lunch': '',
        'dinner': '',
        'notes': ''
    }

    for line in comment_text.split('\n'):
        line = line.strip()
        if line.lower().startswith('lunch:'):
            data['lunch'] = line.split(':', 1)[1].strip()
        elif line.lower().startswith('dinner:'):
            data['dinner'] = line.split(':', 1)[1].strip()
        elif line.lower().startswith('notes:'):
            data['notes'] = line.split(':', 1)[1].strip()

    return data

def update_logs(date_str, parsed_data):
    """Append to logs.yml"""
    logs_file = Path('data/logs.yml')

    # Load or create logs
    if logs_file.exists():
        with open(logs_file) as f:
            logs = yaml.safe_load(f) or {'daily_logs': []}
    else:
        logs = {'daily_logs': []}

    # Append new entry
    logs['daily_logs'].append({
        'date': date_str,
        'lunch': parsed_data['lunch'],
        'dinner': parsed_data['dinner'],
        'notes': parsed_data['notes']
    })

    # Write back
    with open(logs_file, 'w') as f:
        yaml.dump(logs, f, default_flow_style=False, sort_keys=False)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--comment', required=True)
    parser.add_argument('--date', required=True)
    parser.add_argument('--issue-title', required=True)
    args = parser.parse_args()

    # Parse date from issue title or created_at
    date_str = datetime.fromisoformat(args.date.replace('Z', '+00:00')).strftime('%Y-%m-%d')

    # Parse comment
    parsed = parse_comment(args.comment)

    # Update logs
    update_logs(date_str, parsed)

    print(f"Logged meals for {date_str}")
```

**Success Criteria:**
- [ ] 6pm daily: Issue auto-created
- [ ] Can comment from phone/web
- [ ] Comment parsed and saved to logs.yml
- [ ] Issue auto-closes after logging

**Testing:**
1. Trigger workflow manually
2. Verify issue created
3. Add comment with meal info
4. Verify logs.yml updated
5. Verify issue closed

---

## Phase 4: Inventory Automation

**Goal:** Auto-update inventory based on logged meals.

### 4.1 Create Inventory Schema

**File:** `data/inventory.yml`

```yaml
last_updated: '2025-12-30'

fridge:
  - item: bell peppers
    quantity: 3
    unit: count
    added: '2025-12-29'
    use_by: '2026-01-05'
  - item: onions
    quantity: 5
    unit: count
    added: '2025-12-29'

pantry:
  - item: black beans
    quantity: 4
    unit: cans
  - item: rice
    quantity: 5
    unit: cups

freezer:
  backups:
    - meal: Chana Masala
      servings: 4
      frozen_date: '2025-12-20'
    - meal: Black Bean Soup
      servings: 6
      frozen_date: '2025-12-15'
```

### 4.2 Update parse_daily_log.py

Add inventory update logic:

```python
def update_inventory_from_meal(meal_name):
    """Decrement ingredients based on meal cooked."""
    # Load recipe from index.yml
    # Find ingredients
    # Decrement from inventory.yml
    pass
```

### 4.3 Enhance Farmers Market Suggestions

Modify `scripts/workflow.py` to use inventory:

```python
def suggest_farmers_market_vegetables():
    """Suggest vegetables based on inventory levels."""
    # Load inventory.yml
    # Check what's low/missing
    # Prioritize seasonal items
    # Cross-reference with recipe needs
    # Output proposed_veg list
    pass
```

**Success Criteria:**
- [ ] Inventory decrements when meal logged
- [ ] Leftover tracking works
- [ ] Farmers market suggestions consider inventory
- [ ] Freezer backup count maintained

---

## Phase 5: Learning & Adaptation

**Goal:** Use historical logs to improve suggestions over time.

### What the System Should Learn

Your daily notes aren't just logs — they're training signals. The system should quietly learn:

#### 5.1 Meal Reliability
- **Which meals you actually make vs skip** - Track completion rate per recipe
- **Which meals get repeated voluntarily** - User explicitly makes same meal again
- **Which meals consistently leave leftovers** - Good (intentional batch) or bad (overestimated portions)

**Impact:** Favor low-friction, high-success meals in future suggestions.

#### 5.2 Time Realism
- **Meals that took longer than planned** - Parse notes for "took 30 mins" vs recipe estimate
- **Prep sessions that didn't happen** - Monday prep skipped = adjust Thu/Fri to no-prep
- **Office days where cooking ambition was too high** - Notes like "too tired to cook"

**Impact:** Downshift complexity on busy days automatically.

#### 5.3 Kid & Household Response Patterns
- **Meals kids consistently eat** - Parse notes for "kids loved", "ate well", "finished plates"
- **Meals that trigger complaints or waste** - "kids didn't eat", "complained", "threw away"
- **Flavors or textures that work better on certain days** - Patterns like "pasta works on Fridays"

**Impact:** Bias toward family-safe defaults when energy is low.

#### 5.4 Ingredient Behavior
- **Produce that regularly goes unused** - Track inventory items marked "still untouched" after use-by date
- **Staples that are always consumed** - Rice, beans, cheese never wasted
- **Items that freeze well vs spoil** - Correlate with freezer backup success

**Impact:** Reduce food waste, stabilize core grocery list.

#### 5.5 Prep Effectiveness
- **Prep that clearly made the week easier** - Notes like "Monday prep saved me Thursday"
- **Prep that wasn't worth the effort** - "Spent 2 hours Sunday, still stressed Thursday"
- **Tasks that compound well** - Chopping once, using twice across meals

**Impact:** Suggest fewer, smarter prep steps.

#### 5.6 Preference Drift (Without Asking)
- **Seasonal taste shifts** - Lighter meals in summer, heartier in winter
- **Fatigue with certain cuisines** - If tacos appear 3 weeks in row, user skips → reduce frequency
- **Increased tolerance for repetition during busy weeks** - Same lunch 5 days = fine when stressed

**Impact:** Adapt without forcing explicit preference updates.

#### 5.7 Confidence Signals
- **Meals labeled as "easy", "repeat", or "reliable"** - Boost these in rotation
- **Weeks that felt calm vs chaotic** - Correlate meal complexity with stress level

**Impact:** Optimize for mental load, not just nutrition.

### Implementation

#### 5.1 Meal Success Scoring

**File:** `scripts/analyze_logs.py`

```python
def analyze_meal_success():
    """Score recipes based on logs."""
    # Parse notes for positive/negative signals:
    # - "kids loved" → +10
    # - "took longer" → -5
    # - "didn't eat" → -10
    # - "easy" → +5
    # - "repeat" → +8
    # Return success scores per recipe
    pass
```

#### 5.2 Time Accuracy Tracking

```python
def track_time_accuracy():
    """Compare estimated vs actual prep time."""
    # Parse notes for time mentions: "took 30 mins", "2 hours"
    # Compare to recipe metadata
    # Adjust future estimates or flag recipes as "takes longer than stated"
    pass
```

#### 5.3 Adaptive Plan Generation

```python
def generate_adaptive_plan():
    """Generate plan using learned preferences."""
    # Load success scores from analyze_logs()
    # Boost high-success meals on busy weeks
    # Reduce complexity when compliance is low
    # Favor kid-friendly meals more often
    # Reduce frequency of cuisines with recent negative notes
    pass
```

**Success Criteria:**
- [ ] Meal success scores calculated from logs
- [ ] Time estimates adjusted based on reality
- [ ] Kid-friendly meals prioritized
- [ ] Prep recommendations refined based on effectiveness
- [ ] System gets noticeably "smarter" after 4-6 weeks of logs

---

## Testing Strategy

### For Each Phase

1. **Manual trigger first** - Use `workflow_dispatch` to test
2. **Verify outputs** - Check files committed correctly
3. **Test edge cases** - What if no vegetables confirmed? What if duplicate meals logged?
4. **Use for 1-2 weeks** - Real-world validation before next phase
5. **Document issues** - Add to PROJECT_HISTORY.md

### Rollback Plan

- Keep CLI workflow working at all times
- GitHub Actions are additive, not replacing
- Can disable workflows via GitHub settings
- Data in YAML files - easy to manual edit if needed

---

## Cost Tracking

GitHub Actions free tier: 2,000 minutes/month

**Estimated usage:**
- Weekly plan creation: ~3 mins
- Weekly plan generation: ~2 mins
- Daily check-ins (7 days): ~7 mins (1 min each)
- **Total per week:** ~12 minutes
- **Total per month:** ~48 minutes
- **Buffer:** 1,952 minutes remaining

**Well within free tier.**

---

## Next Steps

Start with **Phase 1** (GitHub Pages) to validate the approach before building workflows.

Track progress in README.md checkboxes.


## backlog of feature ideas
- cleaning up the html files so that the github pages interface looks in line with the rest of things
- add github actions etc so that i can run the whole end to end process within the html file instead of having to use CLI
