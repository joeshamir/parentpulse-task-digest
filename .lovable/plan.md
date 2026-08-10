# Stop the Google callback from hanging

## Confirmed findings

- The published site is serving the latest `/oauth-return` callback bundle, including token extraction, URL cleanup, `setSession`, and user verification.
- The callback screen remains in its initial loading state while awaiting an authentication operation.
- The current callback has no timeout around `setSession()` or `getUser()`. If either request stalls, no success or error state can render, which exactly matches the screenshot.
- Recent backend auth records show Google is successfully issuing logins, so the unresolved failure is still the browser-side session completion rather than Google account selection or consent.

## Plan

1. Add a short, bounded timeout to every callback authentication operation so the screen can never spin indefinitely.
2. Use the session returned directly by `setSession()` as the primary success signal, avoiding a redundant second identity request during the fragile handoff.
3. Keep server-validated `getUser()` for callbacks that arrive without URL credentials but may already have a persisted popup session.
4. Ensure every path—success, provider rejection, missing credentials, invalid credentials, network failure, or timeout—sets an explicit UI state.
5. On success, replace the callback URL with `/`; on failure, show the retry action without an automatic redirect loop.
6. Verify with browser tests that malformed credentials time out into the error state, missing credentials fail immediately, the URL fragment is always removed, and an existing valid session proceeds home.

## Security

- Credentials will continue to be removed from browser history before any network request.
- No tokens or provider error details will be logged or rendered.
- After deployment, sign out and sign back in once because the previous callback URL was shared and contained session credentials.