# Paste-ready Project Knowledge text

The Project knowledge box in Settings is separate from the repo's `KNOWLEDGE.md` — it starts empty and must be filled in by hand.

## Deliverable

A condensed version of the architecture doc, written to `KNOWLEDGE-SHORT.md` in the project root, sized to paste into the Project knowledge box. Target ~60-80 lines.

## Sections it will include

- What ParentPulse is, who it's for, Israel / bilingual Hebrew-English + RTL.
- Stack: TanStack Start, React 19, Tailwind v4, Lucide, Lovable Cloud.
- Routes: `/` actions feed, `/groups`, `/settings`, `/auth`, `/privacy`; `MobileShell` 3-tab dock; `lang.tsx` i18n; `auth.tsx` session context.
- Public API routes: `ingest-task`, `worker-groups`, `notify-jobs`, `vapid-key`, plus authenticated `restart-bridge`.
- External Railway worker: Baileys + Groq Whisper, in-memory parsing, HMAC `worker_token`, heartbeat, reconnect polling.
- Tables: `whatsapp_sessions`, `tracked_groups`, `action_items`, `daily_summaries`, `push_subscriptions`, `notification_prefs` — all RLS-scoped to `user_id`.
- Standing rules: never store raw chat logs; design tokens in `src/styles.css`, no hardcoded colors; RTL-safe logical CSS; all strings via the i18n dictionary; worker `user_id` always derived from the verified token.

## Not in scope

No app code, schema, or UI changes. Pasting the text into Settings -> Knowledge is a manual step on your side.
