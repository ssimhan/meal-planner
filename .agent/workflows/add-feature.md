---
description: Add a feature request to the implementation plan without starting work on it.
---

# /add-feature

Use this workflow when describing a feature that needs to be added to the project roadmap.

## Core Principles
- **Capture, Don't Build**: Your job is to document, not to implement.
- **Phase Awareness**: Features belong in the right phase of the implementation plan.
- **No Side Quests**: Do NOT start designing, coding, or scoping the feature.

## The Process

1. **Parse the Feature Description**
   - Extract the core capability from the user's description
   - Identify the feature's purpose and value
   - Note any dependencies or prerequisites mentioned
   - Understand scope (small enhancement vs major feature)

2. **Locate the Implementation Plan**
   - Look for implementation plan in these locations (in order):
     - `docs/plans/implementation.md`
     - `implementation.md`
     - `ROADMAP.md`
     - `docs/ROADMAP.md`
   - If no plan exists, create `ROADMAP.md` with this structure:
   ```markdown
   # Product Roadmap

   ## Current Phase

   | Feature | Description | Status |
   |---------|-------------|--------|

   ## Future Phases

   ### Phase Next
   | Feature | Description | Priority |
   |---------|-------------|----------|
   ```

3. **Determine Phase Placement**
   - **Current Phase** if:
     - Feature is a small enhancement to existing work
     - Explicitly requested as urgent/priority
     - Naturally fits with in-progress work
   - **Future Phase** if:
     - Feature is a new capability
     - Requires significant design/architecture
     - Has dependencies on unfinished work
     - User says "later" or "eventually"

4. **Add to the Appropriate Phase**
   - Add a new row with:
     - **Feature**: Concise name (2-4 words)
     - **Description**: What it does and why (1-2 sentences)
     - **Status/Priority**: Pending (current) or High/Medium/Low (future)

5. **Confirm Addition**
   - Report where the feature was added (which phase)
   - Show the table row that was added
   - Explicitly state: "Feature has been added to [phase]. NOT starting work on it."

## What NOT To Do
- Do NOT create design documents
- Do NOT write code or tests
- Do NOT create branches
- Do NOT estimate effort or timelines
- Do NOT break down the feature into tasks

## Example

**User**: "We should add dark mode support eventually"

**Action**: Add to Future Phase in ROADMAP.md:
```markdown
| Dark Mode | Theme toggle with system preference detection | Medium |
```

**Response**: "Added 'Dark Mode' to Future Phases (Medium priority). NOT starting work on it."

---

**User**: "Can you add a loading spinner to the submit button? It's confusing without feedback."

**Action**: Add to Current Phase (small UX enhancement):
```markdown
| Submit Feedback | Add loading spinner to submit button for user feedback | Pending |
```

**Response**: "Added 'Submit Feedback' to Current Phase. NOT starting work on it."
