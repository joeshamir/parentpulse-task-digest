# Rotate WORKER_SECRET

Your `USER_ID` is your account's permanent identifier and can't be regenerated — but the shared worker key can. `WORKER_SECRET` is the value your Node worker sends as `api_secret` to `/api/public/ingest-task`, and rotating it invalidates the old one.

## How rotation works

`WORKER_SECRET` is a shared secret: the same value must exist in two places — this project and your worker's environment. Because stored secret values are never revealed back, you generate the new value yourself and paste it in both places.

1. Generate a strong random value locally:

```text
openssl rand -hex 32
```

2. I open a secure form where you paste that value to replace the current `WORKER_SECRET`.
3. You update your worker's `.env` with the same value as `WORKER_SECRET` (sent as `api_secret` in the POST body).

## Cutover note

The endpoint accepts exactly one secret at a time, so there's a short window where the worker fails with `401 unauthorized` until you update its `.env`. Update the worker right after saving the new value.

## No code changes

`src/routes/api/public/ingest-task.ts` already reads `process.env['WORKER_SECRET']` and compares it in constant time. Nothing in the codebase needs editing — this is a secret swap only.

## Acceptance

- New value saved in project secrets.
- Worker `.env` updated with the same value.
- A test POST to `/api/public/ingest-task` with the new secret returns `{ success: true, id: ... }`; the old secret returns `401`.
