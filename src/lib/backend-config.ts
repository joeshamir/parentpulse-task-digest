export { hasBackendConfig } from '@/integrations/supabase/browser-client';

export function isBackendConfigError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Missing Supabase environment variable')
  );
}
