# Claude Code Project Quickstart Template

**Purpose:** A starter template for building AI-assisted projects with Claude Code in VS Code, hosted on GitHub.

This template incorporates best practices learned from building the [Meal Planner System](https://github.com/yourusername/meal-planner) - a production system that evolved through 13 development phases.

---

## What This Template Provides

### 1. **Documentation Structure**
- **CLAUDE.md** - AI operating manual
- **PROJECT_HISTORY.md** - Development timeline
- **README.md** - User documentation
- **TAXONOMY.md** (optional) - Data model definitions

### 2. **Repository Organization**
- Clear folder structure for data, scripts, inputs, outputs
- Git-friendly plain text formats (YAML, Markdown, HTML/PDF)
- Separation of concerns (source data vs generated outputs)

### 3. **Development Workflow**
- Planning → Implementation → Validation cycle
- Session-based history tracking
- Clear commit practices
- Custom Claude Code slash commands

### 4. **AI Integration Patterns**
- Structured instructions for Claude Code
- Validation frameworks
- State tracking mechanisms
- Error handling guidelines

---

## Quick Start: Creating a New Project

### Step 1: Initialize Repository

```bash
# Create new repo on GitHub
gh repo create my-new-project --public --clone

cd my-new-project

# Copy this template structure
mkdir -p data scripts inputs outputs docs templates
touch README.md CLAUDE.md PROJECT_HISTORY.md .gitignore

# Initialize VS Code + Claude Code
code .
```

### Step 2: Create Core Documentation Files

#### **CLAUDE.md** - AI Operating Manual

This file tells Claude Code:
- What files to read (context)
- What files to write (outputs)
- What rules to follow (constraints)
- What to do when stuck (error handling)

**Template:**

```markdown
# Claude Code Operating Manual

## Your Role

You are responsible for:
1. [Primary task 1]
2. [Primary task 2]
3. [Primary task 3]

## Files You Should Read

### Always Read First (Context)
- `README.md` - System architecture
- `data/taxonomy.yml` - Data model definitions
- `data/history.yml` - Historical state

### Read for Specific Tasks
- `scripts/workflow.py` - Automation logic
- `scripts/validate.py` - Validation rules

## Files You Should Write

### `outputs/[output-name].md`
**When:** [Trigger condition]
**Format:** [Description]
**Template Location:** `templates/[template-name].html`

## Critical Rules

### Rule Category 1
- [ ] Specific constraint 1
- [ ] Specific constraint 2

### Rule Category 2
- [ ] Specific constraint 1
- [ ] Specific constraint 2

## Validation Checks (Before Finalizing)

Before generating output, verify ALL of these:
- [ ] Check 1
- [ ] Check 2
- [ ] Check 3

## Error Handling

If you cannot complete a task, explain which constraint cannot be satisfied:

1. **Scenario 1:** [Description]
   - Explain the issue
   - Suggest alternatives
   - Ask user for guidance

**NEVER** proceed with invalid output. Always ask for user guidance when blocked.
```

#### **PROJECT_HISTORY.md** - Development Timeline

**Template:**

```markdown
# Project History

**Project Goal:** [One sentence description]

**Target Audience:** [Who is this for?]

## Core Philosophy

### The Problem This Solves
[Describe the pain point or inefficiency]

### The Solution
- [Key approach 1]
- [Key approach 2]
- [Key approach 3]

## Project Structure Decisions

### Why [Technology Choice]?

**Decision:** [What you chose]

**Rationale:**
- [Reason 1]
- [Reason 2]
- [Reason 3]

**What I learned:** [Key insight]

## Development Timeline

### Phase 0: Scaffolding
**Commit:** `[git-hash]` - [Commit message]

**What We Built:**
- [Item 1]
- [Item 2]

**The Challenge:** [What problem did this phase solve?]

**The Solution:** [How did you solve it?]

**Key Learning:** [What did you learn?]

---

### Phase 1: [Phase Name]
**Commit:** `[git-hash]` - [Commit message]

[Same structure as Phase 0]

---

## Lessons for Future Projects

### 1. [Lesson Title]
[Description]

### 2. [Lesson Title]
[Description]

---

## Session Log

### Session: YYYY-MM-DD

**What We Built:**
- [Feature or fix]

**Key Decisions:**
- [Decision and rationale]

**Lessons Learned:**
- [Insight]

**Next Steps:**
- [What to tackle next]

---

**Last Updated:** YYYY-MM-DD
**Status:** [Active development | Production | Maintenance mode]
```

#### **README.md** - User Documentation

**Template:**

```markdown
# Project Name

[One paragraph description of what this project does]

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Prerequisites

- Python 3.10 or higher
- [Other dependencies]

## Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd project-name
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Quick Start

[The simplest way to use the system - one command if possible]

```bash
./command-name action
```

### Detailed Usage

#### Step 1: [First Step]
[Description and commands]

#### Step 2: [Second Step]
[Description and commands]

## Project Structure

```
project-name/
├── README.md             # This file
├── CLAUDE.md            # Claude Code instructions
├── PROJECT_HISTORY.md   # Development timeline
├── data/                # Source data and state
├── inputs/              # User inputs
├── outputs/             # Generated outputs
├── scripts/             # Automation scripts
└── templates/           # Output templates
```

## Development Workflow

### End of Session Checklist

When you're ready to commit your work:

1. **Update PROJECT_HISTORY.md** with session notes
2. **Commit all changes** together

## Future Features

- [ ] [Future enhancement 1]
- [ ] [Future enhancement 2]

## License

[License type]
```

#### **.gitignore**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
dist/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Project-specific
inputs/*.yml  # Optional: ignore user inputs
outputs/*.html  # Optional: ignore generated outputs
*.log
```

### Step 3: Define Your Data Model (if applicable)

Create `data/taxonomy.yml` to define your data structures:

```yaml
# Example: Define valid categories, tags, enums

categories:
  - category_1
  - category_2
  - category_3

attributes:
  attribute_1:
    type: string
    required: true
    description: "What this attribute represents"

  attribute_2:
    type: enum
    values: [option_a, option_b, option_c]
    description: "What this attribute represents"

validation_rules:
  - rule_name: "No duplicates"
    description: "Ensure unique identifiers"
```

### Step 4: Create Claude Code Configuration

Create `.clauderc` for custom slash commands:

```json
{
  "slashCommands": {
    "start": {
      "description": "Start new workflow",
      "run": "./script-name start"
    },
    "validate": {
      "description": "Validate outputs",
      "run": "./script-name validate ${input:Input parameter}"
    }
  }
}
```

### Step 5: Set Up Version Control

```bash
git add .
git commit -m "Initial scaffolding from Claude Code quickstart template"
git push origin main
```

---

## Best Practices from Real-World Usage

### 1. **Start Simple, Iterate Based on Use**

**Don't:**
- Build every feature before first use
- Automate before understanding the manual process
- Optimize prematurely

**Do:**
- Scaffold the minimum viable structure
- Use the system manually first
- Automate repetitive pain points only after they become painful

**Example from Meal Planner:**
- Phase 0-3: Built basic recipe database and manual planning
- Phase 4-6: Automated only after understanding constraints
- Phase 7-12: Refined based on real usage (energy-based prep model)

### 2. **Write Instructions Like Teaching a Smart Intern**

Claude Code is powerful but needs clear instructions. Your CLAUDE.md should specify:

- **Context:** What files to read before starting
- **Output:** Exactly what to write and in what format
- **Constraints:** Rules that must never be broken
- **Validation:** Checklist to verify correctness
- **Error Handling:** What to do when stuck

**Example instruction pattern:**
```markdown
## Files You Should Write

### `outputs/report.md`

**When:** After analyzing input data

**Format:** Markdown with sections: Summary, Findings, Recommendations

**Validation:** Before writing, check:
- [ ] All required sections present
- [ ] No placeholder text like "[TODO]"
- [ ] At least 3 findings documented
```

### 3. **Use Plain Text Formats**

**Prefer:**
- YAML for structured data (human-readable, Git-friendly)
- Markdown for documentation (easy to edit, version control)
- HTML for rich outputs (portable, no dependencies)

**Avoid (initially):**
- Databases (adds complexity, harder to inspect)
- Binary formats (not Git-friendly, not human-readable)
- Complex frameworks (increases cognitive load)

**When to graduate:**
- Database: When data exceeds ~10,000 records or requires complex queries
- Binary: When performance matters more than readability
- Framework: When manual patterns become too repetitive

### 4. **Design for Failure Modes**

Systems fail. Design for graceful degradation:

- **Validation scripts:** Catch errors before they propagate
- **Fallback options:** What happens when the ideal path fails?
- **State tracking:** Know where you are in multi-step workflows
- **Idempotent operations:** Safe to retry without side effects

**Example from Meal Planner:**
- Freezer backup meals (when energy depletes)
- Validation scripts (catch constraint violations)
- State tracking (know which step to resume)

### 5. **Document as You Build**

Update PROJECT_HISTORY.md after every significant change:

- **What changed:** Features added, bugs fixed
- **Why:** Rationale for decisions made
- **Lessons learned:** Insights for future you
- **Git reference:** Commit hash for this phase

**Timing:**
- ✅ After each coding session
- ✅ Before committing major changes
- ❌ Retroactively (you'll forget details)

### 6. **Use Todo Lists for Complex Tasks**

When working with Claude Code on multi-step tasks:

```markdown
## Session Todos

- [ ] Read existing codebase
- [ ] Design data schema
- [ ] Implement parser
- [ ] Add validation
- [ ] Update documentation
- [ ] Test end-to-end
```

Claude Code can track progress and update status as it works.

### 7. **Separate Concerns in Folder Structure**

```
project/
├── data/           # Source of truth (YAML, JSON)
├── inputs/         # User-provided inputs (per session)
├── outputs/        # Generated outputs (per session)
├── scripts/        # Automation code
├── templates/      # Output templates (HTML, Markdown)
└── docs/           # Additional documentation
```

**Rationale:**
- Easy to find things (clear naming)
- Safe to delete outputs/ and regenerate (idempotent)
- Git-friendly (.gitignore inputs/ and outputs/)

### 8. **Create Wrapper Scripts for Common Workflows**

Don't make users memorize complex commands:

**Bad:**
```bash
python3 scripts/process.py --input inputs/data.yml --mode analyze --output outputs/
```

**Good:**
```bash
./project analyze  # Wrapper handles defaults
```

**Implementation:**
```bash
#!/bin/bash
# File: ./project

case "$1" in
  analyze)
    python3 scripts/process.py --input inputs/data.yml --mode analyze --output outputs/
    ;;
  validate)
    python3 scripts/validate.py "$2"
    ;;
  *)
    echo "Usage: ./project {analyze|validate}"
    exit 1
    ;;
esac
```

### 9. **Use Metadata for Automation**

Rich metadata enables intelligent automation:

```yaml
# Example: Recipe with metadata
recipe_001:
  name: "Lentil Tacos"
  tags: [vegetarian, quick, batch-friendly]
  effort_level: normal
  prep_time: 30
  vegetables: [bell peppers, onions, tomatoes]
```

With good metadata, you can query:
- "Find all vegetarian recipes under 30 minutes"
- "Which recipes use bell peppers?"
- "Show me batch-friendly options"

**Tag once, query forever.**

### 10. **Validate Early, Validate Often**

Create validation scripts that check:
- Required fields present
- Enums match allowed values
- No duplicates where uniqueness required
- Cross-references are valid (IDs exist)
- Business rules satisfied

**Run validation:**
- Before committing
- After generating outputs
- In CI/CD (GitHub Actions)

---

## Claude Code Skills You Should Know

### 1. **Plan Mode** (EnterPlanMode tool)

Use for complex features where the approach isn't obvious:

```
You: "Add a new feature to export data to PDF"

Claude: [Enters plan mode]
- Explores codebase
- Identifies integration points
- Designs approach
- Presents plan for approval

You: "Looks good, proceed"

Claude: [Exits plan mode, implements]
```

**When to use:**
- Multi-file changes
- Architectural decisions
- Unclear requirements

### 2. **Custom Slash Commands** (.clauderc)

Define project-specific commands:

```json
{
  "slashCommands": {
    "parse": {
      "description": "Parse raw data into structured format",
      "run": "python3 scripts/parse.py"
    }
  }
}
```

**Usage:**
```
You: "/parse"
Claude: [Runs command, shows output]
```

### 3. **Task Tool** (Background Agents)

Spawn specialized agents for research or parallel work:

```
You: "Research best practices for error handling in Python, then implement in our codebase"

Claude: [Spawns research agent]
[Waits for results]
[Implements based on findings]
```

### 4. **TodoWrite** (Task Tracking)

For multi-step tasks, Claude tracks progress:

```
Claude: Let me create a todo list for this feature:
1. [ ] Design data schema
2. [ ] Implement parser
3. [ ] Add validation
4. [ ] Update documentation

[Marks items complete as it works]
```

### 5. **Git Integration**

Claude can commit and push changes:

```
You: "Commit all changes with a descriptive message"

Claude:
- Runs git status
- Reviews changes
- Writes commit message
- Commits and pushes
```

**Best practice:** Let Claude write commit messages - they're often more detailed than human ones.

---

## Example Project Templates

### Template 1: Data Processing Pipeline

**Use case:** Transform input data → process → generate reports

**Structure:**
```
data-pipeline/
├── data/
│   ├── taxonomy.yml        # Valid data schema
│   └── history.yml         # Processing history
├── inputs/
│   └── YYYY-MM-DD.csv      # Raw data files
├── outputs/
│   └── YYYY-MM-DD-report.html
├── scripts/
│   ├── parse.py            # Parse raw data
│   ├── process.py          # Transform data
│   ├── generate.py         # Create reports
│   └── validate.py         # Quality checks
└── templates/
    └── report-template.html
```

**Workflow:**
```bash
./pipeline parse inputs/2025-01-15.csv
./pipeline process
./pipeline generate
./pipeline validate outputs/2025-01-15-report.html
```

### Template 2: Content Generation System

**Use case:** Generate blog posts, documentation, or marketing copy

**Structure:**
```
content-generator/
├── data/
│   ├── topics.yml          # Content topics
│   ├── templates.yml       # Output templates
│   └── history.yml         # Published content
├── inputs/
│   └── brief-YYYY-MM-DD.yml  # Content brief
├── outputs/
│   └── article-slug.md     # Generated content
└── scripts/
    ├── generate.py         # Content generation
    └── validate.py         # Quality checks
```

### Template 3: Automation Workflow

**Use case:** Recurring tasks with state management

**Structure:**
```
workflow-automation/
├── data/
│   ├── state.yml           # Current workflow state
│   └── history.yml         # Past executions
├── inputs/
│   └── config.yml          # User configuration
├── outputs/
│   └── results/            # Execution results
└── scripts/
    ├── workflow.py         # Main automation
    └── state_manager.py    # State tracking
```

**State tracking example:**
```yaml
# data/state.yml
current_step: 3
steps:
  - step: 1
    status: completed
    timestamp: 2025-01-15T10:30:00
  - step: 2
    status: completed
    timestamp: 2025-01-15T10:35:00
  - step: 3
    status: in_progress
    timestamp: 2025-01-15T10:40:00
```

---

## GitHub Integration

### Repository Setup

1. **Create repo with descriptive README:**
   ```bash
   gh repo create my-project --public --clone
   cd my-project
   ```

2. **Add topics for discoverability:**
   ```bash
   gh repo edit --add-topic claude-code
   gh repo edit --add-topic automation
   gh repo edit --add-topic python
   ```

3. **Set up GitHub Actions (optional):**
   ```yaml
   # .github/workflows/validate.yml
   name: Validate
   on: [push, pull_request]
   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Set up Python
           uses: actions/setup-python@v2
           with:
             python-version: '3.10'
         - name: Install dependencies
           run: pip install -r requirements.txt
         - name: Run validation
           run: python scripts/validate.py
   ```

### Commit Practices

**Good commit messages** (let Claude write these):
```
Add recipe parsing with metadata extraction

- Implemented HTML parser using schema.org microdata
- Extract ingredients, instructions, cooking time
- Auto-categorize by template and effort level
- Generate structured YAML index from 234 recipes

This enables intelligent recipe selection based on constraints
like effort level, vegetables, and cooking appliances.
```

**Bad commit messages:**
```
update stuff
fix bug
changes
```

### Branch Strategy

For solo projects with Claude Code:
- **main** - Production-ready code
- **feature/feature-name** - New features (optional)

```bash
# Simple workflow (no branches needed for solo projects)
git add .
git commit -m "Descriptive message"
git push

# Feature branch workflow (for larger changes)
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Implement new feature"
git push -u origin feature/new-feature
gh pr create
```

---

## Checklist: Starting a New Project

### Initial Setup
- [ ] Create GitHub repository
- [ ] Clone locally
- [ ] Create folder structure (data/, scripts/, inputs/, outputs/, templates/)
- [ ] Add core documentation (README.md, CLAUDE.md, PROJECT_HISTORY.md)
- [ ] Create .gitignore
- [ ] Create .clauderc with slash commands
- [ ] Install dependencies (requirements.txt or package.json)
- [ ] Initial commit and push

### Documentation
- [ ] README.md explains what the project does
- [ ] CLAUDE.md tells Claude what to read, write, and validate
- [ ] PROJECT_HISTORY.md has initial "Core Philosophy" section
- [ ] Data taxonomy defined (if applicable)

### Development Workflow
- [ ] Define clear input format
- [ ] Define clear output format
- [ ] Create validation script
- [ ] Create wrapper script for common commands
- [ ] Test end-to-end manually before automating

### Quality Assurance
- [ ] Validation script catches common errors
- [ ] Error messages are actionable
- [ ] Outputs are idempotent (safe to regenerate)
- [ ] State is tracked (if multi-step workflow)

### Maintenance
- [ ] Update PROJECT_HISTORY.md after each session
- [ ] Commit with descriptive messages
- [ ] Tag releases (git tag v1.0.0)
- [ ] Update README when features change

---

## Common Pitfalls to Avoid

### 1. **Over-Engineering Early**
- ❌ Building a database before you have 100 records
- ❌ Creating abstractions before patterns emerge
- ❌ Optimizing before measuring performance

### 2. **Unclear Instructions to Claude**
- ❌ Vague rules like "make it good"
- ❌ Conflicting constraints
- ❌ No validation checklist

### 3. **Poor File Organization**
- ❌ Mixing inputs and outputs in same folder
- ❌ No clear source of truth
- ❌ Outputs not reproducible from inputs

### 4. **Documentation Debt**
- ❌ Delaying PROJECT_HISTORY updates
- ❌ Unclear commit messages
- ❌ No rationale for decisions

### 5. **Ignoring Failure Modes**
- ❌ No fallback when ideal path fails
- ❌ No validation before committing
- ❌ No way to resume interrupted workflows

---

## Resources

### Claude Code Documentation
- [Official Docs](https://docs.anthropic.com/claude-code)
- [Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [Community Examples](https://github.com/topics/claude-code)

### Related Skills
- Git basics (commit, push, branch)
- YAML syntax
- Markdown formatting
- Basic Python (for scripts)
- Command line navigation

### Inspiration
- [Meal Planner](https://github.com/yourusername/meal-planner) - Production system built with this approach
- [12 Factor App](https://12factor.net/) - Principles for reproducible systems
- [Readme Driven Development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html)

---

## Conclusion

This template provides a battle-tested structure for building AI-assisted projects with Claude Code. The patterns come from real-world usage on a production system that evolved through 13 phases.

**Key principles:**
1. **Clear instructions** (CLAUDE.md)
2. **Plain text formats** (YAML, Markdown)
3. **Incremental development** (start simple, iterate)
4. **Continuous documentation** (PROJECT_HISTORY.md)
5. **Design for failure** (validation, fallbacks, state tracking)

Start with the minimum structure, use it manually first, then automate the painful parts. Let Claude Code handle the complex logic while you focus on defining the rules and constraints.

**Next steps:**
1. Copy this template structure
2. Define your domain (what does your project do?)
3. Create CLAUDE.md with clear instructions
4. Build incrementally
5. Document as you go

Good luck building! 🚀

---

**Template Version:** 1.0.0
**Last Updated:** 2025-12-30
**Source:** Learned from building [Meal Planner System](https://github.com/yourusername/meal-planner)
