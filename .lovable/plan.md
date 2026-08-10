# Two separate problems: the published app, and the worker losing its pairing

These are unrelated. The good news is the WhatsApp link itself worked.

## Problem 1 — the published app shows "This page didn't load"

What I checked just now against the live site:

- It is still serving the frontend file `index-BXEcqV1n.js`.
- That file contains no backend address at all — I searched it and found zero matches.

This is the same stale build from the window when the backend values were briefly empty. It has never been replaced, so every visit crashes on startup. The current project code and backend values are correct; only the published copy is bad.

### What to do

1. You open the **Publish** dialog and click **Update**. Publishes triggered from my side have not been landing — the deployment ID has not changed across several attempts — so this one needs to come from you.
2. After about a minute, reload the live site with a hard refresh.
3. Confirm the frontend file name is no longer `index-BXEcqV1n.js` and the app renders instead of the error screen.

If it still serves `index-BXEcqV1n.js` after you click Update, the deploy pipeline is stuck rather than the app being broken, and that is worth raising with support.

## Problem 2 — worker returns to "qr-pending" after redeploy

The pairing succeeded (you saw `connected: true`), then a redeploy wiped it. That means the WhatsApp session files are being written somewhere that disappears when the container restarts — they are not landing on a persistent disk.

The worker saves its session into whatever folder `AUTH_DIR` points at. If that folder is not inside a mounted Volume, it lives only in the container's temporary filesystem and is destroyed on every deploy.

### What to check in Railway, in this order

1. **Volume exists and is mounted at exactly `/data`.** Service → Settings → Volumes. Not `/app/data`, not `/data/`, exactly `/data`. If there is no Volume, add one.
2. **`AUTH_DIR` is exactly `/data/auth_session`.** Service → Variables. A typo, a trailing slash, or a leftover `./auth_session` value all produce this symptom.
3. **The Volume is attached to the same service running the worker.** A Volume created on a different service does nothing.
4. Redeploy once after fixing, scan the newest QR from the latest deploy logs, and confirm the status page shows `connected: true`.
5. Redeploy a second time and refresh the status page **without scanning anything**. If it stays `connected: true`, persistence is fixed for good. If it drops back to `qr-pending`, the volume mount is still wrong.

### Confirming it from the logs

On boot the worker prints its resolved auth folder:

```
[boot] auth dir: /data/auth_session
```

If that line shows anything other than `/data/auth_session`, the variable is the problem. That single log line answers the question faster than re-scanning.

## Code changes

None needed for either problem. The app code and worker code are correct as written; both issues are configuration and deployment.
