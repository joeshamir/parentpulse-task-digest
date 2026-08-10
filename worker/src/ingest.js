import { env } from './env.js';

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
    api_secret: env.workerSecret,
    user_id: env.userId,
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
    } catch (error) {
      console.error(`[ingest] attempt ${attempt} failed:`, error.message);
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return false;
}

export async function syncGroups(groups = [], state) {
  try {
    const res = await fetch(env.groupsUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_secret: env.workerSecret,
        user_id: env.userId,
        groups,
        state,
      }),
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
