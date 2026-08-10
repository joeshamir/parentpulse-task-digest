import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — ParentPulse" },
      {
        name: "description",
        content:
          "Sign in to ParentPulse to sync your WhatsApp parent-group tasks and daily digests across devices.",
      },
      { property: "og:title", content: "Sign in — ParentPulse" },
      { property: "og:description", content: "Sync your parent-group tasks across devices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { t, dir } = useLang();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(
          t({ en: "Check your email to confirm.", he: "בדקו את המייל לאישור החשבון." }),
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function redirectSignIn() {
    const origin = window.location.origin;
    window.location.href = `/~oauth/initiate?provider=google&redirect_uri=${encodeURIComponent(
      origin,
    )}`;
  }

  async function google() {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        const message = result.error.message ?? "";
        if (/popup|blocked|window/i.test(message)) {
          redirectSignIn();
          return;
        }
        toast.error(
          message || t({ en: "Google sign-in failed.", he: "ההתחברות עם גוגל נכשלה." }),
        );
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch (err) {
      // Popup blocked or the sign-in window was closed: fall back to a full-page redirect.
      redirectSignIn();
      void err;
    } finally {
      setGoogleBusy(false);
    }
  }


  return (
    <div dir={dir} className="min-h-screen bg-surface text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
        <div>
          <p className="font-display text-lg font-semibold text-primary">ParentPulse</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
            {mode === "signin"
              ? t({ en: "Welcome back", he: "ברוכים השבים" })
              : t({ en: "Create your account", he: "יצירת חשבון" })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t({
              en: "Sync your tasks and digests across devices.",
              he: "סנכרון המשימות והתקצירים בין המכשירים.",
            })}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t({ en: "Email", he: "אימייל" })}
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-[15px] outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t({ en: "Password", he: "סיסמה" })}
            className="h-12 w-full rounded-2xl border border-border bg-card px-4 text-[15px] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-60"
          >
            {mode === "signin"
              ? t({ en: "Sign in", he: "כניסה" })
              : t({ en: "Sign up", he: "הרשמה" })}
          </button>
        </form>

        <button
          onClick={google}
          className="h-12 w-full rounded-2xl border border-border bg-card text-[15px] font-bold transition-colors hover:bg-accent"
        >
          {t({ en: "Continue with Google", he: "המשך עם גוגל" })}
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm font-semibold text-primary"
        >
          {mode === "signin"
            ? t({ en: "No account? Sign up", he: "אין חשבון? הרשמה" })
            : t({ en: "Already have an account? Sign in", he: "כבר יש חשבון? כניסה" })}
        </button>

        <button
          onClick={() => navigate({ to: "/" })}
          className="text-sm font-semibold text-muted-foreground"
        >
          {t({ en: "Continue without signing in", he: "המשך ללא התחברות" })}
        </button>
      </div>
    </div>
  );
}
