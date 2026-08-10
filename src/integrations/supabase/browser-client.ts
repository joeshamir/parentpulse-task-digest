// Runtime-resolved Supabase browser client.
// Falls back to server-injected config (window.__PARENTPULSE_BACKEND__) when
// build-time VITE_* variables are missing, so a published build without them
// still boots.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export type BackendConfig = { url: string; key: string };

declare global {
  interface Window {
    __PARENTPULSE_BACKEND__?: BackendConfig;
  }
}

export function resolveBackendConfig(): BackendConfig | null {
  const viteUrl = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
  const viteKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined;
  if (viteUrl && viteKey) return { url: viteUrl, key: viteKey };

  if (typeof window !== 'undefined') {
    const injected = window.__PARENTPULSE_BACKEND__;
    if (injected?.url && injected?.key) return injected;
  }

  const envUrl =
    typeof process !== 'undefined' ? process.env?.['SUPABASE_URL'] : undefined;
  const envKey =
    typeof process !== 'undefined' ? process.env?.['SUPABASE_PUBLISHABLE_KEY'] : undefined;
  if (envUrl && envKey) return { url: envUrl, key: envKey };

  return null;
}

export function hasBackendConfig(): boolean {
  return resolveBackendConfig() !== null;
}

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

function createBrowserSupabaseClient() {
  const config = resolveBackendConfig();
  if (!config) {
    const message =
      'Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Connect Supabase in Lovable Cloud.';
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(config.url, config.key, {
    global: {
      fetch: createSupabaseFetch(config.key),
    },
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _client: ReturnType<typeof createBrowserSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createBrowserSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_client) _client = createBrowserSupabaseClient();
    return Reflect.get(_client, prop, receiver);
  },
});
