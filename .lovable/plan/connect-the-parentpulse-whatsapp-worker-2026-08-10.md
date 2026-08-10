# Connect the ParentPulse WhatsApp worker

## What the status means

The Railway service is running normally: the status endpoint responds, its uptime is increasing, and it generated a fresh QR at `lastQrAt`.

`"state": "qr-pending"` and `"connected": false` mean only that this running worker is waiting for WhatsApp to finish linking. The Railway URL is a health/status page, not the ParentPulse app, so JSON is expected there.

## Recovery steps

1. In Railway, confirm a persistent Volume is mounted at `/data` and the variable `AUTH_DIR` is exactly `/data/auth_session`.
2. Redeploy once after those settings are correct.
3. Open the newest deployment logs and use only the latest numbered QR link printed there; older QR codes expire quickly.
4. On the phone, open WhatsApp → Settings → Linked devices → Link a device, then scan that QR.
5. Refresh the Railway status URL. Successful pairing will show:
   - `"state": "connected"`
   - `"connected": true`
6. Redeploy once more as a persistence test. If it returns to `qr-pending`, the auth files are not being written to the mounted Volume; re-check the mount path and `AUTH_DIR` rather than scanning repeatedly.

## Code impact

No app or worker code change is needed for the status shown in the screenshot. The worker already saves WhatsApp credentials through Baileys and exposes the correct health state; the remaining work is pairing the newest QR and ensuring Railway persists `/data/auth_session`.