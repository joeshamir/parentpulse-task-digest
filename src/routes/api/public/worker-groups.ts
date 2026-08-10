import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const groupSchema = z.object({
  jid: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
});

const payloadSchema = z.object({
  api_secret: z.string().min(1),
  user_id: z.string().uuid(),
  groups: z.array(groupSchema).max(500).optional(),
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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
        if (!safeEqual(parsed.data.api_secret, workerSecret)) {
          return json({ success: false, error: 'unauthorized' }, 401);
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const { user_id: userId, groups = [] } = parsed.data;
        if (groups.length > 0) {
          const { data: known, error: readError } = await supabaseAdmin
            .from('tracked_groups')
            .select('group_jid')
            .eq('user_id', userId);
          if (readError) return json({ success: false, error: 'group sync failed' }, 500);

          const knownJids = new Set((known ?? []).map((row) => row.group_jid));
          const missing = groups
            .filter((group) => !knownJids.has(group.jid))
            .map((group) => ({
              user_id: userId,
              group_jid: group.jid,
              group_name: group.name,
              is_tracked: false,
            }));
          if (missing.length > 0) {
            const { error: insertError } = await supabaseAdmin.from('tracked_groups').insert(missing);
            if (insertError) return json({ success: false, error: 'group sync failed' }, 500);
          }
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