import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const groupSchema = z.object({
  jid: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
});

const payloadSchema = z.object({
  // Per-user token; the user id is derived from it server-side.
  worker_token: z.string().min(1),
  groups: z.array(groupSchema).max(500).optional(),
  state: z.enum(['pending_qr', 'connected', 'disconnected']).optional(),
});

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

export const Route = createFileRoute('/api/public/worker-groups')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const workerSecret = process.env['WORKER_SECRET'];
        if (!workerSecret) return json({ success: false, error: 'server not configured' }, 500);

        const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ success: false, error: 'invalid payload' }, 400);

        const { verifyWorkerToken } = await import('@/lib/worker-auth.server');
        const userId = verifyWorkerToken(parsed.data.worker_token, workerSecret);
        if (!userId) return json({ success: false, error: 'unauthorized' }, 401);

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { groups = [], state } = parsed.data;
        if (state) {
          const { error: sessionError } = await supabaseAdmin
            .from('whatsapp_sessions')
            .upsert(
              { user_id: userId, status: state, qr_code_str: null, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            );
          if (sessionError) return json({ success: false, error: 'session sync failed' }, 500);
        }
        if (groups.length > 0) {
          // Unique (user_id, group_jid) makes this idempotent under concurrent
          // syncs; ignoreDuplicates keeps existing selections untouched.
          const rows = groups.map((group) => ({
            user_id: userId,
            group_jid: group.jid,
            group_name: group.name,
            is_tracked: false,
          }));
          const { error: upsertError } = await supabaseAdmin
            .from('tracked_groups')
            .upsert(rows, { onConflict: 'user_id,group_jid', ignoreDuplicates: true });
          if (upsertError) return json({ success: false, error: 'group sync failed' }, 500);
        }

        const { data, error } = await supabaseAdmin
          .from('tracked_groups')
          .select('group_jid, group_name, is_tracked')
          .eq('user_id', userId)
          .order('group_name');
        if (error) return json({ success: false, error: 'group list failed' }, 500);
        return json({ success: true, groups: data ?? [] });
      },
    },
  },
});
