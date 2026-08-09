# Fix: published ParentPulse site shows "This page didn't load"

## What I found

Two separate things, only one is broken.

1. **Railway worker — healthy.** The JSON you saw is the worker's own status page. `"state": "qr-pending"` means the worker is running and waiting for you to link WhatsApp. Nothing to fix in code; you just need to scan the newest QR from the Railway deploy logs. Once scanned it flips to `"connected": true`.

2. **Published Lovable site — genuinely broken.** I loaded `parentpulse-task-digest.lovable.app` in a real browser. The server returns 200, but the page crashes immediately with:

   `Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`

   The backend connection details are baked into the app at build time. The currently published build was produced during the window when the backend secrets were being rebound, so it shipped with those values empty. The current project files have them set correctly — the preview works fine — but the published copy is stale.

## The fix

Re-publish the app so a fresh build is produced with the backend variables present.

Steps:
1. Confirm the backend is healthy before rebuilding.
2. Re-publish the project (this triggers a new build of the live site).
3. Re-load the published URL in a browser and confirm the Actions screen renders instead of the error card, with no missing-variable errors in the console.

No source-code changes are required for this — the bug is a stale deployment, not app logic.

## Then: link WhatsApp

After the site is fixed, open the Railway worker's deploy logs, scan the most recent numbered QR with WhatsApp (Linked devices), and refresh the worker status URL — it should read `"connected": true` and `tasksSent` will start counting once tasks arrive.
