---
description: Review newly built code to catch bugs, hidden technical debt, and structural risks.
---

# /code-review

Use this workflow to ensure high-quality, spec-compliant code before merging.

## Core Principles
- **Verification Over Trust**: Run tests yourself. Don't take the subagent's word for it.
- **Spec Compliance**: Does this actually solve the problem defined in the Design Doc?
- **Trace Review**: Use the `observability` skill to review execution logs for efficiency/failures.
- **Aesthetic Excellence**: For UI work, verify the "Premium Baseline" (see `ui-development`).
- **Technical Excellence**: Check for YAGNI, DRY, and Clean Architecture principles.

## The Review Checklist
- [ ] **Tests**: Exhaustive coverage? TDD-first proof?
- [ ] **Aesthetics**: Premium UI? Responsive? (If applicable)
- [ ] **Traces**: Execution logs clear and logical? No hidden bottlenecks?
- [ ] **Architecture**: Clean Code? DDD/SOLID used where appropriate?
- [ ] **Kaizen**: Is the codebase better than we found it?
- [ ] **Entropy Audit**: Did we delete as much as we added? Use the `reducing-entropy` skill to minimize waste.
- [ ] **Style**: Matches `CLAUDE.md` and project history.
- [ ] **UI Code Review** (for frontend code):
  - Check against `.interface-design/system.md` if exists
  - Flag spacing violations, depth inconsistencies, pattern drift
  - Suggest corrections aligned with established system

## The Process
1. Inspect the diff of the changes.
2. Run the test suite on the modified files.
3. If issues are found, provide specific feedback or implement the fixes.
4. Once satisfied, approve the changes for closeout.
