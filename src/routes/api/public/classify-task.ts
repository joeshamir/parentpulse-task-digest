import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

/**
 * Turns one WhatsApp group message into zero or more short action items.
 * The message text is used in memory only: it is never stored, and never
 * written to logs (zero chat-log retention).
 */

const CATEGORIES = ['School', 'Sports', 'Social', 'Other'] as const;

const payloadSchema = z.object({
  worker_token: z.string().min(1),
  text: z.string().min(1).max(6000),
  group_name: z.string().max(200).optional().nullable(),
  language_hint: z.string().max(10).optional().nullable(),
});

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          deadline: { type: ['string', 'null'] },
        },
        required: ['title', 'category', 'deadline'],
      },
    },
  },
  required: ['tasks'],
} as const;

const SYSTEM_PROMPT = `You read messages from Israeli school/class/activity parent WhatsApp groups and extract only what a PARENT must actually do.

Rules:
- Understand Hebrew and English, including polite or indirect phrasing ("אשמח אם תעדכנו", "במידה ותרצו", "חשוב שנקפיד"). A polite request is still a task.
- Return at most 3 tasks. Return an empty list for pure chit-chat, greetings, thanks, blessings, emojis, information with no parent action, or announcements that require nothing.
- Each title is a short imperative in the SAME language as the message, max 12 words. Never copy the whole message.
- Optional/nice-to-have requests are still tasks; phrase them as optional.
- category: School, Sports, Social, or Other.
- deadline: ISO-8601 timestamp with offset only when the message states a clear date/time; otherwise null. Never invent one.`;

export const Route = createFileRoute('/api/public/classify-task')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const workerSecret = process.env['WORKER_SECRET'];
        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!workerSecret || !apiKey) {
          console.error('[classify-task] missing WORKER_SECRET or LOVABLE_API_KEY');
          return json({ success: false, error: 'server not configured' }, 500);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ success: false, error: 'invalid JSON body' }, 400);
        }

        const parsed = payloadSchema.safeParse(raw);
        if (!parsed.success) {
          const field = parsed.error.issues[0]?.path.join('.') ?? 'payload';
          return json({ success: false, error: `invalid field: ${field}` }, 400);
        }

        const { verifyWorkerToken } = await import('@/lib/worker-auth.server');
        if (!verifyWorkerToken(parsed.data.worker_token, workerSecret)) {
          return json({ success: false, error: 'unauthorized' }, 401);
        }

        const now = new Date().toISOString();
        let response: Response;
        try {
          response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                  role: 'user',
                  content: `Current time: ${now}\nGroup: ${parsed.data.group_name || 'unknown'}\n\nMessage:\n${parsed.data.text}`,
                },
              ],
              response_format: {
                type: 'json_schema',
                json_schema: { name: 'parent_tasks', strict: true, schema: RESPONSE_SCHEMA },
              },
            }),
          });
        } catch (error) {
          console.error('[classify-task] gateway unreachable', (error as Error).message);
          return json({ success: false, error: 'ai unavailable' }, 503);
        }

        if (!response.ok) {
          // 402/403 are terminal (credits / policy); 429 and 5xx are transient.
          console.error(`[classify-task] gateway error ${response.status}`);
          const status = response.status === 429 ? 429 : response.status >= 500 ? 503 : response.status;
          return json({ success: false, error: `ai error ${response.status}` }, status);
        }

        let tasks: Array<{ title: string; category: string; deadline: string | null }> = [];
        try {
          const body = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = body.choices?.[0]?.message?.content ?? '{}';
          const outcome = JSON.parse(content) as {
            tasks?: Array<{ title?: unknown; category?: unknown; deadline?: unknown }>;
          };
          tasks = (outcome.tasks ?? [])
            .slice(0, 3)
            .map((task) => ({
              title: String(task.title ?? '').trim().slice(0, 120),
              category: (CATEGORIES as readonly string[]).includes(String(task.category))
                ? String(task.category)
                : 'Other',
              deadline:
                typeof task.deadline === 'string' && !Number.isNaN(Date.parse(task.deadline))
                  ? new Date(task.deadline).toISOString()
                  : null,
            }))
            .filter((task) => task.title.length >= 3);
        } catch (error) {
          console.error('[classify-task] could not parse model output', (error as Error).message);
          return json({ success: false, error: 'ai parse failed' }, 502);
        }

        return json({ success: true, tasks }, 200);
      },
    },
  },
});
