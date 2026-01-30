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

## Production Reliability Checklist

**Before approving any PR**, verify these **P0 (Blocking)** requirements:

### 1. External Dependencies
- [ ] Timeouts on all HTTP/database calls
- [ ] Retry logic with exponential backoff
- [ ] Graceful degradation when dependencies fail

### 2. Write Operations  
- [ ] Idempotent (safe to retry)
- [ ] Unique constraints enforced
- [ ] Atomic (all-or-nothing)

### 3. Resource Management
- [ ] Connections closed in `finally` blocks
- [ ] Memory/queue size limits
- [ ] Rate limiting where needed

### 4. Error Handling
- [ ] All exceptions logged with context
- [ ] User-friendly error messages
- [ ] No silent failures (`except: pass`)

### 5. Input Validation
- [ ] Validated at API boundaries
- [ ] Type checking enforced
- [ ] Size limits on uploads/requests

### Quick Examples

**Timeouts:**
```python
# ❌ Bad: Can hang forever
response = requests.get(url)

# ✅ Good: Fails fast
response = requests.get(url, timeout=5)
```

**Idempotency:**
```python
# ❌ Bad: Retry creates duplicates
items.append(new_item)

# ✅ Good: Retry is safe
items[item_id] = new_item
```

**Resource Cleanup:**
```python
# ❌ Bad: Connection leak
conn = get_connection()
return conn.query()

# ✅ Good: Guaranteed cleanup
with get_connection() as conn:
    return conn.query()
```

**Error Logging:**
```python
# ❌ Bad: Silent failure
try:
    send_email()
except:
    pass

# ✅ Good: Logged with context
try:
    send_email()
except Exception as e:
    logger.error(f"Email failed: {e}", extra={"user_id": user.id})
```

**Input Validation:**
```python
# ❌ Bad: Assumes valid input
def create_week(week_of):
    return storage.create(week_of)

# ✅ Good: Validates first
def create_week(week_of):
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', week_of):
        raise ValueError("Invalid date format")
    return storage.create(week_of)
```

### Decision Tree

**If ANY P0 check fails:**
- **\u003c 30 min fix?** → Fix now before merge
- **\u003e 30 min fix?** → Add to `docs/BUGS.md`, block merge

**Rationale:** These 5 checks prevent 80% of production outages. Non-negotiable for production code.

**Next Step**: Once review is complete, use `/fix` to resolve ALL identified bugs and debt before `/closeout`.
