# Deploy the WhatsApp Worker to Railway (Simple Plan)

## Goal
Get the new `worker/` background process running 24/7 on Railway so it can read WhatsApp group messages and send extracted tasks/summaries to the ParentPulse PWA.

## Why this is separate from the PWA
The worker uses `Baileys`, a Node.js library that must stay running continuously and save WhatsApp login files locally. Lovable Cloud runs short-lived server functions, so the worker needs its own long-running home on Railway.

## Step 1: Create a new Railway project for the worker
- In Railway, create a new project from the same GitHub repo.
- Point Railway at the `worker/` folder as the service root (not the project root).
- This keeps the PWA and worker completely separate.

## Step 2: Add a persistent volume
- In the Railway service settings, add a volume mounted at `/app/auth_session`.
- This preserves the WhatsApp login session across deploys and restarts.
- Without this, you would have to re-scan the QR code after every code update.

## Step 3: Set the required environment variables
Add these in Railway → Variables for the worker service:

| Variable | What it is | Where to get it |
|----------|-----------|-----------------|
| `PARENTPULSE_INGEST_URL` | The PWA's task ingestion endpoint | `https://parentpulse-task-digest.lovable.app/api/public/ingest-task` |
| `WORKER_SECRET` | A shared password between worker and PWA | Must match the `WORKER_SECRET` already stored in Lovable Cloud secrets |
| `GROQ_API_KEY` | Your Groq API key for Hebrew voice transcription | From your Groq dashboard |

## Step 4: Deploy and scan the QR code
- Deploy the worker service.
- Open the deploy logs in Railway.
- The worker will print a QR code.
- Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → scan the QR code.
- The worker is now logged in and will keep running.

## Step 5: Verify it works
- Send a message in one of your tracked WhatsApp groups (e.g. “Please pay 50 shekels for the zoo trip by Thursday”).
- Check the ParentPulse Actions tab — the task should appear within seconds.

## Important notes
- Do not add a Railway healthcheck to this service; it does not listen on any port, so a healthcheck will fail.
- If you ever change `WORKER_SECRET`, you must update it in both Lovable Cloud and Railway so they stay matched.
- The worker only processes messages from groups you selected in the ParentPulse Groups & Settings tab.
