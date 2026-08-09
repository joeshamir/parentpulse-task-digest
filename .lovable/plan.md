# Restore the backend connection values

## What I found

Your project's backend URL and public key are present and healthy in the project's environment configuration (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, plus their browser-visible `VITE_` twins). They just don't appear in the **Secrets** list, because that list only shows secrets you add yourself — the backend connection values are managed automatically and live outside it. So nothing is actually broken.

The `ingest-task` endpoint already exists at `src/routes/api/public/ingest-task.ts`.

## Plan

1. Run the backend rebind so the managed values are re-derived and refreshed in the running sandbox (safe, idempotent, rotates nothing).
2. Confirm the app still boots and the backend responds.
3. Report back the shape of the URL you need for your external worker, and point you at the exact place to copy the real value from.

## Where to get the value for your worker

Once rebound, use these from the project environment file (not the Secrets panel):

```text
SUPABASE_URL             -> https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY -> public API key (safe to embed)
```

Your Node worker posting to `ingest-task` doesn't actually need either of these — it only needs the endpoint URL plus `WORKER_SECRET`, which is already configured:

```text
POST https://parentpulse-task-digest.lovable.app/api/public/ingest-task
```

## Technical notes

- Rebind uses the managed backend binding refresh; it does not rotate keys or invalidate existing sessions.
- No app code changes are involved.
