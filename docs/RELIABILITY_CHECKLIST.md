# Production Reliability Checklist

**Purpose:** Ensure every feature meets production-grade reliability standards before merging.

**Source:** Senior engineering advice on "works fine until load or failure" bugs.

---

## ✅ Current Status (Phase 32)

### Level 1: Basic Reliability ✅
- [x] **Retries with exponential backoff** - All 41 database calls wrapped with `execute_with_retry()`
- [x] **Global error handler** - Added to `api/index.py` for debugging visibility
- [x] **Structured error responses** - API returns detailed error messages

### Level 2: Production-Grade (In Progress)
- [ ] **Timeouts on external calls** - ⚠️ Missing
- [ ] **Idempotency for writes** - ⚠️ Partial (some endpoints, not all)
- [ ] **Circuit breakers** - ❌ Not implemented
- [ ] **Connection pooling** - ⚠️ Supabase client handles this, but not explicitly configured
- [ ] **Bounded concurrency** - ❌ Not implemented

---

## 🔍 Code Review Checklist

Use this checklist when reviewing PRs or building new features:

### 1. External Dependencies
- [ ] **Timeout configured?** Every HTTP call, database query, external API has a timeout
- [ ] **Retry logic?** Transient failures are retried with exponential backoff
- [ ] **Circuit breaker?** Repeated failures trigger a circuit breaker to prevent cascade
- [ ] **Fallback behavior?** System degrades gracefully when dependency is down

**Example:**
```python
# ❌ Bad
response = requests.get(url)

# ✅ Good
response = requests.get(url, timeout=5)
try:
    return execute_with_retry(query, max_retries=3)
except Exception:
    return fallback_value  # Graceful degradation
```

---

### 2. Write Operations
- [ ] **Idempotent?** Can be safely retried without duplicates
- [ ] **Unique constraints?** Database enforces uniqueness where needed
- [ ] **Atomic?** All-or-nothing writes (no partial state)
- [ ] **Transaction boundaries clear?** Large transactions are split into smaller ones

**Example:**
```python
# ❌ Bad - Not idempotent
def add_item(item):
    items.append(item)  # Retry = duplicate

# ✅ Good - Idempotent
def add_item(item_id, item):
    items[item_id] = item  # Retry = same result
```

---

### 3. Resource Management
- [ ] **Connections closed?** Database/HTTP connections properly closed in `finally` blocks
- [ ] **Memory bounded?** Lists, queues, caches have size limits
- [ ] **Concurrency limited?** Max parallel requests configured
- [ ] **Rate limiting?** Protection against runaway loops or bot traffic

**Example:**
```python
# ❌ Bad - Connection leak
def fetch_data():
    conn = get_connection()
    return conn.query()

# ✅ Good - Guaranteed cleanup
def fetch_data():
    with get_connection() as conn:
        return conn.query()
```

---

### 4. Error Handling
- [ ] **Errors logged?** All exceptions logged with context
- [ ] **Errors surfaced?** User sees helpful message, not stack trace
- [ ] **Silent failures avoided?** No bare `except: pass`
- [ ] **Partial failures handled?** System continues working when one feature breaks

**Example:**
```python
# ❌ Bad - Silent failure
try:
    send_email(user)
except:
    pass  # Email failure breaks nothing, but user never knows

# ✅ Good - Logged and surfaced
try:
    send_email(user)
except Exception as e:
    logger.error(f"Email failed for {user.id}: {e}")
    return {"status": "success", "email_sent": False}
```

---

### 5. Input Validation
- [ ] **Validated at boundaries?** API endpoints validate before processing
- [ ] **Type checking?** TypeScript/Pydantic models enforce types
- [ ] **Size limits?** File uploads, request bodies have max sizes
- [ ] **Sanitized?** User input escaped to prevent injection

**Example:**
```python
# ❌ Bad - Assumes valid input
def create_week(week_of):
    return storage.create(week_of)

# ✅ Good - Validates at boundary
def create_week(week_of):
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', week_of):
        raise ValueError("Invalid date format")
    return storage.create(week_of)
```

---

### 6. Observability
- [ ] **Metrics tracked?** Key operations have counters/timers
- [ ] **Logs structured?** JSON logs with context (user_id, request_id, etc.)
- [ ] **Health check endpoint?** `/health` returns service status
- [ ] **Can answer "What failed?"** Logs include enough context to debug

**Example:**
```python
# ❌ Bad - Useless log
logger.info("Error occurred")

# ✅ Good - Actionable log
logger.error("Failed to create meal plan", extra={
    "user_id": user_id,
    "week_of": week_of,
    "error": str(e),
    "duration_ms": elapsed
})
```

---

### 7. Concurrency Safety
- [ ] **No shared mutable state?** Each request has isolated state
- [ ] **Database transactions?** Concurrent writes use proper locking
- [ ] **Ordering assumptions avoided?** Code doesn't assume event sequence
- [ ] **Race conditions considered?** Critical sections are protected

**Example:**
```python
# ❌ Bad - Shared mutable state
cache = {}  # Global dict modified by all requests

# ✅ Good - Request-scoped state
def handle_request():
    cache = {}  # Local to this request
    # OR use thread-safe data structures
```

---

### 8. Startup & Dependencies
- [ ] **Lazy loading?** Optional features don't block startup
- [ ] **Dependency checks?** Critical services verified at startup
- [ ] **Graceful startup?** App starts even if some features are degraded
- [ ] **No circular dependencies?** Modules can initialize independently

---

## 🎯 Priority Levels

### P0 (Must Have Before Production)
1. Timeouts on all external calls
2. Idempotency for all write operations
3. Input validation at API boundaries
4. Error logging with context
5. Health check endpoint

### P1 (Should Have for Scale)
6. Circuit breakers around fragile services
7. Connection pooling discipline
8. Bounded concurrency
9. Rate limiting
10. Resource caps (memory, disk, queue size)

### P2 (Nice to Have for Maturity)
11. Distributed tracing
12. Metrics dashboards
13. Automated alerting
14. Chaos engineering tests
15. Load testing

---

## 📊 Current System Audit

### ✅ What We Have
- Retries with exponential backoff (Phase 32)
- Global error handler
- Structured API responses
- TypeScript type safety on frontend
- Supabase connection pooling (implicit)

### ⚠️ What We're Missing (High Priority)
1. **No timeouts** - Database calls can hang forever
2. **Partial idempotency** - Some endpoints are idempotent, others aren't
3. **No circuit breakers** - Repeated failures to Supabase could cascade
4. **No rate limiting** - Single user could overwhelm the system
5. **No explicit health checks** - `/api/health` exists but doesn't check dependencies

### 📝 Recommended Next Steps

**Phase 33: Production Hardening**
1. Add timeouts to all `execute_with_retry()` calls (1hr)
2. Audit write endpoints for idempotency (2hr)
3. Implement circuit breaker for Supabase calls (2hr)
4. Add rate limiting middleware (1hr)
5. Enhance `/api/health` to check database connectivity (30min)

**Total Effort:** ~6.5 hours to move from "Level 1" to "Production-Grade"

---

## 🔗 Integration with Workflow

### Add to `CLAUDE.md`
```markdown
## Code Review Standards

Before approving any PR, verify:
1. All external calls have timeouts
2. Write operations are idempotent
3. Errors are logged with context
4. Input is validated at boundaries
5. Resources are properly cleaned up

See `docs/RELIABILITY_CHECKLIST.md` for full checklist.
```

### Add to `/code-review` Workflow
Update `.agent/workflows/code-review.md` to include:
- Run through reliability checklist
- Flag any P0 violations as blocking
- Suggest improvements for P1/P2 items

---

## 📚 Further Reading

- [Google SRE Book - Handling Overload](https://sre.google/sre-book/handling-overload/)
- [AWS Well-Architected Framework - Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/)
- [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Designing Data-Intensive Applications by Martin Kleppmann](https://dataintensive.net/)

---

**Last Updated:** 2026-01-28 (Phase 32)
