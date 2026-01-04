# Deploying to Vercel: Step-by-Step Guide

## Prerequisites
- A GitHub account with your `meal-planner` repository
- A Vercel account (free tier is fine)

## Step 1: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

## Step 2: Import Your Repository
1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find `meal-planner` and click **"Import"**

## Step 3: Configure Build Settings
Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-filled)
- **Install Command**: `npm install`

Click **"Deploy"** at the bottom.

## Step 4: Set Environment Variables (Optional)
If you want the Python API to commit changes back to GitHub (for inventory/history updates):

1. After deployment, go to your project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add a new variable:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: [Create a Personal Access Token from GitHub Settings → Developer Settings → Personal Access Tokens]
   - **Scope**: Production, Preview, Development

## Step 5: Verify Deployment
1. Vercel will build and deploy your app (takes 1-2 minutes)
2. You'll get a URL like `https://meal-planner-xyz.vercel.app`
3. Click the URL to see your new dashboard!

## Step 6: Connect Custom Domain (Optional)
1. In your Vercel project, go to **"Settings"** → **"Domains"**
2. Add your custom domain (e.g., `mealplanner.yourdomain.com`)
3. Follow Vercel's DNS configuration instructions

## Troubleshooting
- **Build fails**: Check the build logs in Vercel dashboard
- **API not working**: Ensure `requirements.txt` is at the root and includes `flask` and `flask-cors`
- **Python errors**: Vercel automatically installs Python dependencies from `requirements.txt`

## Next Steps
- Every push to your `main` branch will auto-deploy
- Pull requests create preview deployments
- Monitor deployments in the Vercel dashboard
