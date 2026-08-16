# Daily summary notifications + a real Settings tab

Yes, this works. Phone notifications don't depend on the WhatsApp QR connection at all — they're sent from ParentPulse's own backend to your phone's browser/PWA. The QR bridge only feeds tasks in; notifications go out separately.

One platform caveat: on iPhone, web notifications only work if ParentPulse is added to the Home Screen (iOS 16.4+). On Android/desktop Chrome they work once installed or even in the browser. The UI will say this plainly instead of failing silently.

## Navigation change

Split the current combined tab into three:

- Actions (unchanged, default)
- Groups — only the group list, search, auto-selection and "Save selected groups"
- Settings — WhatsApp bridge card (status, QR / re-scan, restart connector), notifications, language, privacy link, sign out

`/groups` keeps its URL so nothing breaks; a new `/settings` route receives the bridge and account sections.

## Notifications behaviour

- Off by default. A single toggle in Settings: "Daily summary notification".
- Turning it on asks for the browser's notification permission. If permission is blocked, the toggle stays off and shows a short bilingual explanation of how to re-enable it.
- Turning it off removes the subscription immediately — no notification is ever sent again until it's turned back on.
- A time picker (default 08:00, Israel time) for when the daily summary arrives.
- The notification reads like: "3 open tasks today — 25₪ to the class fund, gym clothes, trip form". Tapping it opens the Actions feed.
- A "Send test notification" button so you can confirm it works on your phone before relying on it.

## Technical scope

**Database (one migration)**
- `push_subscriptions`: `user_id`, endpoint, keys, `user_agent`, `created_at`, unique on endpoint. RLS + GRANTs scoped to `auth.uid()`; service role full access for the sender.
- `notification_prefs`: `user_id` (PK), `daily_summary_enabled` (default false), `send_hour_local` (default 8), `timezone` (default `Asia/Jerusalem`), `last_sent_on`.

**Push plumbing**
- Standard Web Push with VAPID keys (no Firebase). Public key exposed to the client; private key stored as a backend secret.
- A dedicated service worker `public/push-sw.js` handling `push` and `notificationclick` only — it does no caching and does not change the existing install/manifest behaviour.
- Client helper to register that worker, request permission, subscribe, and store/delete the subscription row.

**Sending**
- The existing Railway Node worker gains a scheduler tick (once a minute) that finds users whose local send hour has arrived, haven't been sent today, and have `daily_summary_enabled`. It composes the summary from that user's open `action_items`, sends via the `web-push` library, prunes dead subscriptions (410/404), and stamps `last_sent_on`.
- This lives in the Node worker rather than the app because it needs a persistent scheduler; the app's runtime has no cron.
- The test-notification button calls a small authenticated app endpoint that sends immediately to the current user's subscriptions.

**Files**
`src/routes/groups.tsx` (trim to groups), new `src/routes/settings.tsx`, `src/components/MobileShell.tsx` (three tabs), new `src/lib/push.ts`, new `public/push-sw.js`, new `src/routes/api/...` test-send endpoint, `worker/src/index.js` + new `worker/src/notify.js`, one migration.

**You'll need to add** one secret pair (VAPID public/private) — I'll generate them and ask for approval to store them.
