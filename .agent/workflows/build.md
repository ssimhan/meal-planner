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
   - Run `npm run check` to verify clean starting state.

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

4. **Technical Debt Discovery**
   - As you implement, actively look for existing technical debt, complex code that needs refactoring, or missing edge case handling.
   - If found, and it's out of scope for the current task, IMMEDIATELY add it to `BUGS.md` or the appropriate technical debt tracker.

5. **Progress Tracking**
   - Check off tasks in the plan file as they are completed.
   - Update `PROJECT_HISTORY.md` at the end of the session.

6. **Continuous Verification**
   - Run `npm run check` after each task to catch regressions early.
   - Pre-commit hooks will run automatically on commit (type check, lint, tests).
   - If pre-commit fails, fix before proceeding.

**Test Commands:**
| Command | When to Use |
|---------|-------------|
| `npm run check` | Quick validation after each task (~15s) |
| `npm run check:full` | Full validation including Python (~20s) |
| `npm test -- --watch` | TDD mode for frontend |
| `npm run test:py` | Python unit tests only |

**Next Step**: Once all tasks are complete, use `/code-review` for the final quality check, then `/fix` to resolve all identified issues.
