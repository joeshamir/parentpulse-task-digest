# Why the message didn't become a task

## What I verified

- WhatsApp is linked: the connection status is `connected`, last updated a minute ago.
- Group selection is working: 12 groups are marked as tracked, including `💐הורי כיתה ט׳9 ביה״ס אורט שחר`.
- The wording itself is fine: "לשלם 25₪ לוועד כיתה" matches the task rules (contains "לשלם") and would be filed under School.
- No new task rows arrived — the newest task in the database is from Aug 9.

So the message never made it through the worker. The three realistic reasons:

1. The friend posted in a group that is not one of the 12 selected ones.
2. The worker never received the message event (it can miss messages while reconnecting, or deliver them as a non-`notify` event that is currently dropped silently).
3. The task was built but the send to the app failed.

The worker already counts each of these, but the counters aren't specific enough to tell them apart — for example every skipped group is lumped into one number with no group name.

## Step 1: Read the current counters (no code change)

Open the worker status page (the Railway URL, `/health`). The `skipped` block already distinguishes `group-not-tracked`, `no-text`, `not-actionable`, and `event-*`, and `ingestFailures` shows send failures. That single reading identifies which of the three causes it was.

## Step 2: Make the worker tell us exactly what happened

Improvements to the worker so this is never a guessing game again:

- Record a short rolling log of the last ~20 decisions: timestamp, group name, decision (`task-sent`, `group-not-tracked`, `not-actionable`, `ingest-failed`). Message text is never stored or logged, keeping the zero-retention rule.
- Show the list of currently selected group names on the status page, so it's obvious whether the friend's group is among them.
- Stop silently dropping non-`notify` message events: process `append` events too, which is where messages that arrive during a reconnect land.
- Log the ingest response reason on failure (status code only, no content).

## Step 3: Fix the likely functional gaps

- Duplicate group rows: the group list contains repeated entries (e.g. `משרות מיידיות פרדס חנה והסביבה` appears twice), caused by the 15-second sync racing with itself. Add a uniqueness rule on account + group so a group can only exist once, and clean the existing duplicates. A duplicate row can hold a different selection state, which means a group can look selected in the app while the worker sees it as unselected — a direct cause of a missed task.
- Broaden the Hebrew task wording slightly (e.g. "תשלום", "לגבות", "מביאים", "נא לשלוח", "עד ה־") so common phrasings are not missed.
- Slow the group refresh from every 15 seconds to every 60 seconds to reduce the race and the load on WhatsApp.

## Step 4: A way to test without waiting for anyone

Add a "Send test task" button in the Groups & Settings screen that creates a sample task for the selected group. It confirms the app and database half of the flow instantly, so any future problem is clearly on the WhatsApp side.

## Technical notes

- Files touched: `worker/src/health.js` (decision log, selected group names), `worker/src/index.js` (accept `append` events, slower refresh), `worker/src/extract.js` (extra Hebrew hints), `worker/src/ingest.js` (failure detail), `src/routes/api/public/worker-groups.ts` (upsert on the new unique key).
- One database migration: de-duplicate `tracked_groups`, then add `unique (user_id, group_jid)`.
- After approval, the worker changes require a redeploy on Railway; the app changes require a publish.
