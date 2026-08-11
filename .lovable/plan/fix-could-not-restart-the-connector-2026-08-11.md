# Fix "Could not restart the connector"

## What's happening

The restart request reaches Railway, but Railway rejects it with **"Not Authorized"**. The app then shows a generic Hebrew message that hides Railway's real reason, so it looks like a mystery failure.

Two separate problems:

1. **Token type / header mismatch.** The code always sends `Authorization: Bearer <token>`. That only works for Railway *account* tokens. A *project*-scoped token must be sent as a `Project-Access-Token` header instead — with the wrong header Railway answers "Not Authorized".
2. **Error message is swallowed.** The Hebrew branch of the toast is hardcoded, so the actual server message never reaches the user (or you) in Hebrew mode.

## The fix

1. **Send both auth styles.** In the Railway helper, first attempt with `Authorization: Bearer`, and if the response is an authorization error, retry the same mutation with the `Project-Access-Token` header. This makes either token type work without you having to know which one you created.
2. **Surface the real reason.** Show Railway's actual message in the toast in both languages, prefixed with a short bilingual label, so any future failure is self-explanatory.
3. **Clear guidance when it still fails.** If Railway keeps rejecting, the toast will say the connector token needs re-issuing, and the existing manual "Re-scan QR" path stays available as a fallback.

## Technical details

- `src/lib/railway.server.ts`: extract the header construction; on `errors` containing "not authorized"/"unauthorized" or HTTP 401/403, retry with `{ 'Project-Access-Token': apiToken }` (no Authorization header). Keep the existing `serviceInstanceRedeploy` → `serviceInstanceDeploy` fallback for each auth mode.
- `src/routes/groups.tsx`: in the failure branch, pass `body.error` through for both `en` and `he` (e.g. `he: body.error ? \`שגיאה: ${body.error}\` : "לא ניתן להפעיל את המחבר מחדש."`).
- No schema or worker changes.

## If it still says "Not Authorized"

The saved `RAILWAY_API_TOKEN` may lack access to that project. Creating a new token from Railway → Account Settings → API Tokens (account-scoped, not project-scoped) and re-saving it resolves that case.
