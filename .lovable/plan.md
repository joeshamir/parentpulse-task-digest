# Fix Google sign-in session handoff

## Confirmed diagnosis

- Google authentication succeeds and returns an authenticated session.
- The published flow returns to the site root with `access_token` and `refresh_token` in the URL fragment.
- The app currently sends Google back to `/`, while its dedicated `/oauth-return` route only checks for an already-stored session; it does not consume returned credentials.
- The managed auth wrapper can store tokens for its popup flow, but its full-page redirect exits before that wrapper code runs.

## Plan

1. Change Google’s public return URL to `/oauth-return` so all full-page responses land on the dedicated callback screen.
2. On that route, detect the returned credential fragment, immediately remove it from the visible URL/history, and pass the credentials to the existing auth client to establish the browser session.
3. Revalidate the signed-in user, let the shared auth provider update, then replace the callback route with the ParentPulse home screen.
4. Add clear failure handling for missing, malformed, or rejected callback credentials instead of polling for a session that was never stored.
5. Preserve the existing managed popup behavior in the editor and avoid exposing credentials in logs, UI, query parameters, or application state.
6. Verify both flows: published-style callback credentials produce a persistent session with a clean URL, and the editor’s Google button still launches the managed provider correctly.

## Security follow-up

The URL pasted into chat contains a live access token and refresh token. After the corrected flow is deployed, sign out and sign back in to invalidate/replace that exposed session. Do not share another callback URL containing `access_token` or `refresh_token`.

## Technical details

- Keep `/oauth-return` public and client-rendered.
- Use `supabase.auth.setSession(...)` only on the callback route after validating both required token fields.
- Call `history.replaceState` before network validation so credentials are removed even if session establishment fails.
- Do not alter the generated backend client or implement a raw Google OAuth flow.