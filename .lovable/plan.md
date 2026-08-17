# Simplify the Privacy & Security Page

Rewrite the `/privacy` screen so it states only what a parent needs to know about their data, removing implementation details about the background worker, third-party libraries, and internal infrastructure.

## What will change

1. Reduce the number of sections and strip technical terms.
2. Keep only the basics that matter to a user:
   - We do not save raw chat history.
   - We store only the groups they choose, the extracted tasks/summaries, and basic account info needed to sign in.
   - Google sign-in is handled by a managed auth service; the app does not store Google passwords or tokens.
   - Data is sent securely between the WhatsApp bridge and the app.
3. Remove all references to: Railway, Baileys, "worker", Lovable Cloud, HMAC, signed tokens, in-memory processing, and structured JSON.
4. Update the page subtitle, meta description, and Open Graph tags to match the simpler tone.
5. Keep the existing bilingual English/Hebrew copy, card layout, and RTL support.

## Technical details

- File: `src/routes/privacy.tsx`.
- No backend or route changes.
- No new dependencies.
- Preserve the visual style (card list, icons, language toggle behavior).
