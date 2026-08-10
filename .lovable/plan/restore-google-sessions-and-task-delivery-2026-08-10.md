# Restore Google sessions and task delivery

## Confirmed diagnosis

- Google itself is succeeding: the latest published-site attempts reached the auth backend and returned successful tokens. The remaining failure is the browser-side session handoff after Google returns.
- The worker is connected and receiving messages, but its current status is:

```text
messagesReceived: 5
skipped: { group-not-tracked: 4, sent-by-self: 1 }
actionableMessages: 0
tasksSent: 0
```

- Five of the 187 synced groups are currently selected in the database. The recent test messages came from a different group, and the one message sent from the linked WhatsApp account was intentionally ignored.
- No new task has reached the database since August 9, so this is not merely a feed-refresh problem.

## Implementation

1. **Make Google return through an explicit public callback.** Add a small `/auth/callback` route and send Google there instead of returning to the generic home page. The callback will wait for the returned auth session to be hydrated, verify the user with the auth service, and only then navigate to Actions.
2. **Make failed handoffs visible and recoverable.** Preserve the managed Google helper, remove assumptions that a successful provider login automatically means the app is signed in, and show a clear retry message if the callback receives no usable session. Email/password behavior remains unchanged.
3. **Keep one authoritative auth listener.** Consolidate session transition handling so Google return, refresh, and sign-out update the UI consistently without competing page-level timing races.
4. **Expose safe worker diagnostics.** Keep the zero-chat-retention rule, but improve counters/logging around group filtering, self-sent messages, extraction, and ingestion so the exact drop stage is immediately visible without recording message text.
5. **Refresh selected groups before filtering.** Ensure the worker promptly receives newly saved group selections rather than relying only on the next periodic refresh, while continuing to match groups by their stable WhatsApp group ID.
6. **Verify with the correct end-to-end test.** On the published site, complete Google sign-in, refresh, and confirm the same user remains signed in. Then select the exact test group, save it, wait for worker confirmation, and send a task-style message from a different participant. Confirm `actionableMessages`, `tasksSent`, and the Actions feed all update.

## Technical details

- Keep `lovable.auth.signInWithOAuth("google", ...)`; do not use a custom `/~oauth/initiate` flow or edit generated integration files.
- Use a same-origin public callback and sanitize any intended destination before navigation.
- Never log or retain raw WhatsApp message content. Group IDs/names already stored for selection may be logged only in private worker logs, not the public health endpoint.
- Continue ignoring `fromMe` messages to prevent loops; verification must use another group participant.
- No database schema change is expected.

## Expected result

The published app retains the Google session after the provider returns and after refresh. Messages from explicitly selected groups reach extraction and ingestion, while ignored messages have a clear non-sensitive reason in worker diagnostics.