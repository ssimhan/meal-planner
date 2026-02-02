---
description: Resolve ALL bugs and technical debt before phase completion. No exceptions.
---

# /fix

Use this workflow to eliminate all bugs and debt identified during code-review. Nothing carries forward to the next phase.

## Core Principles
- **Zero Carryover**: Every bug and debt item is resolved before closeout. No deferrals.
- **Reproduction FIRST**: NEVER start a fix without a failing test (or a UI test plan) that proves the bug exists.
- **Decompose to Conquer**: Large fixes get broken into atomic sub-tasks.
- **Regression Prevention**: Every fix includes a test proving the bug is dead.
- **Scope Discipline**: Fix what's documented. New discoveries go to BUGS.md, then get fixed.

## The Process

### 1. Inventory
- Read `docs/BUGS.md` to inventory ALL active bugs and debt.
- Count total items. This is your target: reduce to zero.
- Create TodoWrite list with all items.

### 2. Decomposition
For each item, assess complexity:
- **Simple** (< 30 min): Fix directly.
- **Medium** (30 min - 2 hrs): Break into 2-3 sub-tasks.
- **Complex** (> 2 hrs): Break into atomic units, each independently testable and commitable.

Document the breakdown in TodoWrite before starting fixes.

### 3. Fix Loop (for each item/sub-task)
- **Reproduce FIRST**:
  - **Logic/Backend**: Write a failing unit or integration test that reproduces the bug.
  - **Complex UI**: If a code-based test is insufficient or too complex for the current state, output a **Markdown UI Test Plan** (e.g., `docs/tests/BUG-XXX-repro.md`) detailing the exact steps to reproduce and verify the fix in the browser.
- **Isolate**: Identify root cause, not just symptoms. Do NOT modify the fix until the reproduction proof (test or plan) is active.
- **Fix**: Apply minimal, targeted change using subagents (e.g., via `/implement` or `/plan`).
- **Verify**:
  - Reproduction test now passes OR UI Test Plan steps are successfully executed and verified.
  - Full test suite passes (no regressions)
- **Update BUGS.md**: Mark as Fixed with brief note.
- **Commit**: Atomic commit per fix (e.g., `fix(area): resolve BUG-XXX - description`).

### 4. Debt Resolution
Same loop as bugs, but with refactoring mindset:
- Ensure tests cover refactored code paths.
- Break large refactors into sequential, stable states.
- Each commit leaves codebase in working state.

### 5. Discovery During Fixes
When fixing reveals NEW issues:
- Add to BUGS.md immediately.
- Add to TodoWrite list.
- Fix before proceeding to closeout.

### 6. Completion Gate
Before proceeding to `/closeout`, ALL must be true:
- [ ] Active Bugs = 0
- [ ] Active Debt/Features = 0
- [ ] All tests passing
- [ ] No new TODOs/FIXMEs introduced
- [ ] BUGS.md shows all items resolved

## Handling Large Fix Sessions
If total fix work exceeds 4 hours:
- Group related fixes into logical batches.
- Complete and commit each batch.
- Take breaks between batches to maintain quality.
- Never rush—rushed fixes create new bugs.

## Anti-Patterns
- Deferring items to "next phase"
- Combining multiple fixes in one commit
- Skipping tests because "it's a simple fix"
- Expanding scope during fix ("while I'm here..." -> add to BUGS.md instead)
- Marking items as "won't fix" without user approval

**Next Step**: Once all items are resolved, suggest to the user that they should use **`/verify-ux`** to verify the interactive experience before closeout.