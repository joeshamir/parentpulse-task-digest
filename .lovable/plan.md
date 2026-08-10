# Fix Google sign-in at the broken handoff

## Confirmed diagnosis

- Google and the backend are completing authentication successfully: the auth records show successful Google token exchanges (`200`) for this account. The failure is therefore after Google returns to the browser, not in Google credentials or provider configuration.
- ParentPulse overrides the managed flow’s return URL with `/oauth-return` in `src/routes/auth.tsx`.
- That custom route manually parses session credentials from the URL and calls `setSession()` while the app-wide `AuthProvider` is simultaneously initializing and validating auth. This duplicates the session handoff already owned by the managed Lovable auth helper/client and introduces competing auth initialization on the callback page.
- The managed integration wrapper already saves popup-flow tokens itself. For full-page flow, the supported return target is the public app origin, where the auth client consumes the provider response. The custom callback is the broken boundary; timeout UI only hides that boundary failure.

## Implementation

1. **Restore the managed Google flow**
   - Change Google sign-in to use `window.location.origin` as its public return URL.
   - Keep the managed `lovable.auth.signInWithOAuth("google", ...)` call as the only OAuth entry point.
   - Remove the post-helper `getUser()` race; popup completion will be driven by the shared auth state listener.

2. **Remove the competing callback implementation**
   - Delete the custom `/oauth-return` route and all manual URL-token parsing, `setSession()`, timeout, and spinner logic.
   - Do not expose, copy, or manually shuttle session credentials through application code.

3. **Make auth initialization deterministic**
   - Keep one app-wide `onAuthStateChange` subscription.
   - Initialize local auth state from the persisted session once, then validate the user without competing callback-page operations.
   - Navigate away from `/auth` only after the shared provider reports an authenticated session.

4. **Verify both managed paths**
   - Browser/popup path: Google completes, `/auth` exits, the user and real Groups data appear, and refresh preserves the session.
   - Full-page fallback path: Google returns to the app origin, the URL is clean after client processing, and the same persisted session is available.
   - Check console and auth-network requests for errors; verify sign-out and a second sign-in as a clean-session test.

## Technical scope

Files: `src/routes/auth.tsx`, `src/lib/auth.tsx`, and removal of `src/routes/oauth-return.tsx`. No database or worker changes are needed for this authentication fix.
