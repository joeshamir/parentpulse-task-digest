# ParentPulse — Project Knowledge (paste-ready)

## What it is
ParentPulse is a mobile-first PWA that turns noisy Israeli school/class/activity WhatsApp groups into a calm dashboard of actionable tasks. It is not a chat app — it is a read-only decision-support layer.

- Market: Israel. Bilingual Hebrew/English UI with native RTL layout.
- Aesthetic: calm, structured, zero clutter. Slate/ecru canvas, white cards, 1px borders, Electric Indigo (#4F46E5) accents, frosted-glass floating bottom dock.

## Stack
TanStack Start (file-based routes, SSR on Cloudflare Workers) · React 19 · Tailwind CSS v4 (`src/styles.css`) · Lucide Icons · Lovable Cloud (Supabase: Postgres, auth, realtime) · external Node.js worker on Railway.

## Frontend
| Route | Purpose |
|---|---|
| `/` | Actions feed: live tasks, category filter, mark complete, swipe-to-delete, newest first |
| `/groups` | Group list: search, toggle tracking, save selections |
| `/settings` | Bridge status, QR rescan, one-tap Railway restart, daily-summary push, language toggle, sign out |
| `/auth` | Email/password + Google sign-in |
| `/privacy` | Short, non-technical privacy basics |
| `/digest` | Legacy, not in navigation |

- `src/components/MobileShell.tsx` — header, language toggle, 3-tab dock (Actions, Groups, Settings).
- `src/lib/lang.tsx` — `en`/`he` in localStorage, sets `dir="rtl"`, exposes `t()`.
- `src/lib/auth.tsx` — Supabase session context + `useAuth()`; `src/lib/google-signin.ts` handles OAuth callback scrubbing.
- `src/lib/push.ts` — registers `/push-sw.js`, stores subscriptions.

## API routes
| Route | Purpose |
|---|---|
| `POST /api/public/ingest-task` | Worker sends an extracted task; HMAC token verified, row inserted |
| `POST /api/public/worker-groups` | Group sync, session state, heartbeat; returns tracked JIDs + reconnect flag |
| `POST /api/public/notify-jobs` | Worker ping; the app signs and sends Web Push with VAPID secrets |
| `GET /api/public/vapid-key` | Public VAPID key for browser subscription |
| `POST /api/restart-bridge` | Authenticated; redeploys the Railway worker via GraphQL |

## External worker (`worker/`, Railway)
Node.js 20 long-running process. Baileys for WhatsApp Web, Groq Whisper v3 Turbo for Hebrew voice notes, auth state on a `/data` volume (`AUTH_DIR=/data/auth_session`). Polls tracked groups every 60s, listens only to tracked groups, transcribes and keyword-extracts in memory (`ACTION_HINTS`, EN + HE), posts structured JSON only. Heartbeats every ~15s, pings notify-jobs every 20s, watches `reconnect_requested_at` to clear auth and emit a fresh QR.

## Data (public schema, RLS scoped to `auth.uid() = user_id`)
- `whatsapp_sessions` — one per user: `status` (pending_qr/connected/disconnected), `qr_code_str`, `reconnect_requested_at`, `updated_at` heartbeat.
- `tracked_groups` — `group_jid`, `group_name`, `is_tracked`; unique `(user_id, group_jid)`.
- `action_items` — `group_name`, `title`, `category` (School/Sports/Social/Other), `deadline`, `is_completed`, `created_at`.
- `daily_summaries` — present, not actively populated.
- `push_subscriptions` — `endpoint`, `p256dh`, `auth`, `user_agent`.
- `notification_prefs` — `daily_summary_enabled`, `send_hour_local`, `timezone`, `last_sent_on`.

Realtime is on for `action_items` and `whatsapp_sessions`. The service-role client (`client.server.ts`) is used only in trusted server handlers for worker writes.

## Standing rules
- Never store raw chat messages, media, or voice audio. Structured task metadata only.
- Worker `user_id` is always derived from the verified HMAC `worker_token`, never from the request body.
- Private VAPID key stays in Lovable Cloud; the worker only triggers delivery.
- Colors/shadows come from design tokens in `src/styles.css` — no hardcoded `bg-white`/hex utilities in components.
- RTL-safe: use logical properties (`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`).
- All user-facing strings go through the i18n dictionary in `src/lib/lang.tsx` — never inline English in components.
- App-internal server logic uses `createServerFn`; external callers use `src/routes/api/public/*`. No Supabase edge functions.
- PWA is manifest-only installability; no offline mode unless requested.
