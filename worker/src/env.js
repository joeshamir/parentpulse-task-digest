// Loads .env only when present (local dev). Railway injects real env vars,
// and dotenv never overrides existing process.env values.
import { config } from 'dotenv';
config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  ingestUrl:
    process.env.INGEST_URL ||
    'https://parentpulse-task-digest.lovable.app/api/public/ingest-task',
  notifyUrl:
    process.env.NOTIFY_URL ||
    'https://parentpulse-task-digest.lovable.app/api/public/notify-jobs',
  groupsUrl:
    process.env.GROUPS_URL ||
    'https://parentpulse-task-digest.lovable.app/api/public/worker-groups',
  classifyUrl:
    process.env.CLASSIFY_URL ||
    'https://parentpulse-task-digest.lovable.app/api/public/classify-task',
  workerSecret: required('WORKER_SECRET'),
  userId: required('USER_ID'),
  groqApiKey: process.env.GROQ_API_KEY || '',
  authDir: process.env.AUTH_DIR || './auth_session',
  trackedGroups: (process.env.TRACKED_GROUPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
