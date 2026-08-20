# Why this message wasn't turned into a task

## Confirmed cause

I ran the message through the exact matching logic the worker uses. It matched **zero** of the action keywords.

The current rule is a fixed keyword list ("לשלם", "להביא", "נא ", "חובה", "טופס"...). This teacher message asks parents to do things, but phrases them politely and indirectly:

- "אשמח אם תעדכנו אותי בפרטי" (please update me privately)
- "במידה ותרצו להיפגש... שיחת זום או טלפון"
- "חשוב... הגעה סדירה ויומיומית"

None of those wordings contain a listed keyword, so the message was classified as "not actionable" and dropped. It is not a connection, group-selection, or delivery problem.

A second issue is visible even if it had matched: the task title is just the first 300 characters of the message, so a long letter like this would produce an unreadable task instead of a short action.

## Plan: replace keyword matching with real understanding

### 1. AI-based task extraction

- Add an app-side endpoint that the worker calls with the message text held in memory only. It returns either "no action" or a short structured task: concise Hebrew/English title, category (School / Sports / Social / Other), and a deadline when one is stated.
- Use the built-in AI model — no extra key needed, and it understands Hebrew phrasing, politeness forms, and implied requests.
- The message text is never written to the database or logs; only the resulting short title is stored. The zero-chat-retention rule stays intact.

### 2. Handle multi-request messages

A letter like this contains more than one ask. The extractor may return up to a small number of tasks (e.g. "Update the teacher about anything from the holiday", "Optional: schedule a Zoom/phone call"), each stored as its own item.

### 3. Keep a safety net

- If the AI call fails or times out, fall back to today's keyword list so nothing regresses.
- Add a "not actionable" vs "AI rejected" distinction to the worker status counters so future misses are diagnosable.
- Cap title length at ~120 characters so tasks stay scannable.

### 4. Verify

- Replay this exact message through the new path and confirm it produces short, correct tasks.
- Confirm a plain chatty message ("תודה רבה 🙏") still produces nothing.
- Confirm no message body appears anywhere in the database or logs.

## Technical notes

- New route: `src/routes/api/public/classify-task.ts`, HMAC-verified with the same worker token scheme as ingestion.
- `worker/src/extract.js` becomes async: call the classifier first, fall back to `ACTION_HINTS` on error.
- No schema change required; multiple tasks are just multiple `action_items` rows.
- Worker changes need a Railway redeploy; app changes need a publish.
