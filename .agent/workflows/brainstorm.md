---
description: Brainstorm and design a new feature or complex change. Uses the Socratic method to explore intent and constraints.
---

# /brainstorm

Use this workflow BEFORE starting any creative work to turn ideas into fully formed designs and specs through natural collaborative dialogue.

## Core Principles
- **Design for Failure Modes**: Always identify what happens when things go wrong. Build in fallbacks.
- **Constraints Create Freedom**: Clearly define what we NOT building.
- **One Question at a Time**: Don't overwhelm. Guide the user through the design process.
- **Incremental Validation**: Present the design in 200-300 word chunks and ask for feedback.

## The Process

1. **Discovery**
   - Read the current project state (`CLAUDE.md`, `README.md`, recent logs).
   - Ask Socratic questions one at a time to refine the idea. Focus on:
     - **Purpose**: Why are we building this?
     - **Audience**: Who is the user? How will they access it? (REQUIRED for UI work, see `ui-development` skill).
     - **Failure Modes**: What are the edge cases? How do we handle errors?
     - **Success Criteria**: What does "done" look like?
   - **If UI/Frontend Work Detected**:
     - Trigger `ui-development` skill
     - Run domain exploration (concepts, color world, signature, defaults)
     - Capture design direction in the design doc

2. **Exploration**
   - Propose 2-3 different approaches with trade-offs.
   - Lead with a recommendation and explain your reasoning.

3. **Presentation**
   - Present the validated design in sections (Architecture, Components, Data Flow, Error Handling).
   - After each section, pause for user confirmation: "Does this look right so far?"

4. **Persistence**
   - Write the final design doc to `docs/plans/YYYY-MM-DD-<topic>-design.md`.
   - Update `PROJECT_HISTORY.md` to reflect the design phase.

**Next Step**: Once design is approved, use `/design` to create an implementation plan.
