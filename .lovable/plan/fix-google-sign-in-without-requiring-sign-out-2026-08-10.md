# Fix Google sign-in without requiring sign-out

## Confirmed failure

- On the published site, Google returns `access_token` and `refresh_token` in the URL fragment.
- The managed Google helper performs a full-page redirect in production, so its normal in-page `setSession` step does not run.
- The current auth client then attempts to interpret that fragment using a stricter callback format. When the extra fields it expects are absent, it neither creates a session nor removes the tokens from the address bar.
- The global auth provider starts reading auth state immediately, but there is currently no app-owned callback bootstrap that first consumes the returned credentials.

## Implementation

1. Add a single root-level OAuth callback bootstrap that runs before the normal auth provider initializes.
2. When Google returns credentials in the fragment, synchronously capture them and scrub the address bar before making any auth request.
3. Pass the captured access and refresh tokens to the backend auth client with `setSession`, wait for a verified user, then continue into the app.
4. Keep the editor popup flow unchanged; the bootstrap only activates when a full-page callback fragment is present.
5. Add a bounded error state with a clean retry action. Recovery will clear only invalid local auth state and will not require the user to sign out first.
6. Remove any competing or obsolete callback handling so there is exactly one owner of the production redirect handoff.

## Verification

- Test a signed-out visit to the published app, start Google sign-in, and confirm the account chooser/consent flow opens.
- Confirm the return URL is scrubbed immediately, the app becomes signed in, and the authenticated Groups data appears.
- Refresh the published page and confirm the session persists.
- Verify the editor-preview Google flow still works.
- Confirm failed or incomplete callbacks show a retry action rather than an infinite spinner or exposed token.

## Technical constraint

The generated backend client and managed Lovable auth integration files will remain untouched. The callback coordination will live in application-owned auth code around the root provider.