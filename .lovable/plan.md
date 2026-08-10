# Fix the stuck Google sign-in handoff

## Confirmed behavior

- The screenshot is ParentPulse’s `/oauth-return` page, not Google’s account/consent screen.
- The app currently sends Google back to `/oauth-return`, where it repeatedly checks for a signed-in user. If no browser session was established, it eventually remains on the failure state shown.
- Google may skip its consent page when the same account has already approved the basic profile/email permissions, and may skip account selection when only one Google account is active. However, ParentPulse should still receive a valid session and leave this page.

## Plan

1. Re-activate the managed Google sign-in provider so its current callback and published-domain configuration are refreshed.
2. Return the Google flow to the public app origin, which is the managed helper’s supported default, instead of relying on the custom `/oauth-return` session polling page.
3. Let the managed helper complete its popup/token handoff, and navigate only after the central auth provider confirms a real signed-in user.
4. Keep `/oauth-return` as a recoverable compatibility route temporarily, but make it send users back to sign-in promptly when no session arrives rather than appearing to load indefinitely.
5. Verify on the published domain in a fresh/private browser window: Google opens, account selection or consent appears when Google requires it, ParentPulse becomes signed in, and refresh preserves the session.

## Technical details

- Keep using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` directly inside the button click.
- Do not use a hand-built `/~oauth/initiate` URL or edit generated integration files.
- Preserve email/password sign-in unchanged.
- Re-publish after verification so the corrected callback behavior reaches the installed PWA and published website.

## Expected result

The Google UI appears when Google requires account choice or fresh consent; otherwise it may complete immediately. In either case, ParentPulse receives the authenticated session and opens the Actions screen instead of remaining on “Finishing sign in.”