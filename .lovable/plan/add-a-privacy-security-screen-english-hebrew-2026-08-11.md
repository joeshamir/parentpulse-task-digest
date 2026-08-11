# Add a Privacy & Security Screen (English + Hebrew)

Add a dedicated, mobile-first Privacy & Security screen that explains, in plain language, how ParentPulse handles user data and trust.

## What will be built

1. New route `/privacy` under the existing mobile shell.
2. A "Privacy & Security" link inside the Groups & Settings tab.
3. A bilingual content file with English and Hebrew copy for every section.
4. Simple visual cards matching the existing soft-card aesthetic.

## Screen content (bilingual)

- **WhatsApp connection**: the app does not connect directly; a separate Railway worker uses Baileys to stay logged in.
- **Zero chat-log retention**: raw messages are processed in memory and never stored in the database.
- **What is stored**: `whatsapp_sessions`, `tracked_groups`, `action_items`, `daily_summaries`, plus Google account basics handled by managed auth.
- **Google sign-in security**: handled by Lovable Cloud managed auth; tokens are not stored in the app's database.
- **Worker authentication**: the worker sends data using a signed HMAC token plus `WORKER_SECRET`, so random traffic cannot post fake tasks.
- **Trust notes**: the worker must remain running to read messages; anyone with Railway access or the worker files could theoretically see messages, so the `/data` volume and Railway account security matter.

## Technical details

- Create `src/routes/privacy.tsx` with `createFileRoute("/privacy")`.
- Reuse `MobileShell`, `useLang`, and existing card/typography utilities.
- Add a navigation row in `src/routes/groups.tsx` linking to `/privacy` with a `ShieldCheck` or `Lock` icon.
- Store all copy in a local bilingual object so toggling language works instantly.
- Add route-level `head()` metadata in English and Hebrew (title/description).
- No backend changes; the screen is static content.
