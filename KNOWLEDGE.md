# ParentPulse — Product Knowledge Document

> **App:** ParentPulse (Progressive Web App)  
> **Status:** Vision & architecture reference for build sessions  
> **Last updated:** 2026-08-19

---

## 1. Mission & Product Definition

ParentPulse turns the chaotic flow of Israeli school, class, and activity WhatsApp groups into a calm, actionable dashboard for busy parents.

Instead of scrolling through hundreds of unread messages, parents open ParentPulse and immediately see:

- **Tasks** — things they need to do, pay, sign, send, or remember.
- **FYI / Summaries** — important updates they should know about, but do not need to act on.

The product is deliberately not a chat app. It is a **decision-support layer** that sits on top of group messaging noise.

---

## 2. Primary Market

- **Country:** Israel
- **Language:** Bilingual Hebrew / English UI
- **Layout:** Native Right-to-Left (RTL) readiness for Hebrew mode
- **Form factor:** Mobile-first; parents check this on the go

### Cultural / market notes
- WhatsApp is the dominant group-communication channel for schools, kindergartens, after-school activities, and parent committees.
- Voice notes are extremely common in Hebrew-speaking groups; transcription must handle Hebrew accurately.
- Parents often juggle multiple groups per child (class, grade, school, sports, arts, parent committee).

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 19 |
| Routing / SSR framework | TanStack Start |
| Styling | Tailwind CSS v4 |
| Icons | Lucide Icons |
| Backend / database / auth | Lovable Cloud (Supabase) |
| PWA shell | Web app manifest + service worker (manifest-only unless offline mode is explicitly requested) |
| External parser | Node.js background worker using Baileys + Groq Whisper v3 Turbo |

---

## 4. Core Aesthetic

- **Calm, structured, modern, zero clutter.**
- Soft rounded cards with subtle borders.
- High-contrast typography for fast mobile scanning.
- Generous whitespace and clear visual hierarchy.
- No generic “AI aesthetic” gradients unless explicitly requested.
- Design tokens live in `src/styles.css`; avoid hardcoded color utilities in components.

### Mobile-first principles
- Thumb-reachable primary actions.
- Large tap targets.
- Clear status indicators (e.g., done / pending / due soon).
- Pull-to-refresh friendly feeds.

---

## 5. In-Scope Features

### 5.1 Action Items Feed (Tasks)
- Extracted to-dos from group messages.
- Metadata: title, due date, category, source group, priority, completion status.
- One-tap mark-as-done.
- Optional reminders / due-date sorting.

### 5.2 Categorized Digest Feed (FYI / Summaries)
- Non-actionable updates distilled into short cards.
- Categories: announcements, schedule changes, general FYI.
- Expandable for more detail when needed.

### 5.3 Low-Friction Group Selection Screen
- List of connected WhatsApp groups.
- Toggle groups on/off for parsing.
- Clear labels so parents know which group each task came from.

### 5.4 QR Code Pairing Status
- Visual indicator of whether the WhatsApp bridge / pairing is active.
- Re-pair flow if the connection drops.
- Security note: pairing is handled by the external Node.js worker, not inside the PWA.

### 5.5 PWA Manifest Settings
- `manifest.webmanifest` with app name, short name, theme colors, display mode.
- Home-screen installability on iOS and Android.
- Manifest-only installability by default; offline support only if explicitly requested.

---

## 6. Out-of-Scope & Privacy Policy

### Explicitly out of scope
- **Raw chat message storage.** ParentPulse does not retain chat logs.
- **Direct 1-on-1 messaging.** The app is read-only summary/dashboard layer.
- **Native App Store / Play Store binaries.** PWA-only distribution unless the user asks otherwise.

### Privacy-first data model
- The external parser processes messages **in memory** and writes only structured JSON (tasks, summaries, metadata) to Lovable Cloud.
- Original message text, media, and voice note audio are not persisted by the PWA backend.
- This is a core product promise and should be reflected in onboarding copy and any future privacy policy.

---

## 7. Architecture & System Overview

This is the current system as built. It covers what exists today, not future aspirations.

```text
WhatsApp Groups (school / class / activities)
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

### 7.1 PWA Frontend

**Framework:** TanStack Start (file-based routes), React 19, Tailwind CSS v4, Lucide Icons.

**Routes**

| Route | Purpose |
|-------|---------|
| `/` | Actions feed: live tasks, category filter, mark complete, swipe-to-delete, demo data when signed out. |
| `/groups` | Group selection: search, toggle tracking, save selections. |
| `/settings` | WhatsApp bridge status, QR rescan, one-tap Railway restart, daily-summary push notifications, language toggle, sign out. |
| `/auth` | Email/password + Google sign-in. |
| `/privacy` | User-facing privacy basics. |
| `/digest` | Legacy route; still present but not in the main navigation. |

**Shared shell**: `MobileShell.tsx` provides the header, language toggle, and frosted-glass floating bottom dock (3 tabs: Actions, Groups, Settings).

**Language system**: `src/lib/lang.tsx` stores `en`/`he` in `localStorage`, sets `dir="rtl"` for Hebrew, and exposes a `t()` helper.

**Auth**: `src/lib/auth.tsx` context + Supabase session listener; `useAuth()` hook; Google sign-in managed via `src/lib/google-signin.ts` with OAuth callback scrubbing.

**Push**: `src/lib/push.ts` registers the `/push-sw.js` service worker and stores browser subscriptions in Supabase.

### 7.2 Lovable Cloud Backend

**Auth**: email/password and Google OAuth, managed by Lovable Cloud.

**Realtime**: enabled for `action_items` and `whatsapp_sessions`; the UI updates live without polling.

**Row-Level Security (RLS)**: every user-facing table is scoped to `auth.uid() = user_id`.

**Service-role client**: `src/integrations/supabase/client.server.ts` is used only in trusted server route handlers to bypass RLS for worker writes.

### 7.3 Public API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/public/ingest-task` | Worker sends extracted tasks. Verifies an HMAC token, inserts into `action_items`. |
| `POST /api/public/worker-groups` | Worker syncs discovered groups, session state, and heartbeat. Returns tracked selections and reconnect flags. |
| `POST /api/public/notify-jobs` | Worker triggers pending push notifications. The app signs and sends Web Push using VAPID keys from Lovable Cloud secrets. |
| `GET /api/public/vapid-key` | Returns the public VAPID key for browser subscription. |
| `POST /api/restart-bridge` | Authenticated user endpoint that calls Railway's GraphQL API to redeploy the worker service. Requires `RAILWAY_API_TOKEN`, `RAILWAY_SERVICE_ID`, and `RAILWAY_ENVIRONMENT_ID`. |

### 7.4 External Worker

**Location**: `worker/` directory. Deployed as its own repository/service on Railway (not the same Cloudflare build as the PWA).

**Runtime**: Node.js 20+ long-running process.

**Auth state**: persisted on a mounted `/data` volume via `AUTH_DIR=/data/auth_session` so re-deploys do not force re-pairing.

**Libraries**: `@whiskeysockets/baileys` (WhatsApp Web), `groq-sdk` (Whisper), `pino`, `qrcode-terminal`.

**Responsibilities**
- Connect to WhatsApp Web and emit QR codes for pairing.
- Poll group selection from the app every 60 seconds.
- Listen only to tracked group messages; ignore non-group, own-sent, and untracked messages.
- Transcribe Hebrew voice notes in memory.
- Run heuristic extraction (`ACTION_HINTS` keyword matching in English and Hebrew) to decide if a message is actionable.
- Send only the structured task JSON to `/api/public/ingest-task`.
- Sync groups and heartbeat to `/api/public/worker-groups`.
- Trigger notification delivery every 20 seconds via `/api/public/notify-jobs`.
- Self-heal reconnects: watches `reconnect_requested_at` from the app, clears stale sessions, and restarts on stuck states.

### 7.5 Data Structure

All tables live in the `public` schema, reference `auth.users(id)` with `ON DELETE CASCADE`, and have RLS policies scoped to `user_id`.

| Table | Purpose |
|-------|---------|
| `whatsapp_sessions` | One row per user. `status` (`pending_qr`/`connected`/`disconnected`), `qr_code_str`, `reconnect_requested_at`, `updated_at` (heartbeat). |
| `tracked_groups` | One row per discovered group per user. `group_jid`, `group_name`, `is_tracked`. Unique on `(user_id, group_jid)`. |
| `action_items` | Extracted tasks. `group_name`, `title`, `category` (`School`/`Sports`/`Social`/`Other`), `deadline`, `is_completed`, `created_at`. Sorted newest-first. |
| `daily_summaries` | Non-actionable summaries (schema present; not actively populated by the current worker). |
| `push_subscriptions` | Web Push endpoints per user. `endpoint`, `p256dh`, `auth`, `user_agent`. |
| `notification_prefs` | One row per user. `daily_summary_enabled`, `send_hour_local`, `timezone`, `last_sent_on`, `test_requested_at`. |

### 7.6 How Things Connect

#### Ingesting a new task
1. Parent posts a message in a tracked WhatsApp group.
2. Worker receives the Baileys message event.
3. If it is a voice note, it downloads and transcribes it via Groq Whisper.
4. Worker checks the `ACTION_HINTS` keyword list; if actionable, it builds a structured task.
5. Worker signs its `user_id` with `WORKER_SECRET` into a `worker_token`.
6. Worker POSTs to `/api/public/ingest-task` with the token and task JSON.
7. App verifies the HMAC token, derives `user_id`, and inserts the row via the service-role client.
8. Supabase Realtime broadcasts the change; the Actions feed updates immediately.

#### Group selection flow
1. Worker connects and fetches all participating groups.
2. Worker POSTs them to `/api/public/worker-groups`, which upserts them with `is_tracked=false` by default.
3. User opens `/groups`, sees the list, toggles groups, and taps Save.
4. App updates `is_tracked` in Supabase.
5. Worker polls `/api/public/worker-groups` to refresh `selectedGroupJids` before processing messages.

#### Bridge status and QR rescan
1. Worker writes session state and heartbeat to `whatsapp_sessions` every 15 seconds via `/api/public/worker-groups`.
2. Settings screen subscribes to the row via Realtime and shows Connected / Offline / Waiting.
3. If offline, user taps "Restart connector"; app calls `/api/restart-bridge`, which redeploys the Railway service.
4. If user taps "Re-scan QR", app sets `reconnect_requested_at`; worker detects it within 2 seconds, clears the auth directory, and emits a fresh QR.

#### Notifications
1. User enables daily summary in Settings; browser requests permission and registers the `/push-sw.js` service worker.
2. Subscription keys are stored in `push_subscriptions`.
3. Worker pings `/api/public/notify-jobs` every 20 seconds.
4. App checks `notification_prefs` for the user's timezone, preferred hour, and whether a summary was already sent today.
5. If due, the app builds a bilingual message and signs/sends Web Push payloads using VAPID keys from Lovable Cloud secrets.
6. Dead endpoints (404/410) are pruned automatically.

### 7.7 Security Notes

- **Worker authentication**: HMAC-SHA256 token binding `user_id` to `WORKER_SECRET`. `user_id` is never taken from the request body.
- **RLS**: Users can only read/write their own rows. Worker uses the service-role client for writes but is authenticated by its own secret.
- **No chat logs**: The worker processes messages in memory and only sends extracted task metadata to the app backend.
- **VAPID keys**: Private VAPID key never leaves Lovable Cloud; worker only triggers delivery, it does not sign pushes.
- **Railway restart**: Only authenticated users can call `/api/restart-bridge`; the actual Railway credentials are backend secrets.

---

## 8. Implementation Notes

### 8.1 RTL / i18n readiness
- Use logical CSS properties (`ms-` / `me-`, `ps-` / `pe-`, `start` / `end`) where possible.
- Set `dir="rtl"` on the root element when Hebrew is active.
- Keep all user-facing strings in a single i18n dictionary so Hebrew translations can be added without touching components.

### 8.2 Privacy-first defaults
- Design the database schema around structured items, not messages.
- If a future feature needs to reference a message, store only a non-reversible identifier or hash — never the message body.

### 8.3 PWA scope
- Start with manifest-only installability.
- Add offline support only if explicitly requested, using the platform's guided PWA path.

---

## 9. Key Terms

| Term | Meaning |
|------|---------|
| **Task** | An actionable item extracted from a group message (pay, sign, send, RSVP, etc.). |
| **Digest / FYI** | A non-actionable summary or announcement. |
| **Group** | A WhatsApp group the parent belongs to (class, school, activity). |
| **Pairing** | The authenticated connection between the external worker and a user's WhatsApp account. |
| **Worker** | The external Node.js service that parses messages and writes structured data. |

---

## 10. Open Questions for Future Prompts

- Preferred authentication method for parents (magic link, email/password, Google, Apple)?
- Should the app support dark mode by default?
- Should tasks support push reminders, or only in-app due-date sorting?
- Do we need a web-based onboarding flow, or is pairing fully handled by the worker?

