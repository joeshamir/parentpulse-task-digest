# Privacy & consent compliance (Israel Amendment 13 + GDPR-style basics)

Controller: יונתן שמיר, Israel — joeshamir@gmail.com. Everything below ships bilingual (he/en) through the existing i18n dictionary and RTL-safe layout.

## 1. Consent at signup
- Two checkboxes on the signup form in `/auth`:
  - Required: I agree to the Terms of Use and Privacy Policy (links open the pages).
  - Required: I confirm I am a member of the WhatsApp groups I connect and I take responsibility for informing group members that an assistant extracts tasks from their messages.
  - Optional: product/notification emails (unchecked by default).
- Signup blocked until the required boxes are ticked (client validation + server-side check on the consent record).
- Short plain-language line above the button explaining what is collected and why (lawful basis: consent + service performance).
- Google sign-in: same consent gate shown before the OAuth redirect; existing users who signed up before this change see a one-time consent screen on next launch.

## 2. Consent record in the database
New table `user_consents`: `user_id`, `consent_version`, `terms_accepted_at`, `privacy_accepted_at`, `group_notice_accepted_at`, `marketing_opt_in`, `locale`, `created_at`. RLS scoped to `auth.uid() = user_id`, with the required GRANTs. Version constant bumped whenever the policy text materially changes, which re-triggers the one-time consent screen.

## 3. Legal pages (rewritten `/privacy`, new `/terms`)
Privacy Policy expanded to meet Israeli Privacy Protection Law notice duties while staying readable:
- Who the controller is and how to reach them.
- Exactly what is stored (account/email, selected groups + group names, extracted task text, group address, push subscriptions, notification preferences) and what is never stored (raw messages, media, voice audio, contacts, phone numbers of other members).
- Purpose and lawful basis, third parties involved (cloud database/auth/hosting, transcription and classification services, push delivery), and that data may be processed outside Israel.
- Retention periods, security measures, and the full list of user rights under Israeli law and GDPR: access, correction, deletion, objection, withdrawal of consent — plus how to exercise them in-app and by email, and the right to complain to the Privacy Protection Authority.
- Minors: the service is for parents (18+); children's data is not knowingly collected.

New `/terms` page: acceptable use, that the user must be a legitimate member of connected groups, no warranty, account termination, governing law (Israel).

Both pages linked from Settings, the signup screen, and the footer, with proper `head()` metadata.

## 4. Data rights self-service (Settings)
- **Download my data** — one server function returns a JSON file with the user's profile, tracked groups, tasks, summaries, notification prefs and consent records.
- **Delete my account and data** — typed confirmation, then a server function that deletes all rows across the user's tables, revokes the WhatsApp session and push subscriptions, and deletes the auth user. Signs out and shows a confirmation.
- **Withdraw consent** — disconnects the WhatsApp bridge and stops all processing without deleting history, with a link to full deletion.

## 5. Third-party (group member) notice
- A short, copyable Hebrew/English notice in Settings the user can paste into a group ("an assistant of mine extracts action items from this group; message content is not stored").
- A one-line disclosure on the Groups screen above the list.
- A public section on `/privacy` addressed to group members explaining what is and isn't processed and how to ask for removal.

## 6. Retention controls
- Default retention: completed tasks deleted 30 days after completion; all tasks deleted 12 months after creation; daily summaries after 90 days; disconnected WhatsApp sessions cleared after 30 days.
- Implemented as a scheduled cleanup (pg_cron calling a public API route protected by the existing worker-token scheme), with the periods stated verbatim in the Privacy Policy.
- Settings shows the active retention window; the user can shorten completed-task retention to 7 days.

## Technical notes
- New migration: `user_consents` table + retention cleanup function/cron, RLS and GRANTs per project rules.
- New server functions in `src/lib/privacy.functions.ts` for export, deletion, and consent recording; account deletion needs the admin client loaded inside the handler after verifying the caller.
- New routes: `src/routes/terms.tsx`; rewritten `src/routes/privacy.tsx`; consent gate component reused by `/auth` and the one-time re-consent screen.
- All strings via `src/lib/lang.tsx`; tokens only, no hardcoded colors.

## Not legal advice
This implements standard notice/consent/rights mechanics. Have the final policy text reviewed by an Israeli privacy lawyer before wide launch.
