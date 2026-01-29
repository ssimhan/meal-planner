---
description: Create a detailed, TDD-first implementation plan from an approved design.
---

# /plan

Use this workflow once a design has been approved to create a bite-sized, executable path forward.

## Core Principles
- **TDD-First**: Every task must start with a failing test.
- **Architectural Rigor**: Apply Clean Architecture, SOLID, and Domain-Driven Design (DDD) to ensure maintainability and high quality.
- **Bite-sized Granularity**: Each task should take 2-5 minutes to implement.
- **Zero Ambiguity**: Use exact file paths and specify line ranges when modifying.
- **Goals & Success Criteria**: Every phase must have measurable outcomes.
- **Deep Planning**: For high-stakes or complex features, use the `gepetto` skill to perform exhaustive research and specs synthesis before writing the plan.
- **Visual Clarity**: Use the `c4-architecture` skill to define system boundaries and container relationships for architectural changes.

## Plan Structure (MUST include these sections)

1. **Header**
   - **Goal**: One sentence describing what this builds.
   - **Architecture**: 2-3 sentences about the approach (e.g., "Dependency Inversion for testing," "Domain Layer isolation").
   - **Design Patterns**: Specify if using Factory, Observer, Repository, etc.
   - **Tech Stack**: Libraries or frameworks involved.

2. **Implementation Phases**
   - Break work down into logic phases (e.g., Phase 1: Data Schema, Phase 2: Core Logic).
   - For each phase, list **Success Criteria** using checkboxes.

3. **Bite-Sized Tasks**
   For each task, provide:
   - **Files**: Create: `path/to/new.ts`, Modify: `path/to/old.ts:L10-20`.
   - **Step 1: Write failing test**: Provide the minimal test code.
   - **Step 2: Verify failure**: Specify the command and expected error.
   - **Step 3: Implement minimal code**: Provide the smallest implementation.
   - **Step 4: Verify pass**: Specify command and expected output.
   - **Step 5: Commit**: Provide the bash command and atomic message.

4. **For UI Features**
   - Check for `.interface-design/system.md`
   - If exists: Load and apply established patterns in implementation plan
   - If not: Include design system creation as a task in the plan

## Persistence
- Save the plan to `docs/plans/YYYY-MM-DD-<feature-name>.md`.
- Ask the user: "Ready to start building? Use `/build`."

**Internal Note**: Use the `test-driven-development` skill during implementation. For complex architecture, use `c4-architecture`. For deep research, use `gepetto`.
