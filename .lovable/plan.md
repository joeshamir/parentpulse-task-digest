# ParentPulse Architecture Knowledge Update

## Goal
Add a new, accurate "Architecture & System Overview" section to `/dev-server/KNOWLEDGE.md` that describes how the system is currently built: architecture, main components, data structure, and how things connect.

## Deliverable
An updated `KNOWLEDGE.md` with a new section (likely Section 7, bumping existing later sections) covering the following verified current-state facts.

## Architecture Overview

```text
WhatsApp Groups (school/class/activities)
    │ messages + voice notes
    ▼
External Node.js Worker (Railway)
    • Baileys — WhatsApp Web connection
    • Groq Whisper v3 Turbo — Hebrew voice transcription
    • In-memory classification + task extraction
    │ structured JSON + worker_token
    ▼
ParentPulse App (TanStack Start + Lovable Cloud)
    • Public API routes receive and validate worker payloads
    • Supabase stores structured data per user
    • React PWA renders the live task feed
    │ Web Push notifications
    ▼
User's Phone / Browser
```

## Main Components

### 1. PWA Frontend (TanStack Start, React 19, Tailwind CSS v4)
- **Routes (file-based)**
  - `/` — Actions feed: live tasks, category filter, mark complete, swipe-to-delete, demo feed when signed out.
  - `/groups` — Group selection: search, toggle tracking, save selections.
  - `/settings` — WhatsApp bridge status, QR rescan, one-tap Railway restart, daily-summary push notifications, language toggle, sign out.
  - `/auth` — Email/password + Google sign-in.
  - `/privacy` — User-facing privacy basics.
  - `/digest` — Legacy route (still present, not used in main navigation).
- **Shared shell**: `MobileShell.tsx` provides the header, language toggle, and frosted-glass floating bottom dock (3 tabs: Actions, Groups, Settings).
- **Language system**: `src/lib/lang.tsx` stores `en`/`he` in `localStorage`, sets `dir="rtl"` for Hebrew, and provides a `t()` helper.
- **Auth**: `src/lib/auth.tsx` context + Supabase session listener; `useAuth()` hook; Google managed via `src/lib/google-signin.ts` and OAuth callback scrubbing.
- **Push**: `src/lib/push.ts` registers `/push-sw.js` and stores subscriptions in Supabase.

### 2. Lovable Cloud Backend (Supabase)
- **Auth**: email/password and Google OAuth (managed by Lovable Cloud).
- **Realtime**: enabled for `action_items` and `whatsapp_sessions`; live UI updates without polling.
- **Row-Level Security (RLS)**: every user-facing table scoped to `auth.uid() = user_id`.
- **Service-role client**: `src/integrations/supabase/client.server.ts` used only in trusted server route handlers to bypass RLS for worker writes.

### 3. Public API Routes (`src/routes/api/public/*`)
- `POST /api/public/ingest-task` — Worker sends extracted tasks. Validates a per-user HMAC token, inserts into `action_items`.
- `POST /api/public/worker-groups` — Worker syncs discovered groups, session state, and heartbeat. Returns tracked selections and reconnect flags.
- `POST /api/public/notify-jobs` — Worker triggers pending push notifications. The app signs and sends Web Push messages using VAPID keys stored in Lovable Cloud secrets.
- `GET /api/public/vapid-key` — Exposes the public VAPID key for browser subscription.
- `POST /api/restart-bridge` — Authenticated user endpoint that calls Railway's GraphQL API to redeploy the worker service (requires `RAILWAY_API_TOKEN`, `RAILWAY_SERVICE_ID`, `RAILWAY_ENVIRONMENT_ID`).

### 4. External Worker (`worker/` directory, deployed separately on Railway)
- **Runtime**: Node.js 20+ long-running process.
- **Auth state**: persisted on a mounted `/data` volume via `AUTH_DIR=/data/auth_session` so re-deploys don't force re-pairing.
- **Libraries**: `@whiskeysockets/baileys` (WhatsApp Web), `groq-sdk` (Whisper), `pino`, `qrcode-terminal`.
- **Responsibilities**:
  - Connect to WhatsApp Web and emit QR codes for pairing.
  - Poll group selection from the app every 60 seconds.
  - Listen only to tracked group messages; ignore non-group, own-sent, and untracked messages.
  - Transcribe Hebrew voice notes in memory.
  - Run heuristic extraction (`ACTION_HINTS` keyword matching in English and Hebrew) to decide if a message is actionable.
  - Send only the structured task JSON to `/api/public/ingest-task`.
  - Sync groups and heartbeat to `/api/public/worker-groups`.
  - Trigger notification delivery every 20 seconds via `/api/public/notify-jobs`.
  - Self-heal reconnects: watches `reconnect_requested_at` from the app, clears stale sessions, and restarts on stuck states.

## Data Structure

### Tables in `public` schema
1. **whatsapp_sessions** — One row per user. `status` (`pending_qr`/`connected`/`disconnected`), `qr_code_str`, `reconnect_requested_at`, `updated_at` (heartbeat).
2. **tracked_groups** — One row per discovered group per user. `group_jid`, `group_name`, `is_tracked`. Unique on `(user_id, group_jid)`.
3. **action_items** — Extracted tasks. `group_name`, `title`, `category` (`School`/`Sports`/`Social`/`Other`), `deadline`, `is_completed`, `created_at`. Sorted newest-first.
4. **daily_summaries** — Non-actionable summaries (schema present, not actively populated by current worker).
5. **push_subscriptions** — Web Push endpoints per user. `endpoint`, `p256dh`, `auth`, `user_agent`.
6. **notification_prefs** — One row per user. `daily_summary_enabled`, `send_hour_local`, `timezone`, `last_sent_on`, `test_requested_at`.

All tables reference `auth.users(id)` with `ON DELETE CASCADE` and have RLS policies scoped to `user_id`.

## How Things Connect

### Ingesting a new task
1. Parent posts a message in a tracked WhatsApp group.
2. Worker receives the Baileys message event.
3. If it is a voice note, it downloads and transcribes it via Groq Whisper.
4. Worker checks the `ACTION_HINTS` keyword list; if actionable, it builds a structured task.
5. Worker signs its `user_id` with `WORKER_SECRET` into a `worker_token`.
6. Worker POSTs to `/api/public/ingest-task` with the token and task JSON.
7. App verifies the HMAC token, derives `user_id`, and inserts the row via `supabaseAdmin`.
8. Supabase Realtime broadcasts the change; the Actions feed updates immediately.

### Group selection flow
1. Worker connects and fetches all participating groups.
2. Worker POSTs them to `/api/public/worker-groups`, which upserts them with `is_tracked=false` by default.
3. User opens `/groups`, sees the list, toggles groups, and taps Save.
4. App updates `is_tracked` in Supabase.
5. Worker polls `/api/public/worker-groups` to refresh `selectedGroupJids` before processing messages.

### Bridge status and QR rescan
1. Worker writes session state and heartbeat to `whatsapp_sessions` every 15 seconds via `/api/public/worker-groups`.
2. Settings screen subscribes to the row via Realtime and shows Connected / Offline / Waiting.
3. If offline, user taps "Restart connector"; app calls `/api/restart-bridge`, which redeploys the Railway service.
4. If user taps "Re-scan QR", app sets `reconnect_requested_at`; worker detects it within 2 seconds, clears the auth directory, and emits a fresh QR.

### Notifications
1. User enables daily summary in Settings; browser requests permission and registers the `/push-sw.js` service worker.
2. Subscription keys are stored in `push_subscriptions`.
3. Worker pings `/api/public/notify-jobs` every 20 seconds.
4. App checks `notification_prefs` for the user's timezone, preferred hour, and whether a summary was already sent today.
5. If due, the app builds a bilingual message and signs/sends Web Push payloads using VAPID keys from Lovable Cloud secrets.
6. Dead endpoints (404/410) are pruned automatically.

## Security Notes
- **Worker authentication**: HMAC-SHA256 token binding `user_id` to `WORKER_SECRET`. `user_id` is never taken from the request body.
- **RLS**: Users can only read/write their own rows. Worker uses the service-role client for writes but is authenticated by its own secret.
- **No chat logs**: The worker processes messages in memory and only sends extracted task metadata to the app backend.
- **VAPID keys**: Private VAPID key never leaves Lovable Cloud; worker only triggers delivery, it does not sign pushes.
- **Railway restart**: Only authenticated users can call `/api/restart-bridge`; the actual Railway credentials are backend secrets.

## Out of Scope for This Plan
No code changes, no UI edits, no database schema changes. This turn only updates `KNOWLEDGE.md`.

## Success Criteria
- `KNOWLEDGE.md` contains a new Architecture & System Overview section.
- The description accurately reflects the current file structure, routes, tables, and data flows.
- No references to removed or unimplemented features (e.g., the Digest tab is noted as legacy rather than active).
