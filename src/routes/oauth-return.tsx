import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/lang";

const AUTH_TIMEOUT_MS = 5000;

function withTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Authentication timed out")), AUTH_TIMEOUT_MS);
    Promise.resolve(operation).then(
      (result) => {
        window.clearTimeout(timer);
        resolve(result);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export const Route = createFileRoute("/oauth-return")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Finishing sign in — ParentPulse" },
      { name: "description", content: "Completing your secure ParentPulse sign-in." },
      { property: "og:title", content: "Finishing sign in — ParentPulse" },
      { property: "og:description", content: "Completing your secure ParentPulse sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const { t, dir } = useLang();
  const [status, setStatus] = useState<"working" | "ready" | "failed">("working");
  const [failureReason, setFailureReason] = useState<"missing" | "rejected">("missing");

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
      try {
        const callback = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = callback.get("access_token");
        const refreshToken = callback.get("refresh_token");
        const providerError = callback.get("error_description") ?? callback.get("error");

        // Remove credentials from the address bar and browser history before
        // validating them or making any network request.
        if (window.location.hash) {
          window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        }

        if (providerError) {
          if (!cancelled) {
            setFailureReason("rejected");
            setStatus("failed");
          }
          return;
        }

        if (accessToken && refreshToken) {
          const { data, error } = await withTimeout(
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
          );
          if (error || !data.session?.user) {
            if (!cancelled) {
              setFailureReason("rejected");
              setStatus("failed");
            }
            return;
          }
        } else {
          const { data, error } = await withTimeout(supabase.auth.getUser());
          if (error || !data.user) {
            if (!cancelled) {
              setFailureReason("missing");
              setStatus("failed");
            }
            return;
          }
        }

        if (cancelled) return;
        setStatus("ready");
        window.setTimeout(() => {
          if (!cancelled) window.location.replace("/");
        }, 250);
      } catch {
        if (!cancelled) {
          setFailureReason("rejected");
          setStatus("failed");
        }
      }
    };
    void finish();
    return () => {
      cancelled = true;
    };
  }, []);

  const failed = status === "failed";
  const ready = status === "ready";

  return (
    <main dir={dir} className="grid min-h-screen place-items-center bg-surface px-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-card text-primary">
          {failed ? (
            <TriangleAlert className="h-6 w-6 text-destructive" />
          ) : ready ? (
            <CheckCircle2 className="h-6 w-6 text-success" />
          ) : (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          )}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">
          {failed
            ? t({ en: "Sign-in did not finish", he: "ההתחברות לא הושלמה" })
            : ready
              ? t({ en: "You're signed in", he: "התחברתם בהצלחה" })
              : t({ en: "Finishing sign in…", he: "מסיימים את ההתחברות…" })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {failed
            ? failureReason === "missing"
              ? t({
                  en: "The sign-in response was incomplete. Please start again from the sign-in screen.",
                  he: "תגובת ההתחברות לא הייתה מלאה. התחילו שוב ממסך הכניסה.",
                })
              : t({
                  en: "Google sign-in could not be verified. Please try once more.",
                  he: "לא ניתן היה לאמת את ההתחברות עם גוגל. נסו שוב.",
                })
            : t({ en: "Securely connecting your ParentPulse account.", he: "מחברים את חשבון ParentPulse באופן מאובטח." })}
        </p>
        {failed && (
          <Link
            to="/auth"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            {t({ en: "Try Google again", he: "ניסיון נוסף עם גוגל" })}
          </Link>
        )}
      </div>
    </main>
  );
}