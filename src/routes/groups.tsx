import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, QrCode, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";
import { supabase } from "@/integrations/supabase/browser-client";
import { groups as demoGroups, isRecommended, recommendKeywords } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "Groups & Settings — ParentPulse" },
      {
        name: "description",
        content:
          "Connect the WhatsApp bridge and pick which parent groups ParentPulse listens to in under 10 seconds.",
      },
      { property: "og:title", content: "Groups & Settings — ParentPulse" },
      {
        property: "og:description",
        content: "Pair WhatsApp, pick your class and activity groups, mute the noise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupsScreen,
});

function initials(name: string) {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

function GroupsScreen() {
  const { t, lang, toggle, dir } = useLang();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(demoGroups.map((g) => [g.id, isRecommended(g)])),
  );
  const [liveGroups, setLiveGroups] = useState<
    Array<{ id: string; jid: string; name: string; members: number; hue: string }>
  >([]);
  const [connection, setConnection] = useState("pending_qr");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [requestingReconnect, setRequestingReconnect] = useState(false);
  const [awaitingQrSince, setAwaitingQrSince] = useState<number | null>(null);
  const [qrTimedOut, setQrTimedOut] = useState(false);
  const [autoRetried, setAutoRetried] = useState(false);
  const [showRestartHelp, setShowRestartHelp] = useState(false);


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      supabase
        .from("tracked_groups")
        .select("id, group_jid, group_name, is_tracked")
        .order("group_name"),
      supabase
        .from("whatsapp_sessions")
        .select("status, qr_code_str")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([groupsResult, sessionResult]) => {
      if (cancelled) return;
      if (groupsResult.error) {
        toast.error(t({ en: "Could not load groups.", he: "לא ניתן לטעון קבוצות." }));
      } else {
        const rows = groupsResult.data ?? [];
        setLiveGroups(
          rows.map((row) => ({
            id: row.id,
            jid: row.group_jid,
            name: row.group_name,
            members: 0,
            hue: "bg-school/15 text-school",
          })),
        );
        setSelected(Object.fromEntries(rows.map((row) => [row.id, row.is_tracked])));
      }
      if (sessionResult.data?.status) setConnection(sessionResult.data.status);
      if (sessionResult.data?.qr_code_str) setQrCode(sessionResult.data.qr_code_str);
    });

    const channel = supabase
      .channel("parentpulse_groups_status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracked_groups", filter: `user_id=eq.${user.id}` },
        () => window.location.reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_sessions", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setConnection((payload.new as { status?: string }).status ?? "pending_qr");
          const nextQr = (payload.new as { qr_code_str?: string | null }).qr_code_str ?? null;
          setQrCode(nextQr);
          if (nextQr) {
            setAwaitingQrSince(null);
            setQrTimedOut(false);
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user, t]);

  // If no QR shows up within 30s the worker is probably offline or not redeployed.
  useEffect(() => {
    if (!awaitingQrSince) return;
    const timer = setTimeout(() => setQrTimedOut(true), 30_000);
    return () => clearTimeout(timer);
  }, [awaitingQrSince]);

  const groups = user
    ? liveGroups.map((group) => ({
        ...group,
        name: { en: group.name, he: group.name },
      }))
    : demoGroups;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      `${g.name.en} ${g.name.he}`.toLowerCase().includes(q),
    );
  }, [groups, query]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const connected = connection === "connected";

  async function saveGroups() {
    if (!user) {
      toast(t({ en: "Sign in to save your groups.", he: "יש להתחבר כדי לשמור קבוצות." }));
      return;
    }
    setSaving(true);
    const updates = liveGroups.map((group) =>
      supabase
        .from("tracked_groups")
        .update({ is_tracked: !!selected[group.id] })
        .eq("id", group.id),
    );
    const results = await Promise.all(updates);
    setSaving(false);
    if (results.some((result) => result.error)) {
      toast.error(t({ en: "Could not save groups.", he: "לא ניתן לשמור קבוצות." }));
      return;
    }
    // The external worker refreshes this list frequently and applies changes
    // by stable WhatsApp group ID. This event lets other open app tabs update.
    window.dispatchEvent(new CustomEvent("parentpulse:groups-saved"));
    toast.success(t({ en: `Saved ${selectedCount} groups`, he: `נשמרו ${selectedCount} קבוצות` }));
  }

  async function sendTestTask() {
    if (!user) {
      toast(t({ en: "Sign in first.", he: "יש להתחבר תחילה." }));
      return;
    }
    setTesting(true);
    const firstSelected = liveGroups.find((group) => selected[group.id]);
    const { error } = await supabase.from("action_items").insert({
      user_id: user.id,
      group_name: firstSelected?.name ?? "ParentPulse",
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

  async function requestReconnect() {
    if (!user) {
      toast(t({ en: "Sign in first.", he: "יש להתחבר תחילה." }));
      return;
    }
    setRequestingReconnect(true);
    setQrTimedOut(false);
    setQrCode(null);
    const { error } = await supabase
      .from("whatsapp_sessions")
      .upsert(
        { user_id: user.id, reconnect_requested_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    setRequestingReconnect(false);
    if (error) {
      toast.error(t({ en: "Could not request reconnect.", he: "לא ניתן לבקש חיבור מחדש." }));
      return;
    }
    setAwaitingQrSince(Date.now());
    toast.success(t({ en: "Reconnect requested — a fresh QR will appear shortly", he: "בקשת חיבור מחדש נשלחה — קוד QR חדש יופיע בקרוב" }));
  }

  const showQr = Boolean(qrCode) && connection !== "connected";
  const awaitingQr = Boolean(awaitingQrSince) && !qrCode;
  const disconnected = connection === "disconnected";

  return (
    <MobileShell>
      <header className="px-5 pt-5">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {t({ en: "Groups & Settings", he: "קבוצות והגדרות" })}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          {t({
            en: "Pick your groups in 10 seconds. We never store chat logs.",
            he: "בחרו קבוצות ב-10 שניות. אנחנו לא שומרים היסטוריית צ׳אט.",
          })}
        </p>
      </header>

      {/* Connection card */}
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
              <p className={cn("mt-0.5 flex items-center gap-1.5 text-[12px] font-medium", awaitingQr ? "text-warning" : connected ? "text-success" : disconnected ? "text-destructive" : "text-muted-foreground")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", awaitingQr ? "animate-pulse bg-warning" : connected ? "bg-success" : disconnected ? "bg-destructive" : "bg-warning")} />
                {awaitingQr
                  ? t({ en: "Restarting connection…", he: "מאתחלים את החיבור…" })
                  : connected
                  ? t({ en: "Connected", he: "מחובר" })
                  : disconnected
                    ? t({ en: "Disconnected", he: "מנותק" })
                    : t({ en: "Waiting for QR scan", he: "ממתין לסריקת QR" })}
              </p>
            </div>
            <button
              onClick={requestReconnect}
              disabled={requestingReconnect}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
            >
              <QrCode className="h-3.5 w-3.5" />
              {requestingReconnect
                ? t({ en: "Requesting…", he: "מבקשים…" })
                : t({ en: "Re-scan QR", he: "סריקת QR" })}
            </button>
          </div>

          {awaitingQr && (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-border bg-background p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="mt-3 text-center text-[12px] font-medium leading-relaxed text-muted-foreground">
                {t({
                  en: "Asking the WhatsApp bridge for a fresh QR code. This usually takes 5–15 seconds.",
                  he: "מבקשים מגשר הוואטסאפ קוד QR חדש. זה לוקח בדרך כלל 5–15 שניות.",
                })}
              </p>
              {qrTimedOut && (
                <p className="mt-2 text-center text-[12px] font-semibold leading-relaxed text-destructive">
                  {t({
                    en: "Still nothing — the background worker may be offline or running an old version. Redeploy it and try again.",
                    he: "עדיין אין קוד — ייתכן שהשירות ברקע כבוי או מריץ גרסה ישנה. פרסו אותו מחדש ונסו שוב.",
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
                  he: "פתחו את וואטסאפ → הגדרות → מכשירים מקושרים → קישור מכשיר, וכוונו את המצלמה לקוד הזה.",
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

      {/* Search */}
      <section className="mt-5 px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t({ en: "Search groups…", he: "חיפוש קבוצות…" })}
            aria-label={t({ en: "Search groups", he: "חיפוש קבוצות" })}
            className="h-10 w-full rounded-lg border border-border bg-card text-[14px] outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 ltr:pl-10 ltr:pr-3 rtl:pr-10 rtl:pl-3"
          />
        </div>
      </section>

      {/* Group list */}
      <section className="mt-5 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t({ en: "Your groups", he: "הקבוצות שלך" })}
          </h2>
          <span className="text-[12px] font-semibold text-foreground">
            {selectedCount} {t({ en: "selected", he: "נבחרו" })}
          </span>
        </div>

        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((group) => {
            const haystack = `${group.name.en} ${group.name.he}`.toLowerCase();
            const rec = recommendKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
            const on = !!selected[group.id];
            return (
              <li
                key={group.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-[12px] font-semibold text-muted-foreground">
                  {initials(t(group.name)) || <Users className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold tracking-tight text-card-foreground">
                    {t(group.name)}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                    <span>
                      {group.members > 0
                        ? `${group.members} ${t({ en: "members", he: "חברים" })}`
                        : t({ en: "WhatsApp group", he: "קבוצת וואטסאפ" })}
                    </span>
                    {rec && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        <Sparkles className="h-3 w-3" />
                        {t({ en: "Recommended", he: "מומלץ" })}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={on}
                  onCheckedChange={(v) =>
                    setSelected((prev) => ({ ...prev, [group.id]: v }))
                  }
                  aria-label={`${t({ en: "Listen to", he: "האזנה ל" })} ${t(group.name)}`}
                />
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-6 text-center text-[13px] text-muted-foreground">
              {t({ en: "No groups match your search.", he: "לא נמצאו קבוצות תואמות." })}
            </li>
          )}
        </ul>
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

      {/* Sticky save */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 mx-auto w-full max-w-md border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <button
          onClick={saveGroups}
          disabled={saving || (Boolean(user) && liveGroups.length === 0)}
          className="h-10 w-full rounded-lg bg-foreground text-[14px] font-semibold tracking-tight text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving
            ? t({ en: "Saving…", he: "שומר…" })
            : t({ en: "Save Selected Groups", he: "שמירת הקבוצות שנבחרו" })}
        </button>
      </div>
      <div className="h-20" />
    </MobileShell>
  );
}
