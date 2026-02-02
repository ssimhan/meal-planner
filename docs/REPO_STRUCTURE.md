# Repository System architecture and file organization reference.

## Documentation
- `docs/USER_GUIDE.md`: Non-technical "How To" guide
- `docs/project_roadmap.md`: Automation setup and implementation status
- `docs/PROJECT_HISTORY.md`: Development journey and key decisions
- `docs/DEVELOPER_GUIDE.md`: Developer setup, deployment, and CI/CD
 for the meal-planner repository.

---

## Directory Structure

```
meal-planner/
├── README.md                    # Project overview
├── CLAUDE.md                    # AI assistant instructions
├── CONTRIBUTING.md              # Contribution guide
├── mealplan                     # Main CLI tool
├── requirements.txt             # Python dependencies
│
├── .agent/                      # Agent workflows and skills
├── .github/                     # GitHub configuration
├── .interface-design/           # Design tokens and UI system
│
├── api/                         # Vercel serverless functions (Python)
│   ├── routes/                  # API endpoints
│   └── utils/                   # Shared backend utilities
│
├── docs/                        # Project documentation
│   ├── archive/                 # Legacy history and docs
│   ├── BUGS.md                  # Active bug tracker
│   ├── DEVELOPER_GUIDE.md       # Setup & Deployment guide
│   ├── PROJECT_HISTORY.md       # Development journey
│   ├── project_roadmap.md       # Phased roadmap
│   └── REPO_STRUCTURE.md        # (this file)
│
├── scripts/                     # Python automation & CLI logic
│   ├── mealplan.py              # CLI entry point
│   ├── workflow.py              # State management
│   └── ... (automation helpers)
│
├── src/                         # Next.js frontend (TypeScript)
│   ├── app/                     # App router pages
│   ├── components/              # UI components
│   └── lib/                     # Frontend utilities & API client
│
├── public/                      # Static assets & generated plans
├── recipes/                     # Recipe database (Markdown/YAML)
├── data/                        # Local data caches
├── supabase/                    # Database migrations & seeds
└── tests/                       # Test suites (Pytest/Jest)
```

---

## File Organization Principles

| Directory | Purpose | Persistence |
|-----------|---------|-------------|
| Root | Core docs, CLI tool, config | Permanent |
| `.github/workflows/` | Automation workflows | Permanent |
| `docs/` | User-facing documentation | Permanent |
| `scripts/` | Python automation | Permanent |
| `recipes/` | Recipe database | Permanent |
| `data/` | Historical tracking | Permanent |
| `templates/` | HTML templates | Permanent |
| `inputs/` | Weekly constraints | **Temporary** - delete after plan generated |
| `plans/` | Generated meal plans | Permanent (archive) |
| `public/` | Static assets for Vercel | Auto-generated |
| `src/` | Next.js frontend code | Permanent |
| `api/` | Vercel serverless functions | Permanent |

---

## File Naming Conventions

**Weekly files:**
- Input: `YYYY-MM-DD.yml` (e.g., `2026-01-05.yml`)
- Plan: `YYYY-MM-DD-weekly-plan.html` (e.g., `2026-01-05-weekly-plan.html`)

**Recipe files:**
- Format: `Recipe Name.html`
- Example: `Chana Masala (IP).html`

---

## Maintenance

**After finalizing a meal plan:**
- Delete `inputs/YYYY-MM-DD.yml` (no longer needed)

**When adding new content:**
- Scripts → `scripts/`
- Documentation → `docs/`
- Templates → `templates/`
- Recipes → `recipes/raw_html/` + update `recipes/index.yml`
