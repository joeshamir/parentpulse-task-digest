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
        console.log(`[ingest] sent: ${body.title}`);
        return true;
      }
      if (res.status === 401) {
        console.error('[ingest] unauthorized — WORKER_SECRET mismatch');
        return false;
      }
      if (res.status < 500) {
        console.error(`[ingest] rejected (${res.status})`);
        return false;
      }
    } catch (error) {
      console.error(`[ingest] attempt ${attempt} failed:`, error.message);
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return false;
}
