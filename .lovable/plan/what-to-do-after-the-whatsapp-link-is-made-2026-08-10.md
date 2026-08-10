# What to do after the WhatsApp link is made

## 1. Confirm the worker shows "connected"

Open the Railway URL (`https://parentpulse-task-digest-production.up.railway.app/`) and refresh it. A successful link looks like this JSON:

```json
{
  "service": "parentpulse-worker",
  "state": "connected",
  "connected": true,
  "lastQrAt": "2026-08-...",
  "lastMessageAt": null,
  "lastTaskAt": null,
  "tasksSent": 0,
  "uptimeSeconds": 123
}
```

If it still says `"state": "qr-pending"` and `"connected": false`, the pairing did not finish. Wait up to 30 seconds and refresh again. If it stays `qr-pending`, scan the **newest** QR from the latest deploy logs once more.

## 2. Test that the connection survives a redeploy

This is the most important step. If the volume is working, the link will stick across restarts.

1. In Railway, click **Redeploy** on the worker service.
2. Wait for the deploy to finish.
3. Refresh the Railway status URL.

Expected result: `"state": "connected"` and `"connected": true` — **without** printing a new QR.

If it goes back to `qr-pending`, the auth files are not being saved. Check:
- A Volume is attached and mounted at `/data`.
- The environment variable `AUTH_DIR` is exactly `/data/auth_session`.
Then redeploy and re-scan.

## 3. Send a test message to verify tasks flow end-to-end

1. In one of the tracked WhatsApp groups, send a message like:
   "Please send 50 shekels for the class trip by Thursday."
2. Wait 10–20 seconds.
3. Open the ParentPulse PWA at `/` (Actions tab).

Expected result: a new task card appears with a title, category, and deadline.

You can also check the Railway status JSON: `tasksSent` should increase from 0 to 1 and `lastTaskAt` should update.

## 4. If nothing shows up in ParentPulse

Check these in order:
- The Railway status page shows `"state": "connected"`.
- The message was sent in a **group** (`@g.us`), not a private chat.
- The group name matches the `TRACKED_GROUPS` list, or `TRACKED_GROUPS` is empty (tracks all groups).
- The worker logs show the message was received.
- The ParentPulse PWA itself loads without console errors (the earlier Supabase env issue is unrelated but could hide the task feed).

## 5. Day-to-day usage

Once connected and tested:
- Leave the Railway worker running. It is a background process and stays online automatically.
- New actionable messages in tracked groups will appear in the ParentPulse Actions tab.
- Daily summaries will appear in the Digest tab.
- If WhatsApp ever logs the worker out, the Railway status will show `disconnected` or print a new QR. In that case, re-scan the newest QR.
