import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const payloadSchema = z.object({
  worker_token: z.string().min(1),
  action: z.enum(['poll', 'prune']).default('poll'),
  endpoints: z.array(z.string().min(1)).max(50).optional(),
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

/** Local calendar date + hour for a timezone, as the user experiences it. */
function localNow(timeZone: string): { date: string; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour') === '24' ? '0' : get('hour')),
  };
}

function summaryText(titles: string[], lang: 'he' | 'en') {
  const head = titles.slice(0, 3).join(' · ');
  const rest = titles.length > 3 ? (lang === 'he' ? ` ועוד ${titles.length - 3}` : ` +${titles.length - 3} more`) : '';
  return head + rest;
}

export const Route = createFileRoute('/api/public/notify-jobs')({
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

        if (parsed.data.action === 'prune') {
          const endpoints = parsed.data.endpoints ?? [];
          if (endpoints.length > 0) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('user_id', userId)
              .in('endpoint', endpoints);
          }
          return json({ success: true });
        }

        const { data: prefs } = await supabaseAdmin
          .from('notification_prefs')
          .select('daily_summary_enabled, send_hour_local, timezone, last_sent_on, test_requested_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (!prefs) return json({ success: true, jobs: [], vapid: null });

        const { data: subs } = await supabaseAdmin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', userId);

        const subscriptions = subs ?? [];
        if (subscriptions.length === 0) return json({ success: true, jobs: [] });

        const jobs: Array<{ kind: string; title: string; body: string; url: string }> = [];

        if (prefs.test_requested_at) {
          await supabaseAdmin
            .from('notification_prefs')
            .update({ test_requested_at: null })
            .eq('user_id', userId);
          jobs.push({
            kind: 'test',
            title: 'ParentPulse',
            body: 'התראות בדיקה עובדות · Test notification works',
            url: '/',
          });
        }

        const { date, hour } = localNow(prefs.timezone ?? 'Asia/Jerusalem');
        const dueToday =
          prefs.daily_summary_enabled &&
          hour >= (prefs.send_hour_local ?? 8) &&
          prefs.last_sent_on !== date;

        if (dueToday) {
          // Stamp first: a duplicate summary is worse than a missed one.
          await supabaseAdmin
            .from('notification_prefs')
            .update({ last_sent_on: date })
            .eq('user_id', userId);

          const { data: items } = await supabaseAdmin
            .from('action_items')
            .select('title')
            .eq('user_id', userId)
            .eq('is_completed', false)
            .order('created_at', { ascending: false })
            .limit(20);

          const titles = (items ?? []).map((i) => i.title);
          if (titles.length > 0) {
            jobs.push({
              kind: 'daily',
              title:
                titles.length === 1
                  ? 'משימה אחת פתוחה היום · 1 open task today'
                  : `${titles.length} משימות פתוחות היום · ${titles.length} open tasks`,
              body: summaryText(titles, 'he'),
              url: '/',
            });
          }
        }

        return json({ success: true, jobs, subscriptions });
      },
    },
  },
});
