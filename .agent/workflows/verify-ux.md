---
description: Perform an interactive UX audit, verify design consistency, and run automated browser tests.
---

# /verify-ux

Use this workflow when a feature is "code complete" but needs manual or automated verification of the user experience, aesthetics, and edge cases.

## Core Principles
- **Interaction Over Code**: Focus on how the app feels, not just how it's written.
- **State Exhaustion**: Verify the component in every state: Loading, Empty, Success, Error, and Network Lag.
- **Aesthetic Rigor**: No "good enough" UI. Every pixel must align with the **Earthy Spice** system.

## The Process

### 1. Environment Check
// turbo
1. Run `npm run dev:full` to ensure both frontend and backend are active.
2. Open the application at [http://localhost:3000].

### 2. Strategy Choice
Choose the most appropriate verification method:
- **Small Component?** → Use "Manual Triage" (Checklist).
- **Complex Flow?** → Propose and write a **Playwright** script.
- **Design Refresh?** → Run a **Visual Audit** against tokens.

### 3. Automated Verification (Playwright)
If the flow is complex (e.g., Planning Wizard):
1. Create a `tests/e2e/` script using Playwright.
2. Verify critical paths:
   - Happy path (standard user flow).
   - "Back" button behavior.
   - Page refresh persistence.
   - Form validation & error messaging.

### 4. Manual UX Triage (The Checklist)
Generate a markdown checklist in `docs/tests/` (or similar) that covers:
- [ ] **Functional**: Does every button do what it says?
- [ ] **Feedback**: Are there optimistic updates or clear loading indicators?
- [ ] **Content**: Is the microcopy clear? No placeholder text?
- [ ] **Accessibility**: Can you navigate via keyboard? Are `aria-label`s descriptive?

### 5. Design & Responsive Audit
- [ ] **Tokens**: Verify `index.css` variables are used correctly.
- [ ] **Responsiveness**: 
  - Desktop (1280px+)
  - Tablet (768px - 1024px)
  - Mobile (375px - 414px)
- [ ] **Transitions**: Ensure micro-animations are smooth and don't lag.

## Discovery & Fixes
- Any UX polish items or bugs found should be added to `docs/BUGS.md` immediately with the prefix `[UX]`.
- Fix small issues (spacing, color) immediately.
- Document larger interactions for the next iteration.

**Next Step**: Once UX verification is passing, suggest to the user that they should use **`/closeout`** to finalize the phase and push changes.