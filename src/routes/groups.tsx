import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FlaskConical, QrCode, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
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
  const { t, lang, toggle } = useLang();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(demoGroups.map((g) => [g.id, isRecommended(g)])),
  );
  const [liveGroups, setLiveGroups] = useState<
    Array<{ id: string; jid: string; name: string; members: number; hue: string }>
  >([]);
  const [connection, setConnection] = useState("pending_qr");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

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
        .select("status")
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
        (payload) => setConnection((payload.new as { status?: string }).status ?? "pending_qr"),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [user, t]);

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



  return (
    <MobileShell>
      <header className="px-5 pt-1">
        <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">
          {t({ en: "Groups & Settings", he: "קבוצות והגדרות" })}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {t({
            en: "Pick your groups in 10 seconds. We never store chat logs.",
            he: "בחרו קבוצות ב-10 שניות. אנחנו לא שומרים היסטוריית צ׳אט.",
          })}
        </p>
      </header>

      {/* Connection card */}
      <section className="mt-4 px-5">
        <div className="card-soft rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-card-foreground">
                {t({ en: "WhatsApp Bridge", he: "גשר וואטסאפ" })}
              </p>
              <p className={cn("flex items-center gap-1.5 text-xs font-semibold", connected ? "text-success" : "text-warning")}>
                <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success" : "bg-warning")} />
                {connected
                  ? t({ en: "Connected", he: "מחובר" })
                  : t({ en: "Waiting for connection", he: "ממתין לחיבור" })}
              </p>
            </div>
            <button
              onClick={() =>
                toast(t({ en: "Generating new QR code…", he: "מייצרים קוד QR חדש…" }))
              }
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-bold text-accent-foreground transition-colors hover:bg-muted"
            >
              <QrCode className="h-4 w-4" />
              {t({ en: "Re-scan QR", he: "סריקת QR" })}
            </button>
          </div>
          <button
            onClick={sendTestTask}
            disabled={testing}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            <FlaskConical className="h-4 w-4" />
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
            className="h-12 w-full rounded-full border border-border bg-card text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary ltr:pl-10 ltr:pr-4 rtl:pr-10 rtl:pl-4"
          />
        </div>
      </section>

      {/* Group list */}
      <section className="mt-4 px-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t({ en: "Your groups", he: "הקבוצות שלך" })}
          </h2>
          <span className="text-xs font-bold text-primary">
            {selectedCount} {t({ en: "selected", he: "נבחרו" })}
          </span>
        </div>

        <ul className="mt-2 space-y-3">
          {filtered.map((group) => {
            const haystack = `${group.name.en} ${group.name.he}`.toLowerCase();
            const rec = recommendKeywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
            const on = !!selected[group.id];
            return (
              <li
                key={group.id}
                className={cn(
                  "card-soft grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl p-4 transition-colors",
                  on && "bg-primary/[0.05]",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-bold",
                    group.hue,
                  )}
                >
                  {initials(t(group.name)) || <Users className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-card-foreground">
                    {t(group.name)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {group.members > 0
                        ? `${group.members} ${t({ en: "members", he: "חברים" })}`
                        : t({ en: "WhatsApp group", he: "קבוצת וואטסאפ" })}
                    </span>
                    {rec && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold text-primary">
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
            <li className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t({ en: "No groups match your search.", he: "לא נמצאו קבוצות תואמות." })}
            </li>
          )}
        </ul>
      </section>

      {/* Preferences */}
      <section className="mt-6 px-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t({ en: "Preferences", he: "העדפות" })}
        </h2>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 card-soft rounded-3xl p-4">
          <span className="min-w-0 text-[15px] font-bold text-card-foreground">
            {t({ en: "Language", he: "שפה" })}
          </span>
          <button
            onClick={toggle}
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-colors hover:bg-muted"
          >
            {lang === "en" ? "English" : "עברית"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 card-soft rounded-3xl p-4">
          <span className="min-w-0 truncate text-[15px] font-bold text-card-foreground">
            {user?.email ?? t({ en: "Not signed in", he: "לא מחוברים" })}
          </span>
          {user ? (
            <button
              onClick={() => signOut()}
              className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground transition-colors hover:bg-muted"
            >
              {t({ en: "Sign out", he: "יציאה" })}
            </button>
          ) : (
            <Link
              to="/auth"
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              {t({ en: "Sign in", he: "כניסה" })}
            </Link>
          )}
        </div>
      </section>

      {/* Sticky save */}
      <div className="fixed inset-x-0 bottom-[104px] z-30 mx-auto w-full max-w-md px-5">
        <button
          onClick={saveGroups}
          disabled={saving || (Boolean(user) && liveGroups.length === 0)}
          className="h-12 w-full rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_14px_30px_-12px_color-mix(in_oklab,var(--color-primary)_75%,transparent)] transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
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
