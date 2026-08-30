import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  FlaskConical,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";
import { supabase } from "@/integrations/supabase/browser-client";
import {
  disablePush,
  enablePush,
  isIos,
  isStandalone,
  pushSupported,
} from "@/lib/push";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ParentPulse" },
      {
        name: "description",
        content:
          "Pair the WhatsApp bridge, turn the daily summary notification on or off, and manage your ParentPulse account.",
      },
      { property: "og:title", content: "Settings — ParentPulse" },
      {
        property: "og:description",
        content: "WhatsApp pairing, daily summary notifications, language and privacy settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsScreen,
});

// Session cache so switching back to this tab renders instantly.
let settingsCache: {
  userId: string;
  connection: string;
  qrCode: string | null;
  lastSeen: number | null;
  notifyOn: boolean;
  sendHour: number;
} | null = null;

function SettingsScreen() {
  const { t, lang, toggle, dir } = useLang();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const signedOut = !authLoading && !user;

  const cached = user && settingsCache?.userId === user.id ? settingsCache : null;
  const [connection, setConnection] = useState(cached?.connection ?? "pending_qr");
  const [qrCode, setQrCode] = useState<string | null>(cached?.qrCode ?? null);
  const [lastSeen, setLastSeen] = useState<number | null>(cached?.lastSeen ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [testing, setTesting] = useState(false);
  const [requestingReconnect, setRequestingReconnect] = useState(false);
  const [awaitingQrSince, setAwaitingQrSince] = useState<number | null>(null);
  const [qrTimedOut, setQrTimedOut] = useState(false);
  const [autoRetried, setAutoRetried] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // Notification preferences
  const [notifyOn, setNotifyOn] = useState(cached?.notifyOn ?? false);
  const [sendHour, setSendHour] = useState(cached?.sendHour ?? 8);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyBlocked, setNotifyBlocked] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void supabase
      .from("whatsapp_sessions")
      .select("status, qr_code_str, updated_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        if (data.status) setConnection(data.status);
        if (data.qr_code_str) setQrCode(data.qr_code_str);
        if (data.updated_at) setLastSeen(new Date(data.updated_at).getTime());
      });

    void supabase
      .from("notification_prefs")
      .select("daily_summary_enabled, send_hour_local")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setNotifyOn(data.daily_summary_enabled);
        setSendHour(data.send_hour_local ?? 8);
      });

    const channel = supabase
      .channel("parentpulse_settings_status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_sessions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as {
            status?: string;
            qr_code_str?: string | null;
            updated_at?: string | null;
          };
          setConnection(row.status ?? "pending_qr");
          const nextQr = row.qr_code_str ?? null;
          setQrCode(nextQr);
          setLastSeen(row.updated_at ? new Date(row.updated_at).getTime() : Date.now());
          if (nextQr) {
            setAwaitingQrSince(null);
            setQrTimedOut(false);
            setAutoRetried(false);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  // Keep the session cache warm for instant tab switches.
  useEffect(() => {
    if (user) {
      settingsCache = { userId: user.id, connection, qrCode, lastSeen, notifyOn, sendHour };
    }
  }, [user, connection, qrCode, lastSeen, notifyOn, sendHour]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "denied") setNotifyBlocked(true);
  }, []);

  // Ticks the clock so "last activity" and the offline check stay honest.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  // If no QR shows up within 20s, retry once automatically, then give up.
  useEffect(() => {
    if (!awaitingQrSince) return;
    const timer = setTimeout(() => {
      if (!autoRetried) {
        setAutoRetried(true);
        void requestReconnect(true);
      } else {
        setQrTimedOut(true);
      }
    }, 20_000);
    return () => clearTimeout(timer);
  }, [awaitingQrSince, autoRetried]);

  // Actions that need an account: say what's needed and go to sign-in,
  // instead of dead-ending on a bare toast.
  function requireSignIn() {
    toast(
      t({
        en: "Sign in to manage your connector — taking you to sign in.",
        he: "יש להתחבר כדי לנהל את המחבר — מעבירים אתכם למסך הכניסה.",
      }),
    );
    void navigate({ to: "/auth" });
  }

  async function savePrefs(patch: { daily_summary_enabled?: boolean; send_hour_local?: number }) {
    if (!user) return false;
    const { error } = await supabase.from("notification_prefs").upsert(
      {
        user_id: user.id,
        daily_summary_enabled: patch.daily_summary_enabled ?? notifyOn,
        send_hour_local: patch.send_hour_local ?? sendHour,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return !error;
  }

  async function toggleNotifications(next: boolean) {
    if (!user) {
      requireSignIn();
      return;
    }
    setNotifyBusy(true);
    if (!next) {
      await disablePush();
      const ok = await savePrefs({ daily_summary_enabled: false });
      setNotifyBusy(false);
      if (!ok) {
        toast.error(t({ en: "Could not save the setting.", he: "לא ניתן לשמור את ההגדרה." }));
        return;
      }
      setNotifyOn(false);
      toast.success(t({ en: "Daily notification off", he: "ההתראה היומית כובתה" }));
      return;
    }

    const result = await enablePush(user.id);
    if (!result.ok) {
      setNotifyBusy(false);
      if (result.reason === "ios-install") {
        toast.error(
          t({
            en: "On iPhone, add ParentPulse to your Home Screen first (Share → Add to Home Screen), then turn notifications on from there.",
            he: "באייפון יש להוסיף את ParentPulse למסך הבית (שיתוף → הוספה למסך הבית) ורק אז להפעיל התראות.",
          }),
        );
      } else if (result.reason === "denied") {
        setNotifyBlocked(true);
        toast.error(
          t({
            en: "Notifications are blocked. Allow them for this site in your browser settings.",
            he: "ההתראות חסומות. יש לאשר אותן לאתר זה בהגדרות הדפדפן.",
          }),
        );
      } else {
        toast.error(
          t({
            en: "This browser can't receive notifications.",
            he: "הדפדפן הזה לא יכול לקבל התראות.",
          }),
        );
      }
      return;
    }

    const ok = await savePrefs({ daily_summary_enabled: true });
    setNotifyBusy(false);
    if (!ok) {
      toast.error(t({ en: "Could not save the setting.", he: "לא ניתן לשמור את ההגדרה." }));
      return;
    }
    setNotifyBlocked(false);
    setNotifyOn(true);
    toast.success(
      t({ en: "Daily summary notification on", he: "ההתראה היומית הופעלה" }),
    );
  }

  async function changeHour(hour: number) {
    setSendHour(hour);
    const ok = await savePrefs({ send_hour_local: hour });
    if (!ok) toast.error(t({ en: "Could not save the time.", he: "לא ניתן לשמור את השעה." }));
  }

  async function sendTestNotification() {
    if (!user) return;
    setTestingPush(true);
    const { error } = await supabase
      .from("notification_prefs")
      .upsert(
        {
          user_id: user.id,
          daily_summary_enabled: notifyOn,
          send_hour_local: sendHour,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jerusalem",
          test_requested_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    setTestingPush(false);
    if (error) {
      toast.error(t({ en: "Could not queue the test.", he: "לא ניתן לשלוח בדיקה." }));
      return;
    }
    toast.success(
      t({
        en: "Test queued — it should arrive within about 20 seconds.",
        he: "בדיקה נשלחה — ההתראה אמורה להגיע תוך כ-20 שניות.",
      }),
    );
  }

  async function sendTestTask() {
    if (!user) {
      requireSignIn();
      return;
    }
    setTesting(true);
    const { error } = await supabase.from("action_items").insert({
      user_id: user.id,
      group_name: "ParentPulse",
      title: t({
        en: "Test task — pay 25₪ to the class committee",
        he: "משימת בדיקה — לשלם 25₪ לוועד כיתה",
      }),
      category: "School",
    });
    setTesting(false);
    if (error) {
      toast.error(t({ en: "Could not create the test task.", he: "לא ניתן ליצור משימת בדיקה." }));
      return;
    }
    toast.success(t({ en: "Test task added to Actions", he: "משימת בדיקה נוספה למשימות" }));
  }

  async function requestReconnect(silent = false) {
    if (!user) {
      if (!silent) requireSignIn();
      return;
    }
    setRequestingReconnect(true);
    setQrTimedOut(false);
    setQrCode(null);
    const { error } = await supabase
      .from("whatsapp_sessions")
      .upsert(
        { user_id: user.id, reconnect_requested_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    setRequestingReconnect(false);
    if (error) {
      toast.error(t({ en: "Could not request reconnect.", he: "לא ניתן לבקש חיבור מחדש." }));
      return;
    }
    setAwaitingQrSince(Date.now());
    if (!silent) {
      toast.success(
        t({
          en: "Reconnect requested — a fresh QR will appear in a few seconds",
          he: "בקשת חיבור מחדש נשלחה — קוד QR חדש יופיע תוך שניות",
        }),
      );
    }
  }

  async function restartBridge() {
    if (!user) {
      toast(t({ en: "Sign in first.", he: "יש להתחבר תחילה." }));
      return;
    }
    setRestarting(true);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setRestarting(false);
      toast.error(
        t({
          en: "Could not get your session. Please sign in again.",
          he: "לא ניתן לקבל את הסשן. אנא התחברו שוב.",
        }),
      );
      return;
    }
    try {
      const res = await fetch("/api/restart-bridge", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && body.success) {
        toast.success(
          t({
            en: "Restart requested. The connector should be back online within 30–60 seconds.",
            he: "בקשת ההפעלה נשלחה. המחבר אמור לחזור לפעולה תוך 30–60 שניות.",
          }),
        );
        setAwaitingQrSince(Date.now());
      } else {
        toast.error(
          t({
            en: body.error || "Could not restart the connector.",
            he: body.error
              ? `לא ניתן להפעיל את המחבר מחדש: ${body.error}`
              : "לא ניתן להפעיל את המחבר מחדש.",
          }),
        );
      }
    } catch {
      toast.error(t({ en: "Network error. Please try again.", he: "שגיאת רשת. אנא נסו שוב." }));
    } finally {
      setRestarting(false);
    }
  }

  const bridgeOffline = lastSeen === null || now - lastSeen > 45_000;
  const connected = connection === "connected";
  const showQr = Boolean(qrCode) && !connected && !bridgeOffline;
  const awaitingQr = Boolean(awaitingQrSince) && !qrCode && !bridgeOffline;
  const live = connected && !bridgeOffline;
  const secondsSinceSeen = lastSeen ? Math.max(0, Math.round((now - lastSeen) / 1000)) : null;
  const lastActivity =
    secondsSinceSeen === null
      ? null
      : secondsSinceSeen < 60
        ? t({ en: "Last activity just now", he: "פעילות אחרונה ממש עכשיו" })
        : t({
            en: `Last activity ${Math.round(secondsSinceSeen / 60)} min ago`,
            he: `פעילות אחרונה לפני ${Math.round(secondsSinceSeen / 60)} דק׳`,
          });

  const iosNeedsInstall = isIos() && !isStandalone();
  const canNotify = pushSupported() && !iosNeedsInstall;

  return (
    <MobileShell>
      <header className="px-5 pt-5">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {t({ en: "Settings", he: "הגדרות" })}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          {t({
            en: "Pairing, notifications and your account.",
            he: "חיבור, התראות והחשבון שלך.",
          })}
        </p>
      </header>

      {/* WhatsApp bridge */}
      <section className="mt-4 px-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold tracking-tight text-card-foreground">
                {t({ en: "WhatsApp Bridge", he: "גשר וואטסאפ" })}
              </p>
              <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                {live
                  ? t({ en: "Connected", he: "מחובר" })
                  : bridgeOffline
                    ? t({ en: "Connector offline", he: "המחבר לא פעיל" })
                    : t({ en: "Waiting for pairing", he: "ממתין לצימוד" })}
                {lastActivity ? ` · ${lastActivity}` : ""}
              </p>
            </div>
            <button
              onClick={() => void requestReconnect()}
              disabled={requestingReconnect}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <QrCode className="h-3.5 w-3.5" />
              {requestingReconnect
                ? t({ en: "Requesting…", he: "מבקשים…" })
                : t({ en: "Re-scan QR", he: "סריקת QR" })}
            </button>
          </div>

          {bridgeOffline && (
            <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="flex items-start gap-2 text-[12px] font-semibold leading-relaxed text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {t({
                  en: "Your background connector isn't running, so a new QR can't be created right now.",
                  he: "המחבר שרץ ברקע אינו פעיל, ולכן לא ניתן ליצור קוד QR כרגע.",
                })}
              </p>
              <button
                onClick={() => void restartBridge()}
                disabled={restarting}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-warning px-3 py-2 text-[12px] font-semibold text-warning-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {restarting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t({ en: "Restarting connector…", he: "מפעילים את המחבר מחדש…" })}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t({ en: "Restart connector", he: "הפעלת המחבר מחדש" })}
                  </>
                )}
              </button>
            </div>
          )}

          {awaitingQr && (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-border bg-background p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-3 text-center text-[12px] font-medium leading-relaxed text-muted-foreground">
                {t({
                  en: "Preparing a new code… this usually takes 2–6 seconds.",
                  he: "מכינים קוד חדש… זה לוקח בדרך כלל 2–6 שניות.",
                })}
              </p>
              {qrTimedOut && (
                <p className="mt-2 text-center text-[12px] font-semibold leading-relaxed text-destructive">
                  {t({
                    en: "Still nothing. The connector may need a restart — see the instructions above.",
                    he: "עדיין אין קוד. ייתכן שצריך להפעיל את המחבר מחדש — ראו הוראות למעלה.",
                  })}
                </p>
              )}
            </div>
          )}

          {showQr && (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-border bg-background p-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode ?? "")}`}
                alt={t({ en: "WhatsApp pairing QR code", he: "קוד QR לצימוד וואטסאפ" })}
                className="h-44 w-44 rounded-lg"
              />
              <p className="mt-3 text-center text-[12px] font-medium leading-relaxed text-muted-foreground">
                {t({
                  en: "Open WhatsApp → Settings → Linked devices → Link a device, then point your camera at this code.",
                  he: "פתחו את וואטסאפ → הגדרות → מכשירים מקושרים → קישור מכשיר, וכוונו את המצלמה לקוד.",
                })}
              </p>
            </div>
          )}

          <button
            onClick={sendTestTask}
            disabled={testing}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            {testing
              ? t({ en: "Sending…", he: "שולחים…" })
              : t({ en: "Send test task", he: "שליחת משימת בדיקה" })}
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className="mt-6 px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t({ en: "Notifications", he: "התראות" })}
        </h2>
        <div className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-tight text-card-foreground">
                {t({ en: "Daily summary", he: "סיכום יומי" })}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {t({
                  en: "One notification a day with your open tasks. Off by default.",
                  he: "התראה אחת ביום עם המשימות הפתוחות. כבויה כברירת מחדל.",
                })}
              </p>
            </div>
            <Switch
              checked={notifyOn}
              disabled={notifyBusy || !user || !canNotify}
              onCheckedChange={(v) => void toggleNotifications(v)}
              aria-label={t({ en: "Daily summary notification", he: "התראת סיכום יומי" })}
            />
          </div>

          {notifyOn && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <span className="min-w-0 text-[14px] font-semibold tracking-tight text-card-foreground">
                {t({ en: "Arrives at", he: "מגיעה בשעה" })}
              </span>
              <select
                value={sendHour}
                onChange={(e) => void changeHour(Number(e.target.value))}
                className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[12px] font-semibold text-foreground outline-none"
                aria-label={t({ en: "Notification hour", he: "שעת ההתראה" })}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          )}

          {notifyOn && (
            <button
              onClick={() => void sendTestNotification()}
              disabled={testingPush}
              className="flex w-full items-center gap-2 px-4 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {testingPush
                ? t({ en: "Queuing…", he: "שולחים…" })
                : t({ en: "Send test notification", he: "שליחת התראת בדיקה" })}
            </button>
          )}

          {(iosNeedsInstall || !pushSupported() || notifyBlocked) && (
            <p
              className={cn(
                "px-4 py-3 text-[12px] font-medium leading-relaxed",
                notifyBlocked ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {notifyBlocked
                ? t({
                    en: "Notifications are blocked for this site. Allow them in your browser settings, then switch this on again.",
                    he: "ההתראות חסומות לאתר הזה. יש לאשר אותן בהגדרות הדפדפן ואז להפעיל שוב.",
                  })
                : iosNeedsInstall
                  ? t({
                      en: "On iPhone, add ParentPulse to your Home Screen (Share → Add to Home Screen) and open it from there to enable notifications.",
                      he: "באייפון יש להוסיף את ParentPulse למסך הבית (שיתוף → הוספה למסך הבית) ולפתוח משם כדי להפעיל התראות.",
                    })
                  : t({
                      en: "This browser doesn't support notifications.",
                      he: "הדפדפן הזה אינו תומך בהתראות.",
                    })}
            </p>
          )}
        </div>
      </section>

      {/* Preferences */}
      <section className="mt-6 px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t({ en: "Preferences", he: "העדפות" })}
        </h2>
        <div className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <span className="min-w-0 text-[14px] font-semibold tracking-tight text-card-foreground">
              {t({ en: "Language", he: "שפה" })}
            </span>
            <button
              onClick={toggle}
              className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              {lang === "en" ? "English" : "עברית"}
            </button>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
            <span className="min-w-0 truncate text-[14px] font-semibold tracking-tight text-card-foreground">
              {user?.email ?? t({ en: "Not signed in", he: "לא מחוברים" })}
            </span>
            {user ? (
              <button
                onClick={() => signOut()}
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {t({ en: "Sign out", he: "יציאה" })}
              </button>
            ) : (
              <Link
                to="/auth"
                className="shrink-0 rounded-md bg-foreground px-2.5 py-1 text-[12px] font-semibold text-background"
              >
                {t({ en: "Sign in", he: "כניסה" })}
              </Link>
            )}
          </div>
          <Link
            to="/privacy"
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-[14px] font-semibold tracking-tight text-card-foreground">
                {t({ en: "Privacy & Security", he: "פרטיות ואבטחה" })}
              </span>
            </span>
            <span className="text-[12px] font-semibold text-muted-foreground">
              {dir === "rtl" ? "←" : "→"}
            </span>
          </Link>
        </div>
      </section>

      <div className="h-10" />
    </MobileShell>
  );
}
