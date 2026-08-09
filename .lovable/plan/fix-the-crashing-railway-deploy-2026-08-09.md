# Fix the crashing Railway deploy

## What actually went wrong (plain English)

Railway is not running your WhatsApp worker at all. It is running the **main app folder** instead.

The main app folder has a Railway config that tries to start a small web server called `sirv`. That tool was never installed, so Railway tries to launch it, fails instantly with "could not determine executable to run", restarts, and fails again — that is the repeating error loop in your log.

Confirmed in the repo:
- `railway.json` (project root) start command: `npx sirv dist --single --host 0.0.0.0 --port $PORT`
- `sirv` is **not** listed anywhere in the root `package.json` dependencies

So there are two separate problems tangled together:
1. Railway is pointed at the wrong folder (root instead of `worker/`).
2. The root Railway config is broken anyway (missing tool).

## Decision needed: what should Railway host?

Your main app is already live on Lovable Cloud at `parentpulse-task-digest.lovable.app`. You do **not** need Railway to host it too. Railway is only needed for the WhatsApp worker, which must run 24/7.

Recommended: **Railway runs only the worker.**

## The fix

### Step 1: Point the Railway service at the worker folder
In Railway → your service → Settings → **Root Directory**, set it to:

```text
worker
```

This makes Railway read `worker/railway.json` and `worker/package.json` instead of the broken root ones. `worker/railway.json` already has the correct start command (`npm start`) and a restart policy.

### Step 2: Remove the misleading root config
Delete the root `railway.json`, since the root app is not meant to be deployed on Railway. Leaving it there will cause this same crash again if a service ever picks up the root folder.

### Step 3: Add the persistent volume
In Railway → service → Settings → Volumes, add a volume mounted at:

```text
/data
```

This is where the WhatsApp login is saved, so you only scan the QR code once instead of after every deploy.

### Step 4: Set the worker's variables
In Railway → Variables:

| Variable | Value |
|---|---|
| `WORKER_SECRET` | the same value saved in Lovable Cloud secrets |
| `USER_ID` | the parent account UUID |
| `GROQ_API_KEY` | your Groq key (for Hebrew voice notes) |
| `AUTH_DIR` | `/data/auth_session` |
| `INGEST_URL` | `https://parentpulse-task-digest.lovable.app/api/public/ingest-task` |

### Step 5: Redeploy and scan
Redeploy, open the deploy logs, and scan the QR code with WhatsApp → Linked devices.

## Notes
- Do **not** add a Railway healthcheck to this service. The worker listens on no port, so a healthcheck marks every deploy as failed.
- The only file change in this plan is deleting the root `railway.json`. The rest is Railway dashboard configuration you do yourself.
