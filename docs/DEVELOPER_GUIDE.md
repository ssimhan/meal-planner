# Developer Guide

This guide consolidates all information needed to develop, test, and deploy the Meal Planner application.

## Table of Contents
1. [Local Development](#local-development)
2. [Vercel Deployment](#vercel-deployment)
3. [GitHub Actions & CI/CD](#github-actions--cicd)

---

## Local Development

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. **Create `.env` file (optional):**
   ```bash
   cp .env.example .env
   # Edit .env to add your GITHUB_TOKEN if needed
   ```

3. **Start development servers:**
   ```bash
   npm run dev:full
   ```

4. **Open dashboard:**
   Navigate to `http://localhost:3000`

### Testing Changes Locally

**Before pushing to GitHub/Vercel:**

1. Make your code changes
2. Test in local dev environment (`http://localhost:3000`)
3. Verify API endpoints work (`http://localhost:5328/api/status`)
4. Only push when confirmed working locally

This avoids hitting Vercel's build rate limits.

### Environment Detection

The app automatically detects the environment:
- **Local:** Uses local YAML files directly
- **Vercel:** Uses GitHub API as source of truth for writing, but reads from Vercel's filesystem (deployment bundle).

Detection logic: `os.environ.get('VERCEL') == '1'`

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js only (port 3000) |
| `npm run dev:api` | Python API only (port 5328) |
| `npm run dev:full` | Both services together ✅ |
| `./scripts/dev.sh` | Modern unified dev startup |

### Troubleshooting Local Dev

**API not connecting?**
- Check Python API is running on port 5328
- Visit http://localhost:5328/api/status
- Check for errors in Python terminal

**Changes not showing?**
- Frontend changes: Auto-reload via Next.js
- API changes: Restart `python3 api/index.py` (debug=True enables hot reload for API in most cases)

**GitHub API errors locally?**
- `GITHUB_TOKEN` is optional for local dev unless you want to test write operations that commit to the repo.
- Set in `.env` only if you need to commit changes via API.

---

## Vercel Deployment

### Prerequisites
- A GitHub account with your `meal-planner` repository
- A Vercel account (free tier is fine)

### Step 1: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** -> **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account

### Step 2: Import Your Repository
1. Once logged in, click **"Add New..."** → **"Project"**
2. Find `meal-planner` and click **"Import"**

### Step 3: Configure Build Settings
Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-filled)
- **Install Command**: `npm install`

Click **"Deploy"**.

### Step 4: Set Environment Variables (Optional)
To allow the Python API to commit changes back to GitHub (for inventory/history updates):

1. Go to project **"Settings"** → **"Environment Variables"**
2. Add a new variable:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: [Personal Access Token from GitHub Settings]
   - **Scope**: Production, Preview, Development

### Step 5: Verify Deployment
1. Vercel will build and deploy (1-2 mins).
2. Visit your new URL (e.g., `https://meal-planner-xyz.vercel.app`).

### Step 6: Connect Custom Domain (Optional)
1. Go to **"Settings"** → **"Domains"**.
2. Add your custom domain and follow DNS instructions.

### Troubleshooting Deployment
- **Build fails**: Check build logs in Vercel dashboard.
- **API not working**: Ensure `requirements.txt` is at root.

---

## GitHub Actions & CI/CD

### Issue: Recursive Workflow Triggers

The default `GITHUB_TOKEN` cannot create pull requests that trigger other workflows. To allow workflows like "Weekly Plan Start" to create PRs that then trigger "Plan Generate", you need a Personal Access Token (PAT).

### Step 1: Create a Fine-Grained Personal Access Token (PAT)

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**.
2. Click **"Generate new token"**.
3. **Configure:**
   - **Name:** `meal-planner-workflow`
   - **Repository access:** Only `ssimhan/meal-planner`
4. **Permissions:**
   - **Contents:** Read and write
   - **Pull requests:** Read and write
   - **Workflows:** Read and write
5. **Generate** and copy the token.

### Step 2: Add Token as Repository Secret

1. Go to repo **Settings** → **Secrets and variables** → **Actions**.
2. Click **"New repository secret"**.
3. **Name:** `PAT_TOKEN` (must match workflow file).
4. **Secret:** Paste your PAT.
5. Click **"Add secret"**.

### Workflows That Need This

- ✅ `weekly-plan-start.yml` - Creates PR with farmers market suggestions.

Other workflows like `daily-checkin` work with the default token.

### Troubleshooting CI/CD

**"Secret not found" error:**
- Ensure secret name is exactly `PAT_TOKEN`.

**PRs don't trigger workflows:**
- Verify token has "Workflows: Read and write" permission.
- Ensure it is a fine-grained token or classic token with `workflow` scope.

## Documentation Standards

To maintain a clean and effective documentation workflow, please adhere to the following rules:

### 1. docs/BUGS.md
**Sole Purpose:** Tracking active issues and technical debt that must be resolved before the current phase is complete.

*   **Strict Categories:** Only use **Active Bugs** and **Technical Debt**.
*   **No Other Subcategories:** Do not add sections like "Guidelines", "Audit Log", "Future Ideas", or "Notes". Keeping this file clean ensures we focus on the "Zero-Debt Policy".
*   **Handling Resolved Issues:** Once an issue is fixed, remove it from this file. If you wish to keep a record, move it to .

### 2. docs/project_roadmap.md
**Sole Purpose:** Tracking feature implementation status for the current execution block.

*   **Features Only:** All new features, blocks of work, and functional requirements go here.
*   **Checklist Format:** Use the existing checkbox format to track progress.

### 3. docs/PROJECT_HISTORY.md
**Sole Purpose:** Historical record of what was done.

*   **Audit Logs:** Move completed items from  here at the end of a phase.
*   **Design Decisions:** Document major architectural shifts or learnings here.
