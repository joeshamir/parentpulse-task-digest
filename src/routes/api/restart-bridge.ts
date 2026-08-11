import { createFileRoute } from '@tanstack/react-router';
import { getRequest } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { restartRailwayService } from '@/lib/railway.server';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  const request = getRequest();
  const authHeader = request?.headers?.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  if (!token || token.split('.').length !== 3) return null;

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

export const Route = createFileRoute('/api/restart-bridge')({
  server: {
    handlers: {
      POST: async () => {
        const userId = await getAuthenticatedUserId();
        if (!userId) {
          return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const apiToken = process.env['RAILWAY_API_TOKEN'];
        const serviceId = process.env['RAILWAY_SERVICE_ID'];
        const environmentId = process.env['RAILWAY_ENVIRONMENT_ID'];

        if (!apiToken || !serviceId || !environmentId) {
          return Response.json(
            {
              success: false,
              error:
                'Server is not configured for one-tap restart. Ask the project owner to add RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID and RAILWAY_ENVIRONMENT_ID.',
            },
            { status: 200 },
          );
        }

        const result = await restartRailwayService({ apiToken, serviceId, environmentId });
        if (!result.success) {
          console.error('[restart-bridge] Railway restart failed:', result.message);
        }
        // Always 200: the client reads `success` and shows the message. A non-2xx
        // here surfaces as an unhandled app runtime error in the preview.
        return Response.json(
          result.success
            ? { success: true, message: result.message }
            : { success: false, error: result.message },
          { status: 200 },
        );
      },
    },
  },
});
