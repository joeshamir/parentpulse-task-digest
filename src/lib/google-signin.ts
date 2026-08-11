// App-owned Google sign-in wrapper.
//
// The generated `@/integrations/lovable/index` helper stores its session through
// the build-time-only Supabase client, which throws a hard "Missing Supabase
// environment variable(s)" error when those values are absent. This wrapper uses
// the same managed Lovable auth provider but hands the resulting tokens to the
// resilient browser client, which can also resolve config at runtime.
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/browser-client";

type SignInResult =
  | { redirected: true; error?: undefined }
  | { redirected?: false; error?: { message?: string } | undefined };

let cached: ReturnType<typeof createLovableAuth> | undefined;

function auth() {
  if (!cached) cached = createLovableAuth();
  return cached;
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const result = (await auth().signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  })) as unknown as {
    redirected?: boolean;
    error?: { message?: string } | null;
    tokens?: { access_token: string; refresh_token: string };
  };

  if (result.redirected) return { redirected: true };
  if (result.error) return { error: result.error };

  if (result.tokens?.access_token && result.tokens?.refresh_token) {
    const { error } = await supabase.auth.setSession(result.tokens);
    if (error) return { error: { message: error.message } };
  }

  return {};
}
