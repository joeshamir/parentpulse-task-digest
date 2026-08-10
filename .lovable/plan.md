# Fix Google sign-in session handoff

## Confirmed diagnosis

- Google authentication is enabled and the hosted backend is healthy.
- Recent Google attempts complete successfully at the auth provider and return HTTP 200 tokens.
- The app currently adds a custom `window.location.href = /~oauth/initiate...` fallback around Lovable’s managed sign-in helper. That fallback bypasses the helper’s normal popup response and browser-session handoff, matching the observed behavior: Google accepts the login, but ParentPulse remains signed out.

## Implementation

1. Simplify the Google button to call the managed `lovable.auth.signInWithOAuth("google")` flow directly during the click gesture, with the public app origin as its callback.
2. Remove the custom `/~oauth/initiate` fallback and avoid navigating home until a real authenticated session has been confirmed.
3. Make the auth screen react to the confirmed auth-state event, then redirect to Actions; show a clear retryable error if Google closes or rejects the flow.
4. Preserve email/password authentication unchanged.

## Verification

1. Test from the live-style browser flow: click Google, complete account selection, and confirm ParentPulse leaves `/auth` for `/`.
2. Verify the browser has a valid signed-in user after return and that refreshing keeps the session.
3. Check for popup, callback, console, and network errors, then verify sign-out/sign-in works a second time.
4. Confirm the auth provider remains configured for Google before publishing the frontend update.

## Expected result

Google sign-in completes through the supported managed flow, ParentPulse recognizes the returned session, redirects to Actions, and remains signed in after refresh.