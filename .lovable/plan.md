# Notify me when new groups are discovered

New groups already appear in the Groups list automatically (the worker re-syncs every 60s and the app updates live). What's missing is an alert. This plan adds an opt-in "new group" notification: a push notification when the app is closed, and a toast when it's open. Groups still start untracked — nothing is listened to without your consent.

## What you'll see

- **Settings**: a new toggle, "New group alerts" / "התראות על קבוצות חדשות", next to the daily-summary toggle. Off by default (opt-in). Requires push notifications to be enabled on the device, same as daily summaries.
- **Push notification** (app closed): when the bridge discovers a group it has never seen, e.g. "קבוצה חדשה נמצאה · New group found: כיתה ד2" — tapping it opens the Groups tab so you can enable it.
- **Toast** (app open on Groups): a small "New group found" toast as the row slides in — no reload.

## Implementation

1. **Migration** — add `new_group_alerts_enabled boolean not null default false` to `public.notification_prefs` (no new table; the existing RLS/grants cover it).

2. **Shared push delivery helper** — extract `sendPush` (VAPID signing, subscription fetch, dead-endpoint pruning) from `src/routes/api/public/notify-jobs.ts` into `src/lib/push-delivery.server.ts`, so both routes reuse it. `notify-jobs` behavior stays identical.

3. **Detection in `src/routes/api/public/worker-groups.ts`** — the group upsert already uses `ignoreDuplicates`; chain `.select('group_name')` so the response contains **only newly inserted rows** (duplicates are skipped, so returned rows = genuinely new groups). If any:
   - Skip when the user had **zero** group rows before this sync (first-ever sync after pairing — otherwise you'd get a flood of alerts for every group you're already in).
   - Check `notification_prefs.new_group_alerts_enabled`; if on, send one push per new group (max 3), or a single "N new groups found" summary push when more arrive at once.
   - Push links to `/groups` and uses a new `parentpulse-groups` tag.

4. **Settings UI (`src/routes/settings.tsx`)** — add the toggle, persisted to `notification_prefs`, bilingual strings through `t()`, matching the existing daily-summary card style. Disabled with a hint when no push subscription exists yet.

5. **Groups UI (`src/routes/groups.tsx`)** — in the existing realtime INSERT handler, fire a bilingual sonner toast (`New group found: {name}`) when a row arrives while the app is open. Rows continue to appear untracked.

## Technical notes

- Files: new migration, new `src/lib/push-delivery.server.ts`, edits to `src/routes/api/public/notify-jobs.ts`, `src/routes/api/public/worker-groups.ts`, `src/routes/settings.tsx`, `src/routes/groups.tsx`, and `src/lib/lang.tsx` strings as needed.
- No worker/Railway changes: the worker's 60-second sync already sends the full list; dedupe happens server-side via the `(user_id, group_jid)` unique constraint.
- Security: `worker-groups` stays worker-token authenticated; push sending reuses the existing VAPID-secrets-in-cloud pattern; the pref is user-scoped via existing RLS.
- Edge case: a group the worker re-discovers after being deleted from the app will count as "new" again and may re-alert — acceptable for MVP.
