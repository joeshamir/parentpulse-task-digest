import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/lang";

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
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ready" | "failed">("working");
  const [failureReason, setFailureReason] = useState<"missing" | "rejected">("missing");

  useEffect(() => {
    let cancelled = false;
    const finish = async () => {
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
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          if (!cancelled) {
            setFailureReason("rejected");
            setStatus("failed");
          }
          return;
        }
      } else {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (!cancelled) {
            setFailureReason("missing");
            setStatus("failed");
          }
          return;
        }
      }

      const { data, error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error || !data.user) {
        setFailureReason("rejected");
        setStatus("failed");
        return;
      }

      setStatus("ready");
      window.setTimeout(() => {
        if (!cancelled) void navigate({ to: "/", replace: true });
      }, 250);
    };
    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

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