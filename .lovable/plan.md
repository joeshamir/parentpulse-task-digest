# Restore ParentPulse production and task ingestion

## Confirmed current state

- The Railway worker is connected to WhatsApp, but its health response shows `lastMessageAt: null`, `lastTaskAt: null`, and `tasksSent: 0`. It has not processed a qualifying group message during this run.
- The production site still serves the old `index-BXEcqV1n.js` bundle. That bundle contains the missing-environment error and does not contain the configured backend URL, so the page fails before the app can render.
- The public ingestion endpoint is deployed and responds to requests; the database contains three older action items, with no new item since August 9.
- The Groups & Settings screen uses mock groups and its Save button only shows a success message. It does not save `tracked_groups` or configure Railway's `TRACKED_GROUPS` value.
- The worker counts a task as sent even when the ingestion request fails, which makes its status unreliable once messages begin arriving.

## Plan

### 1. Make the app resilient to deployment configuration

- Stop initializing the browser backend client in a way that crashes the entire route when build-time variables are absent.
- Add a controlled configuration-error state so a bad deployment remains readable and diagnosable rather than showing the generic “page didn’t load” screen.
- Preserve authenticated task loading and realtime updates when configuration is present.
- Publish a fresh production build and verify the live asset has changed and the Actions screen renders.

### 2. Add trustworthy worker diagnostics

- Record incoming group events before filtering, plus safe skip reasons such as `not-group`, `sent-by-self`, `group-not-tracked`, `no-text`, and `not-actionable`; never retain message content.
- Only increment `tasksSent` after `sendTask` returns success.
- Add counters and timestamps to `/health` so the status page distinguishes “WhatsApp delivered nothing” from “message ignored,” “extraction rejected it,” and “ingestion failed.”
- Improve ingestion logs with the response status and safe error body, without exposing secrets or raw chat text.

### 3. Fix and verify task extraction

- Keep the zero-chat-retention policy, but broaden the Hebrew/English action detection enough to handle ordinary parent-group requests rather than only the current small keyword list.
- Verify text, captions, and voice-note paths; voice notes should report a clear safe diagnostic when transcription is unavailable.
- Use a deterministic test message containing a known action phrase to confirm the extraction path.

### 4. Make group selection real

- Replace the mock-only Save behavior with persisted group selections tied to the signed-in user.
- Give the worker a reliable way to apply those selections rather than requiring a manually maintained Railway `TRACKED_GROUPS` list.
- Show the real connection/processing state in the Groups screen instead of the hard-coded “Connected” label.

### 5. End-to-end validation

- Confirm the worker survives a Railway redeploy using `AUTH_DIR=/data/auth_session` and remains connected.
- Send one known actionable message from another participant in a selected WhatsApp group.
- Verify health diagnostics advance through received → actionable → ingested, a new `action_items` row is created for the same user ID, and the task appears in the signed-in Actions feed.
- Verify non-actionable chat is ignored and no raw chat body is stored.

## Technical notes

- The production issue requires both a code safeguard and a new successful publish; source changes alone cannot replace the stale live bundle.
- The worker’s current filter ignores direct messages, messages sent by the linked account itself, non-`notify` events, unmatched `TRACKED_GROUPS`, empty text, and text without an action keyword.
- The worker and app must use the same user UUID; it will be validated without displaying it in the UI or logs.
