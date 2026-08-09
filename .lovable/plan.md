# Task ingestion endpoint for the external worker

Your worker needs a secure HTTP endpoint to push extracted tasks into the database. On this stack the right building block is a public backend route (not a separate edge function) — it deploys with the app, gets a stable URL, and can use the privileged database key server-side.

## Endpoint

`POST https://parentpulse-task-digest.lovable.app/api/public/ingest-task`

Request body (JSON):

```text
{
  "api_secret": "…",
  "group_name": "Grade 4B",
  "user_id": "<uuid>",
  "title": "Pay ₪50 for Zoo Trip",
  "category": "School",
  "deadline": "2026-08-13T14:00:00Z"   // or null / omitted
}
```

Responses:
- `200` → `{ "success": true, "id": "<record id>" }`
- `401` → `{ "success": false, "error": "unauthorized" }` (bad or missing secret)
- `400` → `{ "success": false, "error": "<validation message>" }`
- `500` → `{ "success": false, "error": "insert failed" }`

## Behaviour

1. Validate the payload shape and types; `category` must be one of School, Sports, Social, Other (anything else falls back to Other), `deadline` must parse as a date when present.
2. Compare `api_secret` against the `WORKER_SECRET` stored in the backend using a constant-time comparison, before any database work.
3. Insert one row into `action_items` with the privileged service key (bypasses per-user access rules, which is required since the worker has no user session), returning the new row id.
4. Never echo the secret back, and keep error messages generic.

## Secret setup

`WORKER_SECRET` is a shared value your worker must also hold, so you generate it yourself (e.g. `openssl rand -hex 32`), paste it into the secure form I open after this plan is approved, and configure the same value in your Node worker's environment.

## Technical notes

- New file `src/routes/api/public/ingest-task.ts` using `createFileRoute` with `server.handlers.POST`; the `/api/public/*` prefix bypasses site auth, so the secret check inside the handler is the only gate.
- Zod for payload validation; privileged client loaded inside the handler via `await import('@/integrations/supabase/client.server')`.
- Also handle `OPTIONS` and return permissive CORS headers so the worker can call it from any host.
- No schema change needed — `action_items` already has every column.
