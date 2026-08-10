# Fix Google sign-in on the published app

## What we know

- The Google button on `/auth` calls the managed Lovable sign-in helper directly, so the provider itself is wired up.
- Backend auth records show Google logins completing successfully today from the published site, meaning the provider is enabled and the token exchange works.
- On your device the popup never appears. That points at the browser blocking the sign-in window rather than a rejected login: the button gives no visible feedback, so a blocked popup looks like "nothing happened".

## What to change

1. **Make the button say what happened.** Add a busy state and surface the real failure text instead of a generic message, so a blocked popup, a cancelled login, and a provider error are told apart on screen.
2. **Add a redirect fallback.** If the sign-in window does not open (popup blocked) or is closed without a result, fall back to a full-page sign-in redirect back to the app origin. This is the path that works reliably in installed PWAs and on mobile Safari/Chrome, where popups are commonly suppressed.
3. **Make sure the app moves on after login.** Drive the post-login navigation from the confirmed session (auth state change) rather than only from the button's return value, so a session that arrives via redirect also lands you on the Actions tab.
4. **Verify.** Check the sign-in flow in a browser here, confirm a session is established and the app navigates, then republish so the fix reaches the live site.

## Technical notes

- `src/routes/auth.tsx`: keep calling `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` from the click handler with no awaits before it (preserves the user gesture). Add `googleBusy` state, show `result.error.message`, and on popup-blocked/no-result trigger the redirect flow to the same public origin.
- Do not modify `src/integrations/lovable/*` (auto-generated).
- `redirect_uri` stays `window.location.origin` — a public route, never a gated one.
- Post-login navigation already flows through `useAuth`'s `onAuthStateChange`; the existing `useEffect` redirect on `/auth` covers the redirect return.
- Frontend-only change, so it needs a publish **Update** to reach `parentpulse-task-digest.lovable.app`.
