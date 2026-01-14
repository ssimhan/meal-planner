# Known Bugs & Planned Improvements

**Last Updated:** 2026-01-13  
**Source:** Extracted from implementation plans across `phase-23-ux-refinement`, `phase-23`, and `phase-25` branches.

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Fixed/Completed |
| [ ] | Open - Not Started |
| 🔄 | In Progress |

---

## Previously Fixed Bugs (Reference)

These bugs were documented and fixed in Phase 23 / 23.5:

### UI & Dark Mode
- ✅ **Dark Mode Contrast/Legibility** - Glassmorphism variable updates needed (Phase 23.5 Block 1)
- ✅ **Dashboard "System" Card Clutter** - Simplified by removing clutter (Phase 23.5 Block 1)
- ✅ **Prep Task Visibility** - Refined to show Today/Overdue only (Phase 23.5 Block 1)
- ✅ **Week View Visual Cues** - Added shadows/badges for completed days (Phase 23.5 Block 1)
- ✅ **JSX Parsing Errors** - Fixed JSX parsing errors in wizard guidance (Phase 23 Block 4)

### Week at a Glance
- ✅ **Missing Meal Plan Data** - Backend resolution logic fix (Phase 23.5 Block 3)
- ✅ **"Save Changes" Failure** - Fixed failure when replacing a meal (history data integrity) (Phase 23.5 Block 3)

### Data & Backend
- ✅ **Date Bugs (4-week view)** - Known date bugs fixed (Phase 23 Block 4)
- ✅ **Supabase Edge Cases** - Internalized error handling for `PGRST116` (Phase 23 Block 4)

### Settings
- ✅ **"Meal Defaults" Read-Only** - Made section fully editable (Phase 23.5 Block 5)

---

## Open Bugs & Improvements

### Priority: High

#### Dashboard / Main Page
- [ ] **Confirmation Page Prompt** - Daily 6 PM banner on main page to confirm snacks, lunch, and dinner for that day (similar to wizard)

#### Plan Generation
- ✅ **Plan Draft Error** - `/api/plan/draft` returns 500 error: `'selections' is not defined` when generating a plan in wizard (Fixed: missing variable extraction)
- ✅ **Shopping List Rendering Error** - Shopping list step threw "Objects are not valid as React child" error because API returns `{item, store}` objects but UI expected strings (Fixed: normalized items and added store grouping)

### Priority: Medium

#### New Week Wizard
- [ ] **Separate Pages for Dinners and Snacks** - Wizard should have distinct pages for each meal type
- [ ] **Leftovers Quantity Input** - Leftovers question should ask for number of servings (not just yes/no)
- [ ] **Inventory Page Organization** - Update inventory page should have separate sections for meals vs. veggies, and specify quantity of servings for meals vs. quantity/number for veggies
- [ ] **"Use Up Leftovers" Page** - Should list all leftover meals and allow assignment to specific days
- [ ] **Pause Workflow Capability** - Way to "pause" the workflow after tentative plan creation for shopping, then return to update

#### Recipe Index
- [ ] **Standardization** - Need to standardize recipe tags, cuisines, and metadata across all recipes

#### Authentication & Multi-User (Phase 24/25 In Progress)
- [ ] **Legacy Cleanup** - Move/Archive local variables `data/*.yml` and `config.yml`
- [ ] **Auth Caching** - Optimize `require_auth` to reduce DB hits for `household_id`
- [ ] **Member Management** - UI to view household members in Settings
- [ ] **Invite Flow** - Generate "Join Code" or Email Invite for spouses/partners
- [ ] **Empty States** - Ensure Dashboard/Inventory look good with zero data
- [ ] **Onboarding Wizard** - Guided setup for new user profiles and preferences

### Priority: Low / Future Ideas

- [ ] **Freezer Ingredients Tracking** - Track ingredients stored in freezer (not just meals)
- [ ] **Advanced Analytics** - More detailed usage analytics and trends
- [ ] **Nutrition Estimation** - Estimate nutritional content from recipes

---

## Notes

1. **Phase 24 & 25 Work** - Authentication and multi-household features were started on `phase-23`/`phase-25` branches but reverted. The work is preserved in those branches if needed later.

2. **Stable Baseline** - Current `main` branch is at Phase 23.5 stable (`stable-phase-23-5` tag).

3. **Testing** - See `docs/TEST_PLAN_PHASE_23.md` for existing manual test procedures.

---

## How to Use This Document

1. **Pick an item** from the "Open Bugs & Improvements" section
2. **Create a feature branch** (e.g., `fix/confirmation-banner`)
3. **Mark item as 🔄** when starting work
4. **Mark item as ✅** when merged to `main`
5. **Move to "Previously Fixed Bugs"** section for reference
