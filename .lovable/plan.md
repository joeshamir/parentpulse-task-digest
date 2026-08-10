# Change Worker secrets and USER_ID

Short answer:
- **USER_ID** — No. This is your Supabase auth user UUID (`8f7300e7-06a5-4322-b391-7364d92fe90c`). It is your permanent account identifier and cannot be regenerated.
- **WORKER_SECRET** — Yes. This is the shared key your Node worker sends as `api_secret` to `/api/public/ingest-task`. You can rotate it any time.

## How to rotate WORKER_SECRET

1. Generate a new strong random value locally:

```text
openssl rand -hex 32
```

2. I will open a secure form where you paste that value to replace the current `WORKER_SECRET` in Lovable Cloud.
3. You then update the same value in your Railway worker Variables tab as `WORKER_SECRET`.
4. The old secret stops working immediately, so update Railway right after saving here.

## What does not need to change

- `INGEST_URL` and `GROUPS_URL` in Railway stay the same.
- `USER_ID` in Railway stays the same.
- No code changes are required; `src/routes/api/public/ingest-task.ts` already reads `process.env['WORKER_SECRET']` and compares it in constant time.

## Acceptance

- New `WORKER_SECRET` saved in Lovable Cloud.
- Railway worker updated with the same new value.
- A test POST to `/api/public/ingest-task` with the new secret returns `{ success: true, id: ... }`; the old secret returns `401`.
