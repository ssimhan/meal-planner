---
description: Add a bug to the tracking table without starting work on it.
---

# /add-bug

Use this workflow when describing a bug that needs to be tracked for later resolution.

## Core Principles
- **Capture, Don't Fix**: Your job is to document, not to solve.
- **Structured Tracking**: All bugs go in `BUGS.md` in the project root.
- **No Side Quests**: Do NOT investigate or attempt fixes. Reproduction will be handled as the first step of the `/fix` workflow.

## The Process

1. **Parse the Bug Description**
   - Extract the core issue from the user's description
   - Identify affected area (component, file, feature)
   - Note reproduction steps if provided
   - Determine severity if mentioned (Critical, High, Medium, Low)

2. **Check for BUGS.md**
   - If `BUGS.md` doesn't exist, create it with this structure:
   ```markdown
   # Bug Tracker

   ## Open Bugs

   | ID | Description | Area | Severity | Reported | Notes |
   |----|-------------|------|----------|----------|-------|

   ## Resolved Bugs

   | ID | Description | Resolution | Resolved |
   |----|-------------|------------|----------|
   ```

3. **Add to Open Bugs Table**
   - Generate next ID (BUG-001, BUG-002, etc.)
   - Add a new row with:
     - **ID**: Sequential bug ID
     - **Description**: Concise summary (1-2 sentences)
     - **Area**: Component/file/feature affected
     - **Severity**: Critical/High/Medium/Low (default: Medium if not specified)
     - **Reported**: Today's date (YYYY-MM-DD)
     - **Notes**: Any additional context

4. **Confirm Addition**
   - Report the bug ID assigned
   - Show the table row that was added
   - Explicitly state: "Bug has been added. NOT starting work on it."

## What NOT To Do
- Do NOT read the codebase to investigate
- Do NOT propose fixes or solutions
- Do NOT create branches or modify code
- Do NOT ask clarifying questions beyond what's needed for the table entry

## Example

**User**: "The login button doesn't work on Safari"

**Action**: Add to BUGS.md:
```markdown
| BUG-003 | Login button unresponsive on Safari browser | Auth/Login | Medium | 2025-01-27 | Browser-specific issue |
```

**Response**: "Added BUG-003: Login button unresponsive on Safari browser. NOT starting work on it."
