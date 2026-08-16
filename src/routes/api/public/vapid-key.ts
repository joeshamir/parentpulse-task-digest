import { createFileRoute } from '@tanstack/react-router';

/**
 * Public VAPID key for browser push subscriptions. This value is meant to be
 * public — only the matching private key (server-side) can send notifications.
 */
export const Route = createFileRoute('/api/public/vapid-key')({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env['VAPID_PUBLIC_KEY'] ?? '';
        return Response.json(
          { key },
          { headers: { 'cache-control': 'public, max-age=300' } },
        );
      },
    },
  },
});
