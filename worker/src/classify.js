import { createHmac } from 'node:crypto';

import { env } from './env.js';

// Sends the message text to the app's AI classifier. The text stays in memory
// on both sides — only the resulting short titles are ever stored.
function workerToken() {
  const mac = createHmac('sha256', env.workerSecret).update(env.userId).digest('hex');
  return `${env.userId}.${mac}`;
}

/**
 * Returns an array of { title, category, deadline } (possibly empty) when the
 * classifier answered, or null when it was unavailable (caller falls back).
 */
export async function classifyText(text, groupName) {
  try {
    const res = await fetch(env.classifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        worker_token: workerToken(),
        text: text.slice(0, 6000),
        group_name: groupName ? String(groupName).slice(0, 200) : null,
      }),
    });
    if (!res.ok) {
      console.error(`[classify] rejected (${res.status})`);
      return null;
    }
    const body = await res.json();
    if (!body?.success || !Array.isArray(body.tasks)) return null;
    return body.tasks.filter((task) => typeof task?.title === 'string' && task.title.trim());
  } catch (error) {
    console.error('[classify] failed:', error.message);
    return null;
  }
}
