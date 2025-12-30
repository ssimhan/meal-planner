# Claude Code Quickstart Template

A minimal, battle-tested template for starting AI-assisted projects with Claude Code.

## What's Included

Just 4 essential files:
- **README.md** - Project documentation (this file)
- **CLAUDE.md** - Operating manual for Claude Code
- **PROJECT_HISTORY.md** - Development timeline with learnings
- **.gitignore** - Standard Git exclusions

## How to Use This Template

### Starting a New Project

1. **Copy this folder** to your new project location
2. **Answer these questions** in your README:
   - What problem does this solve?
   - Who is this for?
   - What are the inputs and outputs?
3. **Customize CLAUDE.md** with your domain-specific rules
4. **Start building incrementally**
5. **Document each session** in PROJECT_HISTORY.md

### As Your Project Grows

Add folders only when you need them:

```
your-project/
├── README.md
├── CLAUDE.md
├── PROJECT_HISTORY.md
├── data/              # Add when you need to store structured data
├── inputs/            # Add when you need user input files
├── outputs/           # Add when you generate files
├── scripts/           # Add when you need automation
└── templates/         # Add when you need output templates
```

**Key principle:** Start minimal, add structure as patterns emerge.

---

## Best Practices (From Real-World Use)

### 1. Write Clear Instructions for Claude (CLAUDE.md)

**Good example:**
```markdown
## Critical Rules
- [ ] No recipe can repeat within 3 weeks (check history.yml)
- [ ] Thursday/Friday meals must be no_chop_compatible: true
- [ ] Every dinner must include at least 1 vegetable
```

**Why it works:** Specific, checkable, with clear references.

**Bad example:**
```markdown
## Rules
- Make good meal plans
- Be creative
```

**Why it fails:** Vague, not actionable, no validation criteria.

### 2. Use Plain Text Formats

**Prefer:**
- YAML for structured data (human-readable, Git-friendly)
- Markdown for documentation (easy to edit)
- HTML for rich outputs (portable, no dependencies)

**When to use databases:**
- Data exceeds ~10,000 records
- Need complex queries
- Multiple concurrent users

**From meal-planner:** 234 recipes in YAML worked perfectly. Easy to edit manually, Git tracks changes line-by-line.

### 3. Design for Failure Modes

Real-world systems fail. Plan for it.

**From meal-planner:**
- **Freezer backup meals** - When energy is depleted, use pre-made meals
- **Validation scripts** - Catch constraint violations before they become problems
- **State tracking** - Know where you are in multi-step workflows

**Pattern:**
```markdown
## Error Handling in CLAUDE.md

If you cannot generate valid output:
1. Explain which constraint is violated
2. Suggest alternatives
3. Ask user for guidance
4. **NEVER proceed with invalid output**
```

### 4. Metadata Enables Automation

Rich metadata makes intelligent decisions possible.

**From meal-planner:**
```yaml
lentil_tacos_001:
  name: "Lentil Tacos"
  template: "tacos"
  effort_level: "normal"
  no_chop_compatible: false
  main_veg: ["bell peppers", "onions", "tomatoes"]
  avoid_contains: []  # Empty = safe to use
```

**Why this works:** Claude can now:
- Find all no-chop recipes: `no_chop_compatible: true`
- Avoid certain ingredients: `avoid_contains: []`
- Select by vegetables: `main_veg: ["peppers"]`

**Pattern:** Tag once, query forever.

### 5. Separate Concerns

**From meal-planner structure:**
```
data/          # Source of truth (version controlled)
inputs/        # User inputs (one per week, can be deleted after processing)
outputs/       # Generated files (can be regenerated from inputs)
scripts/       # Automation code
templates/     # Output formats
```

**Why this works:**
- Easy to find things
- Safe to delete outputs/ and regenerate
- Git tracks what matters (data, not generated files)

### 6. Document Decisions as You Make Them

**From PROJECT_HISTORY.md:**
```markdown
### Phase 7: Energy-Based Prep Model ⚡ CRITICAL PIVOT
**Commit:** `43b0ded`

**The Crisis:** Friday cooking became survival mode. Evening time
consumed by chopping, bleeding into bedtime routines.

**The Solution:** Prep schedule aligned with energy cycles:
- Monday: High energy, batch cooking
- Friday: Zero prep, only reheating

**What I Learned:** Design systems for your worst day, not your best day.
```

**Why this matters:** 6 months later, you'll remember the "why" behind decisions.

### 7. Validation Checklist in CLAUDE.md

**From meal-planner:**
```markdown
## Validation Checks (Before Finalizing)

- [ ] All 5 dinners (Mon-Fri) are specified
- [ ] No recipe appears in last 3 weeks of history
- [ ] No template appears more than once this week
- [ ] Thu/Fri dinners are no-chop compatible
- [ ] Each dinner has at least 1 vegetable
- [ ] Exactly 1 from-scratch recipe selected
```

**Why this works:** Claude runs through checklist before writing output. Catches errors early.

### 8. Constraints Create Freedom

**From meal-planner:**
- **Evening Protection:** 5-9pm is device-free time
- **Result:** Dinner complexity can't spill into bedtime routines
- **Paradox:** Limiting options reduced stress

**Pattern:** Don't try to do everything. Do the right things.

### 9. Start Manual, Automate Pain Points

**From meal-planner evolution:**
1. **Weeks 1-3:** Manual planning in spreadsheet
2. **Week 4:** Noticed repetition problem → built history.yml
3. **Week 8:** Tired of farmers market planning → automated vegetable proposals
4. **Week 12:** Realized energy depletion pattern → energy-based prep model

**Lesson:** Use it before automating it. Real usage reveals actual needs.

### 10. Anti-Repetition Patterns

**From meal-planner:**
```yaml
# data/history.yml
weeks:
  - week_of: 2025-12-23
    dinners:
      - recipe_id: "lentil_tacos_001"
        template: "tacos"
        day: "mon"
```

**CLAUDE.md instruction:**
```markdown
Do NOT select any recipe used in the last 3 weeks (check history.yml)
```

**Result:** Automatic variety without manual tracking.

**Pattern:** Historical state enables intelligent decisions.

---

## Example: Applying This Template

### Scenario: Building a Blog Post Generator

**Step 1: Define in README**
- **Problem:** Coming up with blog topics is exhausting
- **Solution:** AI suggests topics based on past posts, current trends
- **Inputs:** Topic preferences, target audience
- **Outputs:** Blog post outlines

**Step 2: Create CLAUDE.md**
```markdown
## Your Role
1. Generate blog topic suggestions based on past posts
2. Create detailed outlines for approved topics
3. Track published topics to avoid repetition

## Files to Read
- data/published-posts.yml - Last 20 published topics
- data/topic-preferences.yml - User interests and keywords

## Critical Rules
- [ ] No topic can repeat within 6 months
- [ ] Each outline must have 3-5 sections
- [ ] Include SEO keywords in outline

## Validation Checklist
- [ ] Topic not in recent history
- [ ] Outline has introduction, body, conclusion
- [ ] Target word count specified
```

**Step 3: Build Incrementally**
- Week 1: Create topic suggestion feature
- Week 2: Add outline generation
- Week 3: Add anti-repetition logic
- Document each phase in PROJECT_HISTORY.md

---

## When to Add More Structure

### Add `data/` folder when:
- You need to store structured information (taxonomy, history)
- You have configuration that changes rarely

### Add `inputs/` folder when:
- Users provide different parameters each time
- You want to save input history

### Add `outputs/` folder when:
- You generate files (reports, HTML, PDFs)
- Outputs should be reproducible from inputs

### Add `scripts/` folder when:
- You have automation logic
- You need validation or processing code

### Add `templates/` folder when:
- You generate formatted outputs (HTML, Markdown)
- Output structure is consistent

**From meal-planner:** Started with just README and CLAUDE.md. Added folders as needs became clear.

---

## Learned From

This template distills lessons from building the [Meal Planner System](https://github.com/yourusername/meal-planner):
- 13 development phases over 3 months
- Evolved from spreadsheet → manual automation → intelligent system
- Production use: generates weekly meal plans automatically

**Key insight:** The best systems emerge through use, not planning.

---

## Quick Start Checklist

- [ ] Copy this template folder
- [ ] Customize README.md (problem, solution, users)
- [ ] Edit CLAUDE.md (role, files, rules, validation)
- [ ] Create initial PROJECT_HISTORY.md entry
- [ ] Start building the simplest version
- [ ] Use it yourself for a week
- [ ] Document what you learned
- [ ] Add structure only when needed
- [ ] Commit after each session

---

**Template Version:** 1.0.0
**Last Updated:** 2025-12-30
**Source:** [Meal Planner Project](https://github.com/yourusername/meal-planner)

Start simple. Build incrementally. Document continuously. 🚀
