import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/browser-client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";
import { exportMyData, deleteMyAccount } from "@/lib/privacy.functions";

const RETENTION_OPTIONS = [7, 30, 90] as const;

/**
 * Data-subject controls required by the Israeli Privacy Protection Law and the
 * GDPR: retention choice, portable export, and complete erasure.
 */
export function PrivacyControls() {
  const { t } = useLang();
  const { user, signOut } = useAuth();
  const runExport = useServerFn(exportMyData);
  const runDelete = useServerFn(deleteMyAccount);

  const [retention, setRetention] = useState<number>(30);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void supabase
      .from("privacy_prefs")
      .select("completed_task_retention_days")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setRetention(data.completed_task_retention_days);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  async function changeRetention(days: number) {
    if (!user) return;
    const previous = retention;
    setRetention(days);
    const { error } = await supabase.from("privacy_prefs").upsert(
      {
        user_id: user.id,
        completed_task_retention_days: days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      setRetention(previous);
      toast.error(t({ en: "Could not save that.", he: "לא ניתן היה לשמור." }));
    }
  }

  async function download() {
    setExporting(true);
    try {
      const data = await runExport({});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parentpulse-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t({ en: "Your data was downloaded.", he: "המידע שלכם הורד." }));
    } catch {
      toast.error(t({ en: "Export failed. Please try again.", he: "הייצוא נכשל. נסו שוב." }));
    } finally {
      setExporting(false);
    }
  }

  async function eraseAccount() {
    setDeleting(true);
    try {
      await runDelete({});
      toast.success(
        t({ en: "Your account and data were deleted.", he: "החשבון והמידע נמחקו." }),
      );
      await signOut();
    } catch {
      toast.error(
        t({ en: "Deletion failed. Please contact us.", he: "המחיקה נכשלה. פנו אלינו." }),
      );
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <section className="mt-6 px-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t({ en: "Your data", he: "המידע שלכם" })}
      </h2>
      <div className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-4 py-3">
          <p className="text-[14px] font-semibold tracking-tight text-card-foreground">
            {t({ en: "Delete completed tasks after", he: "מחיקת משימות שבוצעו לאחר" })}
          </p>
          <div className="mt-2 flex gap-1.5">
            {RETENTION_OPTIONS.map((days) => (
              <button
                key={days}
                onClick={() => void changeRetention(days)}
                aria-pressed={retention === days}
                className={
                  retention === days
                    ? "flex-1 rounded-md bg-primary px-2 py-1.5 text-[12px] font-semibold text-primary-foreground"
                    : "flex-1 rounded-md border border-border px-2 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {t({ en: `${days} days`, he: `${days} ימים` })}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            {t({
              en: "All tasks are deleted after 12 months regardless. Message content is never stored.",
              he: "כל המשימות נמחקות בכל מקרה לאחר 12 חודשים. תוכן ההודעות לעולם אינו נשמר.",
            })}
          </p>
        </div>

        <button
          onClick={() => void download()}
          disabled={exporting}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50 disabled:opacity-60"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-[14px] font-semibold tracking-tight text-card-foreground">
              {t({ en: "Download my data", he: "הורדת המידע שלי" })}
            </span>
          </span>
          <span className="text-[12px] font-semibold text-muted-foreground">
            {exporting ? t({ en: "Preparing…", he: "מכינים…" }) : "JSON"}
          </span>
        </button>

        <div className="px-4 py-3">
          {confirming ? (
            <div>
              <p className="text-[13px] leading-relaxed text-card-foreground">
                {t({
                  en: "This permanently deletes your account, groups, tasks and settings. It cannot be undone.",
                  he: "פעולה זו מוחקת לצמיתות את החשבון, הקבוצות, המשימות וההגדרות. אי אפשר לבטל אותה.",
                })}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => void eraseAccount()}
                  disabled={deleting}
                  className="flex-1 rounded-md bg-destructive px-2 py-2 text-[12px] font-semibold text-destructive-foreground disabled:opacity-60"
                >
                  {deleting
                    ? t({ en: "Deleting…", he: "מוחקים…" })
                    : t({ en: "Delete everything", he: "מחיקת הכול" })}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-md border border-border px-2 py-2 text-[12px] font-semibold text-muted-foreground"
                >
                  {t({ en: "Cancel", he: "ביטול" })}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex w-full items-center gap-2.5 text-start"
            >
              <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
              <span className="text-[14px] font-semibold tracking-tight text-destructive">
                {t({ en: "Delete my account and data", he: "מחיקת החשבון והמידע" })}
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
