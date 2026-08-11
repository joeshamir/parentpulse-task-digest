import { createHmac } from 'node:crypto';

import { env } from './env.js';

// Per-user token: HMAC of the user id with the shared worker secret. The server
// derives the target account from this token, so a token only works for USER_ID.
function workerToken() {
  const mac = createHmac('sha256', env.workerSecret).update(env.userId).digest('hex');
  return `${env.userId}.${mac}`;
}


const CATEGORY_RULES = [
  { category: 'School', words: ['school', 'class', 'grade', 'teacher', 'homework', 'בית ספר', 'כיתה', 'מורה', 'שיעורי בית', 'וועד'] },
  { category: 'Sports', words: ['soccer', 'football', 'basketball', 'practice', 'coach', 'game', 'כדורגל', 'כדורסל', 'אימון', 'מאמן', 'משחק'] },
  { category: 'Social', words: ['birthday', 'party', 'playdate', 'יום הולדת', 'מסיבה', 'מפגש'] },
];

export function guessCategory(text) {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => lower.includes(w))) return rule.category;
  }
  return 'Other';
}

// Sends one structured task to the ParentPulse ingest endpoint.
// Retries transient failures; never throws (a failed send must not kill the worker).
export async function sendTask({ groupName, title, category, deadline }) {
  const body = {
    worker_token: workerToken(),
    group_name: groupName.slice(0, 200),
    title: title.slice(0, 500),
    category: category || guessCategory(title),
    deadline: deadline || null,
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(env.ingestUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        console.log(`[ingest] task sent for group: ${body.group_name}`);
        return true;
      }
      if (res.status === 401) {
        console.error('[ingest] unauthorized — WORKER_SECRET mismatch');
        return false;
      }
      if (res.status < 500) {
        const detail = await res.text().catch(() => '');
        console.error(`[ingest] rejected (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`);
        return false;
      }
      console.error(`[ingest] server error (${res.status}), retrying`);
    } catch (error) {
      console.error(`[ingest] attempt ${attempt} failed:`, error.message);
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return false;
}

export async function syncGroups(groups = [], state, qrCode, ackReconnect = false) {
  try {
    const payload = {
      worker_token: workerToken(),
      groups,
      state,
    };
    if (qrCode !== undefined) payload.qr_code = qrCode;
    if (ackReconnect) payload.ack_reconnect = true;

    const res = await fetch(env.groupsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[groups] sync rejected (${res.status})`);
      return null;
    }
    const body = await res.json();
    return Array.isArray(body.groups) ? body.groups : [];
  } catch (error) {
    console.error('[groups] sync failed:', error.message);
    return null;
  }
}

// Reads the reconnect_request timestamp from the app's whatsapp_sessions row.
// Returns an ISO timestamp string if a reconnect was requested, or null.
export async function getReconnectRequest() {
  try {
    const res = await fetch(env.groupsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        worker_token: workerToken(),
      }),
    });
    if (!res.ok) {
      console.error(`[groups] reconnect check rejected (${res.status})`);
      return null;
    }
    const body = await res.json();
    return body.reconnect_requested_at || null;
  } catch (error) {
    console.error('[groups] reconnect check failed:', error.message);
    return null;
  }
}

// Clears the pending reconnect request so the worker does not restart in a loop.
export async function ackReconnect() {
  await syncGroups([], undefined, undefined, true);
}
