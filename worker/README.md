# ParentPulse WhatsApp Worker

Long-running Node process that reads tracked WhatsApp groups via Baileys,
transcribes Hebrew voice notes with Groq Whisper v3 Turbo, extracts action
items in memory, and POSTs them to the ParentPulse ingest endpoint.

No chat messages are ever written to disk or to the database — only the
resulting task title, category, and deadline are sent onward.

## Deploying on Railway

1. Push **this `worker/` folder as its own repository** (or set the Railway
   service's Root Directory to `worker`). It must not share a service with the
   PWA, which is a Cloudflare-targeted build.
2. Create a Railway service from that repo. Nixpacks detects Node 20 and runs
   `npm install` then `npm start` (`node src/index.js`).
3. **Attach a Volume** and mount it at `/data`. Without it the auth state is
   wiped on every deploy and you must re-scan the QR code.
4. Set Variables in the Railway dashboard (never commit a `.env`):

   | Variable | Value |
   | --- | --- |
   | `WORKER_SECRET` | same value stored in Lovable Cloud |
   | `USER_ID` | the parent's UUID |
   | `GROQ_API_KEY` | Groq key for voice transcription |
   | `AUTH_DIR` | `/data/auth_session` |
   | `INGEST_URL` | `https://parentpulse-task-digest.lovable.app/api/public/ingest-task` |
   | `TRACKED_GROUPS` | optional comma-separated group names |

5. Open the deploy logs on first boot and scan the printed QR code from
   WhatsApp → Linked devices. The pairing then persists on the volume.

## Local development

```bash
cd worker
cp .env.example .env   # fill in the values
npm install
npm run dev
```

## Notes

- No HTTP port is exposed; this is a worker, not a web service. Do not add a
  health check in Railway or the deploy will be marked unhealthy.
- `restartPolicyType: ALWAYS` restarts the container if the process ever dies.
- `uncaughtException` / `unhandledRejection` are logged, not fatal; the socket
  reconnects with exponential backoff up to 60s.
