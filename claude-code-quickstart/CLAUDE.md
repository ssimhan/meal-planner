# Claude Code Operating Manual

**Purpose:** This file tells Claude Code exactly what to do, what rules to follow, and how to validate outputs.

---

## Your Role

You are responsible for:

1. [PRIMARY TASK - e.g., "Generating weekly meal plans based on constraints"]
2. [SECONDARY TASK - e.g., "Validating outputs meet all requirements"]
3. [TERTIARY TASK - e.g., "Updating historical records to prevent repetition"]

**Important:** Prioritize [KEY PRINCIPLE - e.g., "accuracy over speed" or "user clarity over brevity"].

---

## Files You Should Read

### Always Read First (Context)

Before starting any task, read these files:

- `README.md` - Understand the system architecture
- [Add your context files as you create them, e.g.:]
  - `data/taxonomy.yml` - Valid categories and data model
  - `data/history.yml` - Past records for anti-repetition
  - `inputs/current-input.yml` - Current request parameters

### Read for Specific Tasks

- [Add task-specific files, e.g.:]
  - `scripts/validate.py` - Validation logic
  - `templates/output-template.html` - Output format

**Pattern from meal-planner:** Always check history before selecting items to ensure variety.

---

## Files You Should Write

### `outputs/[output-file-name]`

**When:** After processing input and applying all constraints

**Format:** [Markdown / HTML / YAML - specify]

**Structure:**
```markdown
# Output Title

## Section 1: [Name]
[Content requirements]

## Section 2: [Name]
[Content requirements]

## Section 3: [Name]
[Content requirements]
```

**Important:**
- Use templates for consistent formatting (if applicable)
- All outputs must be reproducible from input files
- No placeholder text like "[TODO]" or "[TBD]"

---

### `data/history.yml`

**When:** After successfully generating and validating output

**Action:** Append new record (NEVER overwrite existing history)

**Format:**
```yaml
records:
  - id: "record_001"
    timestamp: "2025-01-15T10:30:00"
    [add your domain-specific fields]
```

**Pattern from meal-planner:** History enables anti-repetition - "Don't use any recipe from the last 3 weeks."

---

## Critical Rules

### Data Integrity

- [ ] All required fields must be present
- [ ] All values must match allowed types/enums (check taxonomy)
- [ ] No duplicate IDs where uniqueness required
- [ ] All cross-references must point to valid records

### Constraint Satisfaction

[Customize these for your domain - examples from meal-planner:]

- [ ] [CONSTRAINT 1 - e.g., "No item can be used more than once per output"]
- [ ] [CONSTRAINT 2 - e.g., "Must include at least 3 items from category X"]
- [ ] [CONSTRAINT 3 - e.g., "Total count must not exceed 10"]
- [ ] [CONSTRAINT 4 - e.g., "Items must not appear in last N records (check history)"]

### Output Quality

- [ ] All sections from template are present
- [ ] No placeholder text remains
- [ ] All links and references are valid
- [ ] Formatting is consistent and correct

**Pattern from meal-planner:** Validation checklist catches errors before user sees them.

---

## Validation Checks (Before Finalizing)

Before writing any output file, verify ALL of these:

**Completeness:**
- [ ] All required fields populated
- [ ] No "[TODO]" or placeholder text
- [ ] All template sections present
- [ ] Metadata complete

**Constraints:**
- [ ] [CONSTRAINT 1 verified]
- [ ] [CONSTRAINT 2 verified]
- [ ] [CONSTRAINT 3 verified]
- [ ] No items from recent history (if anti-repetition required)

**Quality:**
- [ ] Output format is valid (Markdown/HTML/YAML)
- [ ] All references are valid
- [ ] Spelling and grammar correct
- [ ] Matches user's intent from input

**State Updates:**
- [ ] History file updated correctly
- [ ] Input file marked as processed (if applicable)

**Pattern from meal-planner:** Run through entire checklist before finalizing. One missing check = invalid output.

---

## Error Handling

If you cannot generate valid output, explain the problem clearly.

### Scenario 1: Missing Required Information

**Problem:** Input file missing required fields

**Your response:**
1. List specifically which fields are missing
2. Explain why each field is needed
3. Ask user to provide the information
4. **Do NOT generate partial/invalid output**

### Scenario 2: Constraint Conflict

**Problem:** Multiple constraints cannot be satisfied simultaneously

**Your response:**
1. Explain which specific constraints conflict
2. Suggest alternatives (e.g., "Relax constraint A OR constraint B")
3. Ask user which constraint to prioritize
4. **Do NOT proceed without clarification**

### Scenario 3: Invalid Input Values

**Problem:** Input contains values not allowed by rules/taxonomy

**Your response:**
1. List invalid values and what was expected
2. Reference the rule or taxonomy defining valid options
3. Ask user to correct input
4. **Do NOT proceed with invalid data**

**Pattern from meal-planner:** When no valid recipe exists (e.g., all no-chop recipes used recently), explain the conflict and suggest using prep-ahead approach or freezer backup.

---

## Anti-Repetition Pattern

If your project needs variety (like meal-planner), use this pattern:

**In history.yml:**
```yaml
records:
  - timestamp: "2025-01-15"
    selected_items: ["item_a", "item_b", "item_c"]
```

**In CLAUDE.md rules:**
```markdown
- [ ] No item can be selected if it appears in the last N records
- [ ] Check history.yml before making selections
```

**Implementation:**
1. Load history.yml
2. Extract items from last N records
3. Filter those items from available options
4. Select from remaining items only

---

## Design for Failure Modes

**Pattern from meal-planner:** Always have a fallback when ideal path fails.

**Examples:**
- **Freezer backup meals:** When energy depleted, use pre-made options
- **Prep-ahead approach:** When no easy option available, plan prep earlier
- **Validation scripts:** Catch constraint violations before user sees them

**For your project, define:**
- What happens when constraints can't be met?
- What's the fallback when ideal option unavailable?
- How do you recover from invalid state?

---

## Examples

### Example 1: Valid Input → Valid Output

**Input:**
```yaml
request_type: analysis
criteria: [criterion_a, criterion_b]
max_items: 5
```

**Expected behavior:**
1. Read input file
2. Load taxonomy.yml and history.yml
3. Filter items meeting criteria_a AND criterion_b
4. Exclude items from recent history
5. Select up to 5 items
6. Generate output
7. Validate against checklist
8. Append to history.yml

### Example 2: Invalid Input → Clear Error

**Input:**
```yaml
request_type: unknown_type  # Invalid!
criteria: []  # Empty, but required!
```

**Expected behavior:**
1. Read input file
2. Detect "unknown_type" not in taxonomy
3. Detect empty criteria
4. Report errors:
   - "request_type 'unknown_type' is invalid. Valid types: [list]"
   - "criteria cannot be empty, at least 1 required"
5. Ask user to fix input
6. **Do NOT generate output**

---

## Tips for Success

1. **Always read context files first** - Decisions need data
2. **Check history** - Avoid repetition (if applicable)
3. **Follow validation checklist** - Every item, every time
4. **Use templates** - Consistency matters
5. **When in doubt, ask** - Better to clarify than guess wrong
6. **Explain your reasoning** - Help user understand decisions

**From meal-planner:** "I selected Lentil Tacos because: (1) uses farmers market bell peppers, (2) not used in last 3 weeks, (3) Monday has high energy for normal-effort cooking."

---

## Customization Instructions

**To adapt this template for your project:**

1. **Replace placeholders:**
   - [PRIMARY TASK], [SECONDARY TASK], etc.
   - [CONSTRAINT 1], [CONSTRAINT 2], etc.
   - File paths and formats

2. **Add domain-specific rules:**
   - What makes a valid output in your domain?
   - What patterns should be avoided?
   - What quality standards apply?

3. **Define validation criteria:**
   - What checks must pass before output is valid?
   - What's required vs optional?
   - What ranges/values are acceptable?

4. **Document error scenarios:**
   - What can go wrong?
   - How should Claude respond?
   - What's the user's next action?

**Remember:** Specific instructions → Better results. Vague instructions → Unpredictable outputs.

---

**Last Updated:** 2025-12-30
**Template Version:** 1.0.0
**Based on:** Meal Planner CLAUDE.md (13 phases of refinement)
