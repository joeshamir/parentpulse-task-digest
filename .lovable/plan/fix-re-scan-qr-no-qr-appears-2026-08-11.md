# Fix "Re-scan QR" — no QR appears

## What I found (verified against the live database)

Your session row right now:

- status: `connected`
- QR string: empty
- `reconnect_requested_at`: set at 08:17:39 (your tap), still set
- `updated_at`: 3 seconds ago — so the worker **is** alive and talking to the app

Two real problems explain the missing QR:

1. **The worker on Railway is still running the old code.** It keeps syncing group/status (hence the fresh `updated_at`), but it never picked up your reconnect request and never sent a QR string. The QR/reconnect code exists in this project but has not been deployed to Railway.
2. **Even after deploying, the current logic cannot produce a QR while the phone is still linked.** The worker only ends the socket; Baileys then reconnects using the saved credentials in the auth volume, so it goes straight back to "connected" without ever emitting a QR. A new QR is only generated when the stored session is cleared.

A third, smaller issue: nothing ever clears `reconnect_requested_at`, so once set it stays set and would trigger a restart loop after every worker boot.

## The fix

**Worker (`worker/src/index.js`)**
- On a reconnect request: log out of WhatsApp (`socket.logout()`), delete the contents of the auth directory, then start a fresh connection. This forces Baileys to emit a new QR.
- Immediately push `status = pending_qr` and `qr_code = null` to the app so the UI switches to "waiting for QR" straight away instead of showing a stale "Connected".
- On boot, record the current `reconnect_requested_at` as already-handled so a stale flag never causes a boot loop.

**API (`src/routes/api/public/worker-groups.ts`)**
- Accept an `ack_reconnect` flag from the worker and clear `reconnect_requested_at` when the worker has acted on it.

**App UI (`src/routes/groups.tsx`)**
- After tapping "Re-scan QR", show a "restarting connection…" state with a spinner instead of leaving the card looking connected.
- If no QR arrives within ~30 seconds, show a bilingual hint that the worker may be offline or not redeployed, with the health-check link.

**Deployment step (you)**
- Redeploy the worker on Railway after these changes; the in-app QR only works with the updated worker running.

## Technical notes

- Clearing the auth state means the WhatsApp link is genuinely dropped — the old "Linked device" entry disappears and must be re-scanned. That is the correct behaviour for "Re-scan QR".
- Auth files live in the mounted volume at `AUTH_DIR` (`/data/auth_session`); only its contents are removed, not the mount.
- Poll interval stays at 5 seconds, so QR appears roughly 5–15 seconds after the tap.
