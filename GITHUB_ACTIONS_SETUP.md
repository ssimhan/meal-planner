# GitHub Actions Setup Guide

## Issue: GitHub Actions Cannot Create Pull Requests with Default Token

GitHub Actions has a security restriction: the default `GITHUB_TOKEN` cannot create pull requests that would trigger other workflows. This prevents recursive workflow triggers.

**Error you'll see:**
```
GitHub Actions is not permitted to create or approve pull requests.
```

## Solution: Create a Personal Access Token (PAT)

### Step 1: Create a Fine-Grained Personal Access Token

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
   - Direct link: https://github.com/settings/tokens?type=beta

2. Click **"Generate new token"**

3. **Configure the token:**
   - **Token name:** `meal-planner-workflow` (or any name you prefer)
   - **Expiration:** 1 year (or custom duration)
   - **Repository access:** Select "Only select repositories"
     - Choose: `ssimhan/meal-planner`

4. **Permissions** (Repository permissions):
   - **Contents:** Read and write
   - **Pull requests:** Read and write
   - **Workflows:** Read and write (needed to trigger the generate workflow)

5. Click **"Generate token"**

6. **IMPORTANT:** Copy the token immediately - you won't be able to see it again!

### Step 2: Add Token as Repository Secret

1. Go to your repository: https://github.com/ssimhan/meal-planner

2. Click **Settings** → **Secrets and variables** → **Actions**

3. Click **"New repository secret"**

4. **Configure the secret:**
   - **Name:** `PAT_TOKEN` (must match the workflow file)
   - **Secret:** Paste the token you copied in Step 1

5. Click **"Add secret"**

### Step 3: Verify Setup

The workflow file already references `${{ secrets.PAT_TOKEN }}`, so once you add the secret, the workflow should work.

**Test it:**
1. Go to: https://github.com/ssimhan/meal-planner/actions/workflows/weekly-plan-start.yml
2. Click "Run workflow" → "Run workflow" button
3. Expected outcome: Creates a PR successfully

## Why This is Needed

- **Default `GITHUB_TOKEN`:** Limited permissions, cannot trigger other workflows
- **Personal Access Token (PAT):** Acts with your permissions, can create PRs that trigger workflows
- **Security:** Fine-grained tokens limit access to only this repository with specific permissions

## Security Best Practices

1. **Use fine-grained tokens** (not classic tokens) - better security
2. **Limit scope** to only the repositories and permissions needed
3. **Set expiration** - rotate tokens periodically
4. **Never commit tokens** to the repository (always use secrets)

## Workflows That Need This

- ✅ `weekly-plan-start.yml` - Creates PR with farmers market suggestions
- ✅ `weekly-plan-generate.yml` - Triggered by PR merge (no token needed)
- ✅ `daily-checkin-create.yml` - Creates issues (works with default token)
- ✅ `daily-checkin-parse.yml` - Triggered by comments (works with default token)

Only the weekly planning workflow needs the PAT because it creates PRs.

## Troubleshooting

**If you see "Secret not found" error:**
- Make sure the secret name is exactly `PAT_TOKEN` (case-sensitive)
- Verify the secret is in the correct repository
- Check that the token hasn't expired

**If PRs still don't trigger workflows:**
- Verify the token has "Workflows: Read and write" permission
- Check that the token is for a fine-grained token (not classic)
- Ensure the token is for your account (not an organization token)

## Alternative: Simplified Workflow (No PR)

If you prefer not to use a PAT, we can simplify the workflow to commit directly to main without PRs:

1. Skip the PR step
2. Commit input file directly to main
3. User edits file on main branch
4. Run generation manually or on schedule

This is simpler but loses the review-before-merge workflow. Let me know if you prefer this approach.
