import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";

export const Route = createFileRoute("/auth/callback")({
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
  component: AuthCallback,
});

function AuthCallback() {
  const { t, dir } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      const timer = window.setTimeout(() => void navigate({ to: "/", replace: true }), 250);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    const finish = async () => {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!error && data.user) {
          await navigate({ to: "/", replace: true });
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      if (!cancelled) setFailed(true);
    };
    void finish();
    return () => {
      cancelled = true;
    };
  }, [loading, navigate, user]);

  const ready = Boolean(user);

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
            ? t({
                en: "Google approved the request, but no session reached this browser. Please try once more.",
                he: "גוגל אישרה את הבקשה, אך החיבור לא הגיע לדפדפן. נסו שוב.",
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