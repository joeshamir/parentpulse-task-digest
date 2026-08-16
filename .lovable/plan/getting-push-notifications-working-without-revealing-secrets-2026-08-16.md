# Getting push notifications working without revealing secrets

Backend secrets in this project are write-only: the menu only offers Delete, so stored values (including `VAPID_PRIVATE_KEY`) cannot be read back. There are two ways forward.

## Option A (recommended): the worker never needs the keys

Today `worker/src/notify.js` reads `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` from the Railway environment and sends push messages itself. That is the only reason you need the values.

Move the actual sending into the app, which already holds the secrets:

- Add an authenticated app endpoint that claims pending notification jobs and sends the Web Push messages using the stored VAPID secrets.
- Reduce the worker to a timer that calls that endpoint every 20s with its existing worker token — no VAPID variables on Railway at all.
- Delete the VAPID entries from `worker/.env.example` and `worker/src/env.js`.

Result: nothing secret ever has to be copied anywhere, and a future key rotation touches only the backend.

## Option B: regenerate a fresh key pair

If you prefer to keep sending from the worker:

- Generate a brand new VAPID pair, store it in the backend secrets (replacing the current one), and hand you the two values once so you can paste them into Railway.
- Because the public key changes, existing browser push subscriptions become invalid — the app must clear `push_subscriptions` and prompt users to re-enable notifications.

`VAPID_SUBJECT` is not sensitive: it is `mailto:notifications@parentpulse.app`. The public key is already served at `/api/public/vapid-key`.

## Technical notes

- Files touched in Option A: new `src/routes/api/public/send-push.ts` (worker-token authenticated), `worker/src/notify.js`, `worker/src/index.js`, `worker/src/env.js`, `worker/.env.example`.
- Push delivery from the app runtime uses a Worker-compatible Web Push implementation (WebCrypto-based VAPID signing), not the Node-only `web-push` package.
- Option B touches only secrets plus a one-time cleanup of stale subscriptions.

Tell me which option you want and I will implement it.
