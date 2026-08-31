# Tap a task to jump to the WhatsApp group

## Short answer

Yes — and it can be done without storing a single word of chat content. What is *not* possible is landing on the exact message: WhatsApp offers no public link that opens a specific message in someone else's chat. The realistic behaviour is: tapping a task opens WhatsApp directly on the group the task came from, where the message is a short scroll away.

## What's confirmed today

- `action_items` stores `group_name` only — no group identifier.
- `tracked_groups` already stores `group_jid` per group, so the identifier exists in the app; it just isn't carried onto tasks.
- The worker sends only `group_name` when it posts a task.

## What to build

1. **Carry the group identifier onto tasks**
   - Add a nullable `group_jid` column to `action_items`.
   - Accept an optional `group_jid` in the task ingest endpoint and store it.
   - Have the worker include the group's JID (an address, like a phone number — not message content) when it sends a task.
   - Older tasks without a JID simply aren't tappable; new ones are.

2. **Make the card tappable**
   - Tapping the card body (not Done, not the delete action, not during a swipe) opens WhatsApp at that group.
   - Mobile: use the WhatsApp app link `whatsapp://chat?jid=<group_jid>`; if nothing happens within a moment, fall back to opening WhatsApp normally so the user is at least in the right app.
   - Desktop/browser: group deep links aren't supported there, so show a small toast explaining it opens on the phone, and offer "Copy group name" instead.
   - Add a subtle affordance on the card (a small "Open in WhatsApp" chevron/label, bilingual) so the tap target is discoverable rather than hidden.

3. **Keep the privacy promise intact**
   - No message text, media, sender, or message ID is stored — only the group address, which is the same class of data already kept in the group list.
   - Privacy page wording stays accurate; no change needed.

## Honest limitation

If precise message-level jumping matters more than the effort, the only way to get closer is storing a message reference, which WhatsApp still can't open directly — so it would buy nothing. Group-level is the ceiling.

## Technical scope

Migration on `public.action_items` (add `group_jid text`), `src/routes/api/public/ingest-task.ts`, `worker/src/index.js` + `worker/src/ingest.js`, `src/lib/action-items.ts` (pass the JID through to the task shape), `src/components/TaskCard.tsx` (tap handling + affordance), `src/lib/lang.tsx` strings. The worker change needs a Railway redeploy, which briefly drops the WhatsApp link and reconnects from saved auth state.
