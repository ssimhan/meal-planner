# From Static to Interactive: Migrating a Meal Planner from GitHub Pages to Vercel

ssimhan
Jan 10, 2026

Two weeks ago, I wrote about [building a meal planning system](meal-planner-teardown.md) that actually works for busy parents. The system used GitHub Actions to generate static HTML plans on a schedule, hosted on GitHub Pages.

It worked. But every time I wanted to log what we actually ate, I had to open my laptop, navigate to a GitHub Issue, fill out checkboxes, and wait for automation to run. I was excited to use it on Monday but by Wednesday, it was super annoying. 

So I rebuilt it. Same system, different architecture. GitHub Actions → Vercel serverless. Static HTML → interactive dashboard. Manual logging → one-tap feedback.

This is the story of that migration.

## The Problem with Static HTML

The original system generated beautiful HTML plans every Saturday morning. I could view them on my phone. They included groceries, prep schedules, and meal details.

But they were **read-only**. To track what we actually made:

1. Open GitHub on my phone
2. Find the Daily Check-in Issue template
3. Fill checkboxes for each meal
4. Submit the issue
5. Wait for GitHub Actions to parse it and update `history.yml`
6. Hope I remembered to do this before planning next week

**The friction was real.** I procrastinated on logging which made it that much harder to keep track of things. The system would recommend recipes we'd already made because it thought we hadn't. The anti-repetition logic broke down.

The insight: **Static generation is great for content that doesn't change. Meal plans need to respond to execution reality.**

## Why Vercel (Not Just "A Web App")

I didn't need a full web app with a database (yet). I needed:

- **Real-time state updates** (mark dinner as made → immediately affects replanning)
- **GitHub as database** (keep YAML files, version control, no migrations)
- **Mobile-first UI** (because I'm not opening my laptop at 7pm on Thursday just to see what I'm supposed to make)
- **Zero server maintenance** (I'm a marketer, not a DevOps engineer)

Vercel serverless gave me all of this:

**Python API functions** (`/api/generate-plan`, `/api/log-meal`) that read/write GitHub directly via API
**Next.js frontend** with React + Tailwind for interactive UI
**GitOps persistence** – every state change is a git commit
**Free hosting** ($0/month on Hobby tier)

The tradeoff: Read-only filesystem. All writes go through GitHub API. But that's actually a feature – every change is version-controlled.

## The Build Process

### Day 1: Initial Migration (Jan 4, 2026)

**Goal:** Get something deployed, prove Vercel works.

**Built:**
- Basic Next.js app with my lovely Solarpunk theme (earth tones, device-friendly)
- Python API bridge in `/api` directory
- Single button: "Generate Plan"
- Refactored `workflow.py` for serverless (no local file writes)

**Stumbling block:** Vercel's read-only filesystem. My scripts assumed they could write to `data/history.yml` locally, then commit later.

**Solution:** Every data mutation goes directly to GitHub API. Instead of writing files locally, every change commits directly through GitHub's API with a message like "Log meal: Tuesday dinner."

Result: Working dashboard deployed to Vercel, generating plans on-demand.

### Days 2-3: Interactive Workflows (Jan 4-5)

**Built:**
- "Start New Week" button (proposes vegetables based on seasonality)
- "Confirm Vegetables" (after farmers market shopping)
- "Generate Plan" (creates full weekly HTML plan)
- Daily check-in cards (log what we made, kids' feedback)

**Decision:** State machine in `inputs/workflow-state.yml`

States: `idle` → `proposed` → `confirmed` → `plan_ready` → `active` → `archived`

The dashboard reads this file to show the right buttons. Clicking "Start New Week" transitions `idle` → `proposed`. The system always knows what action comes next.

**Learning:** Explicit state machines beat implicit assumptions. When state lived only in my head, I'd forget what step I was on. If I'm trying to get the app to truly help, I need to outsource ALL the thinking not just bits. 

### Days 4-5: Real-Time Feedback (Jan 5-6)

This is where it got interesting.

**The problem:** I'd log "Made: Yes" for Tuesday dinner, but Wednesday's dashboard still showed Tuesday as incomplete. Stale data.

**Root cause:** API endpoints returned success messages but not updated state. Frontend displayed cached data.

**Solution:** Every mutation endpoint returns the complete updated state. When you log a meal, the API response includes the entire current status (workflow state, completed meals, inventory, everything). Frontend immediately updates from response data. No refetch needed.

**Impact:** Logging dinner Tuesday night → Wednesday morning dashboard shows it as complete. Zero lag.

### Days 6-7: Advanced Features (Jan 6-7)

**Built:**

**Prep task tracking:** Recipes now include `## Prep Steps` section. System extracts tasks ("Chop vegetables for Monday-Wednesday dinners"), generates checkboxes, persists completion in `history.yml`.

**Meal swapping:** Made Thursday's dinner on Tuesday instead? Two-click swap (select Thursday, select Tuesday, auto-regenerates prep schedule).

**Inventory intelligence:** Forgot to buy spinach? System suggests replacements scored by what's already in your fridge.

**Leftover pipeline:** Recipes tagged `leftover_potential: high` automatically schedule "Pack leftovers for lunch" in next day's prep.

**Learning:** Learning this lesson (again). Rich metadata enables automation. Tag recipes once (`leftover_potential`, `kid_favorite`, `no_chop_compatible`), query forever.

### Day 8: Architecture Cleanup (Jan 8)

**Problem:** Monolithic files, no types, React hook violations causing crashes.

**Fixed:**
- Extracted 15+ components from 950-line `page.tsx`
- Added 30+ TypeScript interfaces (`Recipe`, `MealPlan`, `WorkflowStatus`)
- Consolidated 25 `useState` hooks into structured state objects
- Split 1400-line `api/index.py` into Flask Blueprints

TypeScript errors: 34 → 7 (79% reduction)

**Learning:** Organic growth creates technical debt. After 11 rapid-iteration vibe coding phases, explicit cleanup time is necessary.

## What I Learned

### Serverless environments need a different mental model

When developing locally, you can read a file, modify it, and write it back. Serverless functions can't do this because each request gets a fresh, temporary filesystem that disappears after the function completes. This forced me to rethink my entire data flow. Instead of assuming files persist between operations, every state change now commits directly to GitHub through their API. The upside is that version control became automatic—every meal I log creates a git commit with a message like "Log Tuesday dinner." Rolling back a mistake is just `git revert`.

The tradeoff is GitHub's API rate limit of 5000 requests per hour, but for a single-family meal planner, I'm using maybe 50 requests per week. The constraint isn't relevant at my scale.

### Returning complete state prevents invisible bugs

My biggest mistake was building APIs that returned success messages without updated data. I'd click "log dinner" on Tuesday, the API would say "success," but Wednesday morning the dashboard still showed Tuesday as incomplete. The frontend was displaying cached data because it had no way to know what changed.

The fix was counterintuitive: make responses bigger, not smaller. When you log a meal, the API now returns everything: workflow state, completed meals, inventory, prep tasks—all in one response. The frontend updates immediately from that data. No refetching, no race conditions, no stale information. One round-trip solves it.

### TypeScript interfaces catch mistakes before users see them

I built the first 11 phases without proper types, using generic placeholders everywhere in the code. By Phase 12, tracking what data looked like across different parts of the system was impossible.

Think of TypeScript interfaces like a contract that defines exactly what your data looks like. When I define a "Recipe" interface, I'm saying: every recipe must have a name (text), an ID (text), an effort level (must be "quick" or "normal" or "complex"), and optionally tags like "kid_favorite" (yes/no). If I try to use a recipe without a name, or spell "effort_level" as "effortlevel," the code won't even run—it fails immediately with a clear error.

Without this, I'd write code that expects recipes to have a "difficulty" field, but the data actually uses "effort_level." The mismatch wouldn't show up until I clicked a button in production and got a cryptic error. With TypeScript, my code editor underlines the mistake in red before I even save the file. It's like spell-check for code structure.

The bigger benefit is that interfaces serve as living documentation. When another part of the system asks "what fields does a meal plan have?", I can look at the `MealPlan` interface and see the exact structure. It never gets outdated because the code won't compile if the interface doesn't match reality.

### Feedback loops need to be faster than human memory

With the GitHub Issues approach, I'd log meals two days later and misremember details. Did the kids take chesse cubes to school on Mon or grapes? I honestly couldn't recall. With the dashboard, I log immediately after dinner each night while reactions are fresh. Better data leads to better future plans—the system learns what actually works, not what I think worked.

This insight extends beyond meal planning. Any life management tool needs mobile-first design because you're never opening a laptop at 7pm on Thursday just to check what's for dinner. Desktop is for building systems. Mobile is for living with them.

### Progressive disclosure reduces decision paralysis

The early dashboard showed 12 buttons simultaneously. I'd stare at the screen trying to figure out which one to click. The current version uses a state machine to show only 1-2 relevant actions based on where you are in the workflow. You can't click "Confirm Vegetables" until you've clicked "Start New Week." The interface guides you through the natural sequence instead of presenting all options at once.

## What This Cost

**Development time:** 8 days (Jan 4-11), ~4 hours/day = 32 hours total

Yes I spent a lot of time after the kids went to bed this week. 

**Ongoing maintenance:** ~2 minutes/day (one-tap logging), 5 minutes/week (confirming vegetables)

**Money:** Still $20/month (just Claude subscription). Vercel Hobby tier is free.

**Value created:**
- 90% reduction in logging friction (GitHub Issues → one-tap)
- Real-time state updates (no stale data)
- Meal swapping on the fly (Tuesday → Thursday dinner swap in 10 seconds)
- Inventory intelligence (smart replacements when ingredients missing)

## Migration Decision Framework

### When to Stay Static (GitHub Pages)

- Content rarely changes (blog posts, documentation)
- No user input needed (portfolios, landing pages)
- Read-only is acceptable
- Want maximum simplicity

### When to Go Serverless (Vercel)

- State changes frequently (meal logging, inventory updates)
- Need real-time feedback (did this action work?)
- Mobile interactions critical
- Want zero server maintenance

### When to Go Full App (Traditional hosting)

- Complex database queries (joins, aggregations)
- Heavy computation (video processing, ML inference)
- Thousands of users
- Need WebSockets/real-time collaboration

For personal tools with <10 users and simple state, serverless is the sweet spot.

## The Technical Architecture

**Frontend:** Next.js + React for the dashboard, inventory tracking, and recipe browser.

**Backend:** Python serverless functions handling workflow state, meal logging, inventory updates, and recipe queries.

**Data Layer:** YAML files in GitHub acting as the database. Meal history, inventory, weekly constraints, and 227 recipes all stored as plain text files.

**Flow:** All state changes commit directly to GitHub via API → Vercel sees updated data on next request.

## Mistakes I Made

**Mistake #1: Assumed Filesystem Persistence**

Early code wrote to `/tmp`, assumed it persisted between requests. It doesn't. Every function invocation gets a fresh filesystem.

Fix: GitHub API for all writes. `/tmp` only for function-scoped temp files.

**Mistake #2: Returned Success Messages Instead of State**

API: `{"success": true}`. Frontend: "Did it work? Better refetch status to be sure."

Fix: All mutations return full updated state. One API call, atomic update.

**Mistake #3: Added Features Before Stabilizing Types**

Built 11 phases of features with loose TypeScript (`any` everywhere). By Phase 12, tracking state flow was impossible.

Fix: Should have added interfaces by Phase 8. Technical debt compounds.

## What I'd Do Differently Next Time

**Start with types.** Define `WorkflowStatus`, `Recipe`, `MealPlan` interfaces in Phase 1, enforce them. TypeScript errors caught at compile time beat runtime debugging.

**Design API contract first.** Document endpoint shapes in OpenAPI before writing code. Prevents "what does this endpoint return?" confusion.

**Test state transitions explicitly.** The state machine (`idle` → `proposed` → `confirmed` → `active`) had implicit assumptions. Should have written state transition tests early.

**Keep component extraction ongoing.** Waiting until 950-line monolith before extracting components was painful. Extract more frequently (maybe every 200-300 lines)

## For Non-Coders: What This Means

The original teardown covered three core lessons: understand your problem deeply before automating, write clear instructions for AI, and work iteratively. This migration reinforced those lessons and added new ones.

**Understanding your problem** meant living with the GitHub Issues workflow for two weeks before migrating. I didn't rebuild because static HTML was insufficient. I rebuilt because logging friction was causing me to skip days, which broke the anti-repetition logic. The friction was observable, measurable, and painful.

**Clear instructions** evolved from my `CLAUDE.md` file (the operating manual for Claude Code) to include serverless constraints. I added: "Vercel has a read-only filesystem—all writes must go through GitHub API." Claude handled the implementation. My job was understanding and articulating the constraint.

**Iterative work** meant deploying Day 1 with a single "Generate Plan" button, not waiting until the full dashboard was ready. Each phase delivered working software. When Day 4's stale data problem surfaced, I could fix it in isolation rather than debugging a monolithic system.

**New lesson: Test on the device you'll actually use.** This time around I built on desktop but tested on my phone constantly. The "Confirm Vegetables" button that looked fine on a 27" monitor was impossible to tap accurately on my Pixel while actually making dinner. Mobile testing revealed the real usability issues.

**New lesson: Make feedback immediate.** The GitHub Issues workflow had a 2-minute delay between logging a meal and seeing the update. The dashboard updates in under a second. That psychological difference—instant confirmation versus "did it work?"—changed my compliance from 60% to 100%.

**The skill you need isn't coding**—it's understanding systems deeply enough to describe them clearly, testing implementations against real-world use, and iterating when theory meets practice. Claude Code handles the technical complexity. You handle the human complexity.

## Success Metrics: How I Know It Works

**Logging compliance:** 100% (up from ~60% with GitHub Issues)
**Time to log meal:** 5 seconds (down from 2+ minutes)
**State consistency:** Zero stale data (was frequent with static HTML)
**Meal swaps:** 3 swaps/week average (was impossible before)
**Evening stress:** Still minimal (Thu/Fri no-prep days preserved)
**Freezer backup:** 3 meals maintained (auto-tracked)

The system still respects the core design: energy-based prep (Monday → Friday depletion), evening protection (5-9pm device-free), farmers market integration.

But now it **responds to reality**. When plans change (and they always do), the system adapts.

## What's Next

Current limitations I'm working on:

**Authentication:** Right now, anyone with the URL can use the system. Adding Supabase auth + family profiles (Phase 14.1 in progress).

**Multi-user logging:** My husband should be able to log meals too. Need collaborative state management.

**Analytics dashboard:** Time to surface trends (which recipes are hits? which vegetables do we actually eat?).

**Recipe recommendations:** ML-powered suggestions based on history, season, and fridge contents.

But the core architecture is solid. Serverless + GitOps + mobile-first will scale to these features.

## Thinking About Going Serverless?

If you've built a prototype with GitHub Actions or a local script and are hitting friction, here's how to think about serverless migration:

**Recognize the signal.** For me, it was logging compliance dropping from 100% to 60%. The system worked technically but failed practically. When manual steps feel painful repeatedly, that's the signal to automate differently.

**Start with one interaction.** I didn't migrate everything at once. Day 1 was just "Generate Plan" button. Day 2 added "Start New Week." Each piece worked independently. This meant I could test on my phone after each addition, not after rebuilding the entire system.

**Expect serverless to break local assumptions.** The read-only filesystem surprised me. So did API rate limits. So did function cold starts. None of these mattered locally. Serverless constrains differently than local development—test early, test on the real platform.

**Keep data in Git if you can.** Using GitHub as a database meant I could revert mistakes (`git revert`), see exactly when something changed (`git log`), and avoid database migrations entirely. The tradeoff is API rate limits, but for personal tools with <100 requests/day, it's irrelevant.

**Mobile test obsessively.** A button that's fine on desktop can be unusable on mobile. Since I use this system on my phone 95% of the time, mobile testing caught 80% of my UX issues. Build on desktop, test on mobile, fix what's actually broken.

**Make one thing excellent before adding more.** Meal logging works perfectly now—5 seconds, zero friction, instant feedback. I could add analytics dashboards and ML recommendations, but they won't matter if logging is still annoying. Nail the core interaction first.

---

**Live site:** [meal-planner.vercel.app](https://ssimhan.github.io/meal-planner) (authentication coming soon)

**Code:** [github.com/ssimhan/meal-planner](https://github.com/ssimhan/meal-planner)

Subscribe to **The Accidental Engineer** for more project breakdowns and lessons learned from building without a CS degree.
