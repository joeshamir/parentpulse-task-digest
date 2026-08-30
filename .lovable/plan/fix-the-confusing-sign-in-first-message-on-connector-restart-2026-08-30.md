# Fix the confusing "Sign in first" message on connector restart

## What's happening

On the Settings screen, the orange "Restart connector" button is shown whenever the bridge looks offline. But the bridge also *looks* offline when you're not signed in (or your session is still loading): no session data is fetched, `lastSeen` stays empty, and the "Connector offline" warning card appears anyway.

Tapping the button then hits the `if (!user)` guard in `restartBridge()` and shows the bare toast "יש להתחבר תחילה" ("Sign in first") — with no explanation and no way forward. That's the confusing state in your screenshot.

## The fix

1. **Don't offer actions that can't work.** When there is no signed-in user (or the session is still loading), the WhatsApp Bridge card no longer shows the offline warning and restart/re-scan buttons. Instead it shows a calm, explicit state: "Sign in to manage the connector" with a button that takes you to the sign-in screen.

2. **Make the restart button resilient.** `restartBridge()` currently gives up if the auth context hasn't delivered a user yet, even when a valid session exists. It will fall back to `supabase.auth.getSession()` — if a session is found, the restart proceeds instead of erroring.

3. **Clearer wording when sign-in genuinely is required.** Replace the bare "Sign in first" toast (here and on the other Settings actions: notifications toggle, test task, re-scan QR) with a message that says what to do, e.g. "Sign in to manage the connector — taking you to sign in", and navigate to the auth screen instead of dead-ending on a toast.

## Technical details

- `src/routes/settings.tsx`:
  - Pull `loading` from `useAuth()`; derive `signedOut = !loading && !user`.
  - Gate the bridge card body: `signedOut` (or loading) → sign-in prompt + link to `/auth`; otherwise existing offline/QR/connected states.
  - `restartBridge()`: replace the early `!user` return with `getSession()` as the source of truth; only show the sign-in message when no session token exists.
  - Update the "Sign in first" toasts in `toggleNotifications`, `sendTestTask`, `requestReconnect` to the actionable message + `navigate('/auth')`.
- No backend, worker, or schema changes.

## Result

The restart button can no longer lead to a dead-end toast: you either get a working restart, or a clear sign-in prompt that takes you to the sign-in screen.
