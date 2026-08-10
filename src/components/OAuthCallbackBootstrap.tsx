import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/lang";

type CallbackTokens = {
  accessToken: string;
  refreshToken: string;
};

type CallbackResult =
  | { kind: "none" }
  | { kind: "valid"; tokens: CallbackTokens }
  | { kind: "invalid" };

type BootstrapState = "checking" | "ready" | "failed";

const CALLBACK_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("OAuth callback timed out")),
      CALLBACK_TIMEOUT_MS,
    );

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function captureCallbackTokens(): CallbackResult {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const isOAuthCallback = Boolean(
    accessToken || refreshToken || params.get("error") || params.get("error_description"),
  );

  if (!isOAuthCallback) return { kind: "none" };

  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${window.location.search}`,
  );

  if (!accessToken || !refreshToken) return { kind: "invalid" };
  return { kind: "valid", tokens: { accessToken, refreshToken } };
}

export function OAuthCallbackBootstrap({ children }: { children: ReactNode }) {
  const { t, dir } = useLang();
  const [state, setState] = useState<BootstrapState>("checking");

  useEffect(() => {
    let active = true;
    const callback = captureCallbackTokens();

    if (callback.kind === "none") {
      setState("ready");
      return () => {
        active = false;
      };
    }

    if (callback.kind === "invalid") {
      setState("failed");
      return () => {
        active = false;
      };
    }

    void withTimeout(
      supabase.auth.setSession({
        access_token: callback.tokens.accessToken,
        refresh_token: callback.tokens.refreshToken,
      }),
    )
      .then(async ({ data, error }) => {
        if (error || !data.session) throw error ?? new Error("No session returned");

        const verified = await withTimeout(supabase.auth.getUser());
        if (verified.error || !verified.data.user) {
          throw verified.error ?? new Error("Could not verify signed-in user");
        }

        if (active) setState("ready");
      })
      .catch(() => {
        if (active) setState("failed");
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === "ready") return children;

  return (
    <main dir={dir} className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-lg font-semibold text-primary">ParentPulse</p>
        {state === "checking" ? (
          <>
            <LoaderCircle className="mx-auto mt-6 size-8 animate-spin text-primary" aria-hidden />
            <h1 className="mt-4 text-xl font-bold text-foreground">
              {t({ en: "Finishing sign-in…", he: "מסיימים את ההתחברות…" })}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t({ en: "This should only take a moment.", he: "זה אמור לקחת רק רגע." })}
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-bold text-foreground">
              {t({ en: "Sign-in was not completed", he: "ההתחברות לא הושלמה" })}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t({
                en: "Your credentials were removed from the address bar. Please start Google sign-in again.",
                he: "פרטי ההתחברות הוסרו משורת הכתובת. נסו להתחבר שוב עם Google.",
              })}
            </p>
            <Button
              className="mt-6 h-11 w-full"
              onClick={() => window.location.assign("/auth")}
            >
              <RotateCcw aria-hidden />
              {t({ en: "Try Google again", he: "ניסיון נוסף עם Google" })}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}