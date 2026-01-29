---
name: gepetto
description: Orchestrates a multi-step planning process: Research → Interview → Spec Synthesis → Plan → External Review → Sections
---

# Gepetto: Deep Planning

Orchestrates a multi-step planning process: Research → Interview → Spec Synthesis → Plan → External Review → Sections

## Workflow

### 1. Research & Discovery
- **Codebase research:** Explore existing patterns and constraints.
- **Web research:** Research new technologies or best practices.
- **Spec Synthesis:** Combine research into a technical specification.

### 2. Interview
- Ask clarifying questions to the user based on the research findings.
- Ensure all constraints and preferences are documented.

### 3. Verification
- Launch parallel subagents (e.g., Gemini, Codex) to review the plan.
- Integrate feedback and harden the implementation strategy.

### 4. Sectioning
- Break the plan into self-contained implementation units (Sections).
- Each section should have its own background, requirements, and acceptance criteria.

## Output
Gepetto writes all planning artifacts to a dedicated planning directory:
- `claude-research.md`: Research findings.
- `claude-interview.md`: Q&A transcript.
- `claude-spec.md`: Synthesized specification.
- `claude-plan.md`: Implementation plan.
- `sections/`: Self-contained implementation units.
