import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/browser-client";
import { signInWithGoogle } from "@/lib/google-signin";
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
          "Sign in to ParentPulse to sync your WhatsApp parent-group tasks across devices.",
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
  const [googleBusy, setGoogleBusy] = useState(false);
  // Explicit, unbundled consent is required before an account may be created
  // (Israeli Privacy Protection Law + GDPR). It is recorded once signed in.
  const [agreeLegal, setAgreeLegal] = useState(false);
  const [agreeNotice, setAgreeNotice] = useState(false);
  const consentMissing = mode === "signup" && (!agreeLegal || !agreeNotice);


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

  async function google() {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        const message = result.error.message ?? "";
        toast.error(
          message || t({ en: "Google sign-in failed.", he: "ההתחברות עם גוגל נכשלה." }),
        );
        return;
      }
      if (result.redirected) return;
      // The managed helper stores popup-flow tokens. AuthProvider receives the
      // resulting SIGNED_IN event and performs navigation from one shared state.
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : t({ en: "Google sign-in failed. Please try again.", he: "ההתחברות עם גוגל נכשלה. נסו שוב." }),
      );
    } finally {
      setGoogleBusy(false);
    }
  }



  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-[13px] font-semibold tracking-tight text-muted-foreground">ParentPulse</p>
          <h1 className="mt-2 text-[24px] font-bold tracking-tight">
            {mode === "signin"
              ? t({ en: "Welcome back", he: "ברוכים השבים" })
              : t({ en: "Create your account", he: "יצירת חשבון" })}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t({
              en: "Sync your tasks across devices.",
              he: "סנכרון המשימות בין המכשירים.",
            })}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-2.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t({ en: "Email", he: "אימייל" })}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] outline-none focus:border-foreground/40"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t({ en: "Password", he: "סיסמה" })}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[14px] outline-none focus:border-foreground/40"
          />
          {mode === "signup" && (
            <div className="space-y-2.5 pt-1">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreeLegal}
                  onChange={(e) => setAgreeLegal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-[12px] leading-relaxed text-muted-foreground">
                  {t({ en: "I agree to the ", he: "אני מסכים/ה ל" })}
                  <Link to="/terms" className="font-semibold text-primary underline">
                    {t({ en: "Terms of Use", he: "תנאי השימוש" })}
                  </Link>
                  {t({ en: " and the ", he: " ול" })}
                  <Link to="/privacy" className="font-semibold text-primary underline">
                    {t({ en: "Privacy Policy", he: "מדיניות הפרטיות" })}
                  </Link>
                  .
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={agreeNotice}
                  onChange={(e) => setAgreeNotice(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-[12px] leading-relaxed text-muted-foreground">
                  {t({
                    en: "I only connect groups I belong to, and I will tell their members that tasks are extracted from messages.",
                    he: "אחבר רק קבוצות שאני חבר/ה בהן, ואיידע את חבריהן שמחולצות משימות מההודעות.",
                  })}
                </span>
              </label>
            </div>
          )}
          <button
            type="submit"
            disabled={busy || consentMissing}
            className="h-10 w-full rounded-lg bg-foreground text-[14px] font-semibold tracking-tight text-background disabled:opacity-50"
          >
            {mode === "signin"
              ? t({ en: "Sign in", he: "כניסה" })
              : t({ en: "Sign up", he: "הרשמה" })}
          </button>
        </form>

        <button
          onClick={google}
          disabled={googleBusy}
          className="h-10 w-full rounded-lg border border-border bg-card text-[14px] font-semibold tracking-tight transition-colors hover:border-foreground/30 disabled:opacity-60"
        >
          {googleBusy
            ? t({ en: "Opening Google…", he: "פותח את גוגל…" })
            : t({ en: "Continue with Google", he: "המשך עם גוגל" })}
        </button>


        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-[13px] font-semibold text-primary"
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
