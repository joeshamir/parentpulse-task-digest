# Production-Branch Deployment Plan for ParentPulse

## Goal
Stop Railway from auto-deploying on every Lovable push to `main`. Instead, Lovable pushes to `main`, and you manually (or automatically) promote stable commits to a `production` branch that Railway watches.

## How the production branch gets created

1. In your GitHub repo, create a new branch called `production` from the current `main`:
   ```text
   git checkout main
   git pull origin main
   git checkout -b production
   git push -u origin production
   ```
2. This branch will initially contain the exact same code as `main`.
3. Going forward, `main` is the "integration" branch where Lovable continuously pushes edits. `production` is the "release" branch that Railway deploys.

## How Railway knows to only deploy from `production`

1. Open the Railway dashboard for the ParentPulse worker service.
2. Go to the service's **Settings → Source** (or **Triggers / Deploy** section, depending on Railway UI version).
3. Change the tracked branch from `main` to `production`.
4. Save. Railway will now ignore pushes to `main` and only build + deploy when `production` changes.
5. Optional but recommended: turn off **Auto-Deploy** entirely if you want to deploy only when you explicitly click "Deploy" in Railway, even for `production`.

## Recommended promotion workflow

### Option A — Manual promotion (safest for now)
1. Test the latest changes on the Lovable preview (which builds from `main`).
2. When ready, open GitHub and create a Pull Request from `main` → `production`.
3. Review/merge the PR. Railway sees the `production` push and deploys.

### Option B — Auto-promotion via GitHub Action
Add `.github/workflows/promote-to-production.yml` that automatically fast-forwards `production` to `main` under specific conditions (e.g., a manual workflow dispatch, a tagged release, or a scheduled check).

Example manual-dispatch workflow:
```yaml
name: Promote main to production
on:
  workflow_dispatch:
jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      - run: |
          git checkout production
          git merge --ff-only origin/main
          git push origin production
```

## What this changes in the app

- No code changes are strictly required.
- The existing **Restart connector** button in `src/routes/groups.tsx` continues to work, but it should now be used only when the bridge actually needs a hard reset — not as a workaround for every Lovable edit.
- Optionally, we can add a small UI note on the Groups & Settings screen explaining that the worker is tied to the `production` branch and only updates when `production` is promoted.

## Deployment interruption still happens, but on your schedule

Railway still restarts the container when `production` deploys. The difference is that you control when that happens by choosing when to merge/promote, so the WhatsApp bridge does not drop on every Lovable tweak.

## Suggested next steps

1. Create the `production` branch in GitHub.
2. Point Railway's source branch to `production`.
3. Decide whether to use manual PRs or a GitHub Action for promotion.
4. Optionally add a brief in-app explanation of the new bridge update cadence.
