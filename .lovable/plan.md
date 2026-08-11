# Friction-free WhatsApp bridge restart

## Current problem
- The worker runs as a 24/7 Railway container. If it stops or gets stuck, the app cannot restart it from inside the browser.
- The "Re-scan QR" flow only works when the worker is already alive and listening for `reconnect_requested_at`.
- As a fallback, the UI tells the user to open Railway and press Restart manually. This is the friction the user wants removed.

## Goal
Replace the manual "Open Railway → Restart" instructions with a single in-app "Restart connector" button that calls Railway's API and restarts the worker service automatically.

## Plan

### 1. Backend: add a secure server function to restart Railway
Create `src/lib/railway.server.ts` (server-only helper):
- Call Railway's GraphQL API to trigger a service restart (`serviceInstance.redeploy` or `service.restart`).
- Read `RAILWAY_API_TOKEN` and `RAILWAY_SERVICE_ID` from `process.env` inside the handler.
- Return a clear success/error message.

Create `src/routes/api/restart-bridge.ts` (authenticated server function):
- Verify the caller is signed in (Supabase auth).
- Call the Railway helper.
- Do NOT expose Railway tokens to the client.

### 2. Worker: make restart safer and faster
In `worker/src/index.js`:
- On boot, immediately clear any stale `reconnect_requested_at` so an old request does not cause a surprise restart right after the container comes up.
- Keep the existing 2s poll, 15s heartbeat, and 2-minute watchdog.

### 3. UI: replace manual instructions with one-tap restart
In `src/routes/groups.tsx`:
- When `bridgeOffline` is true, show a primary "Restart connector" button instead of the collapsible manual instructions.
- On tap, call the authenticated restart endpoint, show a loading state, then continue watching `updated_at` for the heartbeat to return.
- Keep the existing "Re-scan QR" button for the case where the worker is alive but the user wants a fresh QR.
- Update bilingual copy so the user understands the app is doing the restart for them.

### 4. Secrets / env vars
Add these project secrets (values to be provided by the user from their Railway dashboard):
- `RAILWAY_API_TOKEN` — Railway account API token.
- `RAILWAY_SERVICE_ID` — the ParentPulse worker service ID.
- `RAILWAY_ENVIRONMENT_ID` — the Railway environment ID (if required by the GraphQL mutation).

### 5. Validation
- Simulate an offline bridge and confirm the new button appears.
- Trigger a restart and verify the worker's `updated_at` heartbeat resumes within ~30–60s.
- Confirm the manual Railway instructions no longer appear.

## Out of scope
- Moving the worker off Railway (kept as-is).
- Adding a full Railway deployment pipeline from the app.
- Changing the WhatsApp/Baileys pairing protocol.
