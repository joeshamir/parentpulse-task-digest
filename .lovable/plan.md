# Fix Google sign-in at the actual broken handoff

## Confirmed cause

The published JavaScript currently compiles the browser backend variables as empty values. `AuthProvider` then exits early through `hasBackendConfig()` before the auth client is instantiated.

Google is successfully completing authentication and returning an app session in the URL fragment, but no running auth client processes that callback. This explains all three observed symptoms together:

- the tokens remain in the address bar;
- no session is persisted in browser storage;
- ParentPulse continues to appear signed out.

The installed auth client already supports this implicit callback correctly: on initialization it validates the returned token, saves the session, emits `SIGNED_IN`, and clears the URL hash. The custom callback patches were therefore treating a symptom rather than restoring the missing initialization.

## Implementation

1. **Restore the production browser backend binding**
   - Rebind ParentPulse to its canonical Lovable Cloud runtime configuration.
   - Confirm the next production bundle contains a real browser backend URL and publishable key rather than empty build-time values.
   - Keep private backend credentials server-only.

2. **Make auth initialization fail visibly instead of silently disabling itself**
   - Remove the `hasBackendConfig()` early return from `AuthProvider`.
   - Initialize the shared auth client unconditionally in the browser so OAuth callbacks cannot be skipped.
   - Preserve one shared auth listener and the current `getSession()` initialization path; this path triggers the library’s built-in callback processing.
   - Surface a clear configuration error if the production binding is ever absent again.

3. **Keep one supported Google flow**
   - Continue using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
   - Do not restore `/oauth-return`, manual hash parsing, or manual callback `setSession()` logic.
   - Reconfirm the managed Google provider is enabled for the project.

4. **Verify the complete published flow**
   - Check the emitted production bundle before publishing to ensure its browser auth configuration is present.
   - Verify the Google button reaches the managed provider flow.
   - After publishing, complete one real sign-in and confirm: the hash is removed, the session exists after refresh, the authenticated UI appears, and no auth/config errors are logged.

5. **Clean up the exposed session**
   - Once sign-in works, sign out globally and sign in again so the session shown in the address bar and screenshot is revoked and replaced.
   - Clear the affected URL from browser history. No project API-key rotation is needed because this is a user session token, not the project’s private backend key.

## Technical constraint

Do not edit the generated backend client or generated Lovable OAuth integration. The fix belongs in runtime binding plus the app-owned auth provider, preventing another competing callback implementation.