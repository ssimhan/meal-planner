# Local Development Setup

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. Create `.env` file (optional):
   ```bash
   cp .env.example .env
   # Edit .env to add your GITHUB_TOKEN if needed
   ```

3. Start development servers:
   ```bash
   npm run dev:full
   ```

4. Open dashboard:
   ```
   http://localhost:3000
   ```

## Testing Changes Locally

**Before pushing to GitHub/Vercel:**

1. Make your code changes
2. Test in local dev environment (http://localhost:3000)
3. Verify API endpoints work (http://localhost:5328/api/status)
4. Only push when confirmed working locally

This avoids hitting Vercel's build rate limits.

## Environment Detection

The app automatically detects environment:
- **Local:** Uses local YAML files directly
- **Vercel:** Uses GitHub API as source of truth

Detection: `os.environ.get('VERCEL') == '1'`

## Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js only (port 3000) |
| `npm run dev:api` | Python API only (port 5328) |
| `npm run dev:full` | Both services together ✅ |
| `./scripts/dev.sh` | Modern unified dev startup |

## Troubleshooting

**API not connecting?**
- Check Python API is running on port 5328
- Visit http://localhost:5328/api/status
- Check for errors in Python terminal

**Changes not showing?**
- Frontend changes: Auto-reload via Next.js
- API changes: Restart `python3 api/index.py` (debug=True enables hot reload)

**GitHub API errors locally?**
- GITHUB_TOKEN is optional for local dev
- Set in `.env` only if you need to commit changes via API

## Best Practices

### Avoiding Vercel Rate Limits
- ✅ Test all changes locally before pushing
- ✅ Batch multiple fixes into single commit
- ✅ Use `git commit --amend` to update commits without new builds
- ✅ Wait for Vercel deployment confirmation before pushing again
- ❌ Don't push "test" commits to trigger deployments
- ❌ Don't rely on Vercel preview for testing basic functionality

### When to Push to Vercel
- ✅ Feature complete and tested locally
- ✅ Bug fix verified in local environment
- ✅ Ready for production deployment
- ❌ "Let me see if this works" experiments (use local dev!)

## Development Workflow

1. **Always test locally first** using `npm run dev:full`
2. **Only push to GitHub** when changes work locally
3. **Check both services** - Frontend (3000) and API (5328) must both be running
4. **Verify in browser** before committing changes

**Time saved:** ~15-30 minutes per day by testing locally vs waiting for Vercel deployments + hitting rate limits
