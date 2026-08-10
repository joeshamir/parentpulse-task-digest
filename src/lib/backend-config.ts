export function hasBackendConfig(): boolean {
  return Boolean(
    import.meta.env['VITE_SUPABASE_URL'] &&
      import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
  );
}

export function isBackendConfigError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Missing Supabase environment variable')
  );
}