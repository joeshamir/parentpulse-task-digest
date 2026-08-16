import { createHmac } from 'node:crypto';

import webpush from 'web-push';

import { env } from './env.js';

function workerToken() {
  const mac = createHmac('sha256', env.workerSecret).update(env.userId).digest('hex');
  return `${env.userId}.${mac}`;
}

let configured = false;

function configure() {
  if (configured) return true;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
  return true;
}

async function post(body) {
  const res = await fetch(env.notifyUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ worker_token: workerToken(), ...body }),
  });
  if (!res.ok) {
    console.error(`[notify] request rejected (${res.status})`);
    return null;
  }
  return res.json();
}

/**
 * Polls the app for due notification jobs (daily summary or a test the user
 * requested from Settings) and delivers them to that user's devices.
 * Never throws: a push failure must not affect the WhatsApp bridge.
 */
export async function runNotificationTick() {
  if (!configure()) return;
  try {
    const result = await post({ action: 'poll' });
    const jobs = result?.jobs ?? [];
    const subscriptions = result?.subscriptions ?? [];
    if (jobs.length === 0 || subscriptions.length === 0) return;

    const dead = [];
    for (const job of jobs) {
      const payload = JSON.stringify({
        title: job.title,
        body: job.body,
        url: job.url || '/',
        tag: job.kind === 'test' ? 'parentpulse-test' : 'parentpulse-daily',
      });
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          console.log(`[notify] sent ${job.kind} notification`);
        } catch (error) {
          const status = error?.statusCode;
          if (status === 404 || status === 410) {
            dead.push(sub.endpoint);
          } else {
            console.error(`[notify] send failed (${status || 'network'}):`, error?.message);
          }
        }
      }
    }

    if (dead.length > 0) {
      await post({ action: 'prune', endpoints: dead });
      console.log(`[notify] pruned ${dead.length} expired device(s)`);
    }
  } catch (error) {
    console.error('[notify] tick failed:', error?.message);
  }
}

export function startNotificationScheduler() {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    console.warn('[notify] VAPID keys missing — push notifications disabled');
    return;
  }
  console.log('[notify] notification scheduler started');
  setInterval(() => void runNotificationTick(), 20_000).unref();
  void runNotificationTick();
}
