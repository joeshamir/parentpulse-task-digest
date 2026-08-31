import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const CATEGORIES = ['School', 'Sports', 'Social', 'Other'] as const;

const payloadSchema = z.object({
  // Per-user token: binds the worker secret to one account. The user id is
  // derived from the token server-side, never taken from the request body.
  worker_token: z.string().min(1),
  group_name: z.string().min(1).max(200),
  // WhatsApp group address (e.g. 1203...@g.us). Metadata only — never message content.
  group_jid: z.string().max(120).optional().nullable(),
  title: z.string().min(1).max(500),
  category: z.string().max(50).optional().nullable(),
  deadline: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional()
    .or(z.literal('')),
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

export const Route = createFileRoute('/api/public/ingest-task')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const workerSecret = process.env['WORKER_SECRET'];
        if (!workerSecret) {
          console.error('[ingest-task] WORKER_SECRET is not configured');
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
          const issue = parsed.error.issues[0];
          const field = issue?.path.join('.') ?? 'payload';
          // Never echo values back, only the offending field.
          return json({ success: false, error: `invalid field: ${field}` }, 400);
        }

        const data = parsed.data;
        const { verifyWorkerToken } = await import('@/lib/worker-auth.server');
        const userId = verifyWorkerToken(data.worker_token, workerSecret);
        if (!userId) {
          return json({ success: false, error: 'unauthorized' }, 401);
        }

        const category = (CATEGORIES as readonly string[]).includes(data.category ?? '')
          ? (data.category as string)
          : 'Other';

        const deadline = data.deadline ? new Date(data.deadline).toISOString() : null;

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { data: inserted, error } = await supabaseAdmin
          .from('action_items')
          .insert({
            user_id: userId,
            group_name: data.group_name,
            group_jid: data.group_jid || null,
            title: data.title,
            category,
            deadline,
          })
          .select('id')
          .single();

        if (error || !inserted) {
          console.error('[ingest-task] insert failed', error?.message);
          return json({ success: false, error: 'insert failed' }, 500);
        }

        return json({ success: true, id: inserted.id }, 200);
      },
    },
  },
});
