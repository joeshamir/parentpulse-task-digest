# Expose current user ID for the external worker

Your Node worker needs a `user_id` to include when it calls `/api/public/ingest-task`. The safest approach is to show the signed-in parent their own UUID inside the app, so they can copy it into their worker environment.

## Proposed change

Add a read-only "Integration ID" section to the **Groups & Settings** tab:

```text
Connected as: parent@example.com
Integration ID: <uuid>
[Copy]
```

- The value is fetched from the authenticated Supabase session (`user.id`).
- Only visible when signed in; signed-out users see a sign-in prompt instead.
- Tapping the copy button copies the UUID to the clipboard and shows a short toast.

## Why not expose it here

User IDs are auth identifiers; I avoid writing them in chat to prevent accidental leakage. A self-serve UI element keeps the credential under your control.

## Files to update

- `src/routes/groups.tsx` — add the Integration ID row and copy action.
- `src/hooks/useAuth.ts` — already exposes `user.id`; no change needed unless we add a server-safe helper.

## Optional: a server function fallback

If you prefer the worker to discover the user by email instead of hard-coding a UUID, we could later add a secure lookup endpoint (email + WORKER_SECRET → user_id). That is out of scope for this plan.

## Acceptance

- Sign in, open Groups & Settings, see your Integration ID.
- Tap Copy, paste into your worker `.env` as `USER_ID`.
- Value matches the `user_id` accepted by `/api/public/ingest-task`.
