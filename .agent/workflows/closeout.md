---
description: Update documentation, commit and push to the latest branch
---

# /closeout

Use this workflow to wrap up a development session and maintain a clean project history.

## Prerequisites
- `/code-review` has been completed
- `/fix` has been completed with zero remaining bugs/debt
- BUGS.md shows all items resolved for current phase

## Core Principles
- **Document as You Go**: History is most accurate when fresh.
- **Kaizen (Continuous Improvement)**: Each session should leave the codebase better than it found it.
- **Clean State**: No dangling worktrees or uncommitted changes.
- **Atomic History**: Ensure the branch is ready for merge or PR.

## The Process
1. **Verification**
   - Run ALL tests in the project to ensure no regressions.
   - Verify `CLAUDE.md` is updated if any new patterns were established.

2. **Improvement (Kaizen)**
   - Identify and address at least one minor instance of "Muda" (waste) or "Mura" (inconsistency).
   - If instruction files (e.g., `CLAUDE.md`) are updated and grow too large, use `agent-md-refactor` to reorganize.
   - Use the `kaizen` skill for guidance.

3. **Documentation**
   - **Changelog**: Use the `changelog-generator` logic to transform git commits into a user-facing summary.
   - **History**: Update `PROJECT_HISTORY.md` with:
     - What was built.
     - Key decisions and rationale.
     - Lessons learned (for future blog content).
     - Git commit hashes.
   - **Humanization Pass**: Use the `humanizer` skill to ensure documentation is free of AI-isms and matches our premium voice.

4. **Git Hygiene**
   - Stage any remaining changes.
   - Commit with a descriptive message if not already done.
   - Push to the remote branch.
   - (Optional) Clean up local worktrees.

5. **Summary**
   - Provide a final brief summary of the session to the user.
