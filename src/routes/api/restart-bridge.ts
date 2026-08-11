import { createFileRoute } from '@tanstack/react-router';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { restartRailwayService } from '@/lib/railway.server';

export const Route = createFileRoute('/api/restart-bridge')({
  server: {
    middleware: [requireSupabaseAuth],
    handlers: {
      POST: async () => {
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
            { status: 500 },
          );
        }

        const result = await restartRailwayService({ apiToken, serviceId, environmentId });
        return Response.json(result, { status: result.success ? 200 : 502 });
      },
    },
  },
});
