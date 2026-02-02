---
description: Update documentation, commit and push to the latest branch
---

# /closeout

Use this workflow to wrap up a development session and maintain a clean project history.

## Prerequisites
- `/code-review` has been completed
- `/fix` has been completed with zero remaining bugs/debt
- `/verify-ux` has been completed for interactive verification
- BUGS.md shows all items resolved for current phase

## Core Principles
- **Document as You Go**: History is most accurate when fresh.
- **Kaizen (Continuous Improvement)**: Each session should leave the codebase better than it found it.
- **Clean State**: No dangling worktrees or uncommitted changes.
- **Atomic History**: Ensure the branch is ready for merge or PR.

## The Process
1. **Verification**
   - Run `npm run check:full` to execute all automated checks:
     - TypeScript type checking
     - ESLint
     - Jest tests (15 frontend tests)
     - pytest (37 Python unit tests)
   - Verify `CLAUDE.md` is updated if any new patterns were established.

2. **Session Review**
Review the active phase and generate a **numbered list** of noteworthy items:
- Interesting new errors encountered
- Difficult technical hurdles overcome
- Important decisions made and their rationale
- Unexpected discoveries or learnings

Present list to user in this format:
```
Session Learnings:
1. [Error/Hurdle/Decision]: Brief description
2. [Error/Hurdle/Decision]: Brief description
...
```

**WAIT for user selection** before proceeding. User will indicate which items (by number) to include in project history.

3. **Documentation**
- **History**: Update `PROJECT_HISTORY.md` with:
  - What was built
  - User-selected learnings from step 2
  - Git commit hashes
- **Changelog**: Use the `changelog-generator` logic for user-facing summary if needed.

4. **Git Hygiene**
   - Stage any remaining changes.
   - Commit with a descriptive message if not already done.
   - Pre-commit hooks will run automatically (type check, lint, tests).
   - If pre-commit fails, fix issues before retrying commit.
   - Push to the remote branch.
   - (Optional) Clean up local worktrees.

5. **Summary**
- Provide a final brief summary of the session to the user.
