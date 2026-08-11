# Friction-free WhatsApp reconnect

Goal: a parent can reconnect WhatsApp entirely from the app — no Railway, no waiting, no guessing. The app should always show a truthful connection state and a single obvious next action.

## What the user will see

The connection card in Groups & Settings becomes state-driven, with exactly one action per state:

- **Connected** — green dot, "Last activity a few seconds ago", secondary "Re-scan QR" link.
- **Waiting for scan** — the QR image, a countdown/auto-refresh note, and "Open WhatsApp > Linked devices" instructions in Hebrew/English.
- **Reconnecting** — spinner, "Preparing a new code…", typically 2–6 seconds.
- **Bridge offline** — amber card, "Your background connector isn't running", with a plain-language "How to restart it" expander (single Railway step) instead of silence.

No state ever dead-ends: after 20s without a QR the card auto-retries once, then shows the offline card.

## Behaviour changes

1. **Heartbeat + liveness.** The worker already pings the backend every few seconds; the app treats a heartbeat older than ~45s as "bridge offline" and says so instead of showing a stale "Connected".
2. **Faster reconnect pickup.** Worker polls for a reconnect request every 2s (instead of 5s), so tapping the button produces a QR in ~2–4s.
3. **Self-healing socket.** If WhatsApp logs the device out or the socket stays closed, the worker clears its session and produces a fresh QR on its own, and pushes `pending_qr` to the app — so the user just opens the app and scans, without pressing anything.
4. **Stuck-state watchdog.** If the worker sits in a non-connected state for 2 minutes, it self-restarts its socket. The Railway process itself keeps running, so no redeploy is needed.
5. **Honest button.** "Re-scan QR" is disabled while the bridge is offline, with an explanation, instead of appearing to work and timing out.

## One-time caveat

The worker currently deployed on Railway predates this flow, so a single manual redeploy is required to pick it up. After that, reconnects are fully in-app — that's stated explicitly in the offline card so the user is never left guessing.

## Technical notes

- `src/routes/groups.tsx`: derive card state from `whatsapp_sessions.status` + `updated_at` freshness; add offline state, auto-retry, disabled-button logic, bilingual copy.
- `worker/src/index.js`: poll interval 5s -> 2s; add watchdog timer that calls `forceFreshQr()` after 120s in a non-open state; on `loggedOut` keep existing clear-and-requalify path; push a heartbeat sync (`syncGroups([], currentState)`) every 15s so `updated_at` is a reliable liveness signal.
- `src/routes/api/public/worker-groups.ts`: no schema change needed — `updated_at` already refreshes on every worker call; only ensure a heartbeat-only call (no state, no groups) still touches `updated_at`.
- No database migration required.
