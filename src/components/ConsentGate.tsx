import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/browser-client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";
import { CONSENT_VERSION } from "@/lib/consent";

/**
 * Consent gate: an account may not be used until the person has accepted the
 * current Terms and Privacy Policy and confirmed they are responsible for
 * telling their groups that tasks are extracted (Israeli Privacy Protection
 * Law notice duty). Accounts created before a policy change are asked again.
 */
export function ConsentGate() {
  const { t, dir, lang } = useLang();
  const { user, loading } = useAuth();
  const [needed, setNeeded] = useState(false);
  const [legal, setLegal] = useState(false);
  const [notice, setNotice] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setNeeded(false);
      return;
    }
    let cancelled = false;
    void supabase
      .from("user_consents")
      .select("consent_version")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setNeeded(!data || data.consent_version !== CONSENT_VERSION);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (!needed || !user) return null;

  async function accept() {
    if (!user || !legal || !notice) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("user_consents").upsert(
      {
        user_id: user.id,
        consent_version: CONSENT_VERSION,
        terms_accepted_at: now,
        privacy_accepted_at: now,
        group_notice_accepted_at: now,
        marketing_opt_in: marketing,
        locale: lang,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) {
      toast.error(t({ en: "Could not save your consent.", he: "לא ניתן לשמור את ההסכמה." }));
      return;
    }
    setNeeded(false);
  }

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg">
        <h2 className="text-[18px] font-bold tracking-tight text-card-foreground">
          {t({ en: "Before you continue", he: "לפני שממשיכים" })}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {t({
            en: "ParentPulse turns messages from the groups you choose into tasks. Message content, media and voice recordings are never stored.",
            he: "ParentPulse הופכת הודעות מהקבוצות שתבחרו למשימות. תוכן ההודעות, מדיה והקלטות קוליות לעולם אינם נשמרים.",
          })}
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={legal}
              onChange={(e) => setLegal(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-[13px] leading-relaxed text-card-foreground">
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

        </div>

        <button
          onClick={() => void accept()}
          disabled={!legal || !notice || busy}
          className="mt-5 h-10 w-full rounded-lg bg-primary text-[14px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy
            ? t({ en: "Saving…", he: "שומרים…" })
            : t({ en: "Agree and continue", he: "מאשר/ת וממשיך/ה" })}
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t({
            en: "You can withdraw consent or delete your data at any time in Settings.",
            he: "ניתן לבטל את ההסכמה או למחוק את המידע בכל רגע דרך ההגדרות.",
          })}
        </p>
      </div>
    </div>
  );
}
