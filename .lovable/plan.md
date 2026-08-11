# Plan: In-App QR Code & One-Tap Reconnection

## Current state

- The Railway worker prints the WhatsApp QR code only to the Railway terminal (as a URL and ASCII art).
- The ParentPulse app reads `whatsapp_sessions.status` to show "Connected" / "Waiting for connection".
- The "Re-scan QR" button in `src/routes/groups.tsx` only fires a toast; it does not communicate with the worker.
- `whatsapp_sessions.qr_code_str` exists in the schema but is always set to `null`.
- `whatsapp_sessions` is not in the Supabase Realtime publication, so status changes in the app may not be live.

## Goal

Show the WhatsApp QR code directly inside the ParentPulse app, and make reconnecting a single tap when the connection drops or the session is logged out.

## Proposed changes

### 1. Database

Add a reconnect-request flag to `public.whatsapp_sessions`:

```sql
ALTER TABLE public.whatsapp_sessions ADD COLUMN reconnect_requested_at timestamptz;
ALTER TABLE public.whatsapp_sessions ADD COLUMN qr_code_str text;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
```

### 2. Worker (`worker/src/index.js`)

- When Baileys emits a QR, send the raw QR string to the `worker-groups` endpoint so the app can render it.
- Poll the `whatsapp_sessions` row every 5 seconds for a new `reconnect_requested_at` timestamp.
- If the timestamp is newer than the last handled time, call `socket.end()` and re-run `connect()`, which forces a fresh QR.
- Keep the existing auto-reconnect logic for transient drops.

### 3. API (`src/routes/api/public/worker-groups.ts`)

- Accept optional `qr_code_str` from the worker and store it without overwriting existing values when omitted.
- Accept the reconnect flag updates from the app as before; the worker reads them.

### 4. App UI (`src/routes/groups.tsx`)

- When `status === 'pending_qr'` and `qr_code_str` is present, render the QR code image using a public QR rendering service (e.g. `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=<qr>`).
- Replace the no-op "Re-scan QR" button with a working action that sets `reconnect_requested_at = now()` for the current user.
- Show clearer status labels:
  - "Connected"
  - "Waiting for QR scan — scan with WhatsApp → Linked devices"
  - "Disconnected — tap Re-scan QR to reconnect"

### 5. UX polish

- Add a short instruction under the QR: "Open WhatsApp, tap the three dots → Linked devices → Link a device, then point your camera at this code."
- Show the QR centered in a card with a subtle border so it is easy to scan on mobile.

## Out of scope for this plan

- Replacing the Railway worker with a Lovable Cloud function.
- Adding push notifications for connection status.
- Supporting multiple WhatsApp numbers per account.

## Acceptance criteria

- A user opening the Groups tab sees the live QR code when the worker is waiting to pair.
- Tapping "Re-scan QR" forces the worker to generate a fresh QR within a few seconds.
- Connection status updates in the app without a manual refresh.
- No raw chat content is ever stored or displayed.
