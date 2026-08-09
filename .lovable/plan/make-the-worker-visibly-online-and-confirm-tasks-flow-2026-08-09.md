# Make the worker visibly "online" and confirm tasks flow

## What's actually going on

Two separate things are showing as "offline", and only one is a real problem.

1. **Railway's "Application failed to respond"** — this is expected with the worker
   as built today. The WhatsApp worker is a background process: it doesn't open a
   web port, so opening its Railway URL in a browser always shows that page, even
   when the worker is perfectly healthy and connected. It is not evidence that the
   pairing failed.
2. **The ParentPulse "This page didn't load" screen** — this comes from the preview
   build being mid-rebuild (the logs show the preview bundle missing for a moment).
   It clears on refresh once the rebuild finishes; it's unrelated to WhatsApp.

## The fix

Give the worker a small status page so "is it online?" has a real answer.

- The worker will open a tiny web endpoint on the port Railway gives it. Visiting the
  Railway URL will then show a simple JSON status instead of the error page:
  whether WhatsApp is connected, whether it's waiting for a QR scan, when it last
  saw a message, and how many tasks it has sent to the app.
- Railway will also stop reporting the service as unresponsive, and a healthcheck
  becomes possible if you want one.
- The status page shows no chat content and no secrets — only counters and state.

Then we verify the end-to-end path: send a test message in one tracked group and
confirm a task appears in the Actions tab.

## Technical details

- Add `worker/src/health.js`: `node:http` server on `process.env.PORT || 8080`,
  responding to `/` and `/health` with `{ connected, lastQrAt, lastMessageAt,
  tasksSent, uptimeSeconds }`.
- Export a shared status object updated from `connection.update` (connected /
  qr-pending / disconnected) and from the ingest path (increment `tasksSent`).
- Start the health server from `src/index.js` before connecting.
- Add `"healthcheckPath": "/health"` to `worker/railway.json` deploy config.
- No new dependencies.

## What you'll do after

Redeploy the worker, open its Railway URL, and confirm it shows
`"connected": true`. If it shows `qr-pending`, the link didn't stick and we
re-scan — likely because the volume isn't mounted at `/data` with
`AUTH_DIR=/data/auth_session`, which we'll check next.
