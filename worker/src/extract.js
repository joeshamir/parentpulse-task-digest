import { guessCategory } from './ingest.js';
import { classifyText } from './classify.js';

// Heuristic in-memory extraction. No message text is ever persisted —
// only the resulting task title is sent onward (zero chat-log retention).
const ACTION_HINTS = [
  'bring', 'pay', 'sign', 'permission', 'form', 'deadline', 'due', 'submit', 'remember to', 'don\'t forget',
  'send', 'register', 'rsvp', 'complete', 'prepare', 'buy', 'wear', 'return', 'please', 'need to', 'must',
  'להביא', 'לשלם', 'לחתום', 'אישור', 'טופס', 'עד יום', 'תזכורת', 'נא להביא', 'אל תשכחו', 'להירשם',
  'לשלוח', 'לקנות', 'להחזיר', 'להכין', 'למלא', 'לאשר הגעה', 'צריך', 'צריכים', 'חובה', 'נא ', 'בבקשה',
  'תשלום', 'לגבות', 'גובים', 'מביאים', 'מבקשים', 'להעביר', 'העברה', 'ועד', 'וועד', 'עד ה', 'עד תאריך',
  'להירשם', 'הרשמה', 'תזכורת', 'מזכירים', 'להצטייד', 'יש להביא', 'יש לשלם', 'אנא',
];

const DAYS = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6,
};

function nextDateForDay(targetDay, hour, minute) {
  const now = new Date();
  const delta = (targetDay - now.getDay() + 7) % 7 || 7;
  const date = new Date(now);
  date.setDate(now.getDate() + delta);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function extractDeadline(text) {
  const lower = text.toLowerCase();
  const time = lower.match(/(\d{1,2}):(\d{2})/);
  const hour = time ? Number(time[1]) : 9;
  const minute = time ? Number(time[2]) : 0;
  for (const [name, day] of Object.entries(DAYS)) {
    if (lower.includes(name)) return nextDateForDay(day, hour, minute);
  }
  if (lower.includes('tomorrow') || lower.includes('מחר')) {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }
  return null;
}

// Keyword fallback, used only when the AI classifier is unavailable.
function keywordTask(text, groupName) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 8) return null;
  const lower = trimmed.toLowerCase();
  if (!ACTION_HINTS.some((hint) => lower.includes(hint))) return null;

  return {
    groupName,
    title: trimmed.slice(0, 120),
    category: guessCategory(trimmed),
    deadline: extractDeadline(trimmed),
  };
}

/**
 * Returns { tasks: [...], source: 'ai' | 'keyword' }.
 * Tasks may be empty, which means the message needs no parent action.
 */
export async function extractTasks(text, groupName) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 8) return { tasks: [], source: 'ai' };

  const classified = await classifyText(trimmed, groupName);
  if (classified) {
    return {
      source: 'ai',
      tasks: classified.map((task) => ({
        groupName,
        title: task.title.slice(0, 120),
        category: task.category || guessCategory(trimmed),
        deadline: task.deadline || null,
      })),
    };
  }

  const fallback = keywordTask(trimmed, groupName);
  return { tasks: fallback ? [fallback] : [], source: 'keyword' };
}
