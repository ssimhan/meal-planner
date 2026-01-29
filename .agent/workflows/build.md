---
description: Execute an approved implementation plan using subagents and TDD.
---

# /build

Use this workflow to execute a structured implementation plan step-by-step.

## Core Principles
- **No Production Code Without a Failing Test**: The Iron Law of TDD.
- **Atomic Execution**: Complete one task, verify it, and commit it before moving on.
- **Systematic Verification**: Never assume it works because it "looks right".

## The Process

1. **Setup**
   - Read the implementation plan from `docs/plans/`.
   - Ensure you are in the correct context (checkout branch if needed).

2. **Task Execution (Round-robin per task)**
   - For each task in the plan:
     - **RED**: Write the failing test as specified in the plan. Watch it fail.
     - **GREEN**: Write minimal code to make the test pass.
     - **REFACTOR**: Clean up code while keeping tests green.
     - **COMMIT**: Use the exact commit command from the plan.
   - **UI Task Detection**:
     - When implementing UI components, auto-load `.interface-design/system.md` if exists
     - Apply craft principles from `ui-development` skill
     - Offer to save new patterns after completion

3. **Subagent Handoff (Optional)**
   - If a task is complex, you may spawn a subagent to handle the RED-GREEN-REFACTOR cycle, but you MUST review its work against the plan's success criteria.

4. **Progress Tracking**
   - Check off tasks in the plan file as they are completed.
   - Update `PROJECT_HISTORY.md` at the end of the session.

**Next Step**: Once all tasks are complete, use `/code-review` for the final quality check.
