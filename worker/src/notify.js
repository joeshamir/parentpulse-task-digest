import { createHmac } from 'node:crypto';

import { env } from './env.js';

function workerToken() {
  const mac = createHmac('sha256', env.workerSecret).update(env.userId).digest('hex');
  return `${env.userId}.${mac}`;
}

async function requestDelivery() {
  const res = await fetch(env.notifyUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ worker_token: workerToken() }),
  });
  if (!res.ok) {
    console.error(`[notify] request rejected (${res.status})`);
    return null;
  }
  return res.json();
}

/**
 * Asks the app to deliver due notification jobs. The app owns the VAPID keys
 * and sends each Web Push message; Railway never receives those credentials.
 * Never throws: a push failure must not affect the WhatsApp bridge.
 */
export async function runNotificationTick() {
  try {
    const result = await requestDelivery();
    if (result?.sent > 0) console.log(`[notify] app delivered ${result.sent} notification(s)`);
  } catch (error) {
    console.error('[notify] tick failed:', error?.message);
  }
}

export function startNotificationScheduler() {
  console.log('[notify] notification scheduler started');
  setInterval(() => void runNotificationTick(), 20_000).unref();
  void runNotificationTick();
}
