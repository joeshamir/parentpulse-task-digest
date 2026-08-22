import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/lang";
import { supabase } from "@/integrations/supabase/browser-client";
import { groups as demoGroups, isRecommended, recommendKeywords } from "@/lib/parentpulse-data";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "Groups — ParentPulse" },
      {
        name: "description",
        content:
          "Pick which WhatsApp parent groups ParentPulse listens to, in under 10 seconds.",
      },
      { property: "og:title", content: "Groups — ParentPulse" },
      {
        property: "og:description",
        content: "Pick your class and activity groups, mute the noise.",
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
  const { t } = useLang();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(demoGroups.map((g) => [g.id, isRecommended(g)])),
  );
  const [liveGroups, setLiveGroups] = useState<
    Array<{ id: string; jid: string; name: string; members: number; hue: string }>
  >([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void supabase
      .from("tracked_groups")
      .select("id, group_jid, group_name, is_tracked")
      .order("group_name")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error(t({ en: "Could not load groups.", he: "לא ניתן לטעון קבוצות." }));
          return;
        }
        const rows = data ?? [];
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
      });

    const channel = supabase
      .channel("parentpulse_groups_list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracked_groups", filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Apply changes in place — a full reload would wipe unsaved toggles.
          if (payload.eventType === "INSERT") {
            const row = payload.new as {
              id: string;
              group_jid: string;
              group_name: string;
              is_tracked: boolean;
            };
            setLiveGroups((prev) =>
              prev.some((g) => g.id === row.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: row.id,
                      jid: row.group_jid,
                      name: row.group_name,
                      members: 0,
                      hue: "bg-school/15 text-school",
                    },
                  ].sort((a, b) => a.name.localeCompare(b.name)),
            );
            setSelected((prev) => ({ ...prev, [row.id]: row.is_tracked }));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as { id: string; group_name: string };
            setLiveGroups((prev) =>
              prev.map((g) => (g.id === row.id ? { ...g, name: row.group_name } : g)),
            );
          } else if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setLiveGroups((prev) => prev.filter((g) => g.id !== id));
          }
        },
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
    return groups.filter((g) => `${g.name.en} ${g.name.he}`.toLowerCase().includes(q));
  }, [groups, query]);

  const selectedCount = Object.values(selected).filter(Boolean).length;

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
    window.dispatchEvent(new CustomEvent("parentpulse:groups-saved"));
    toast.success(t({ en: `Saved ${selectedCount} groups`, he: `נשמרו ${selectedCount} קבוצות` }));
  }

  return (
    <MobileShell>
      <header className="px-5 pt-5">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          {t({ en: "Groups", he: "קבוצות" })}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          {t({
            en: "Pick your groups in 10 seconds. We never store chat logs.",
            he: "בחרו קבוצות ב-10 שניות. אנחנו לא שומרים היסטוריית צ׳אט.",
          })}
        </p>
      </header>

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
                  onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [group.id]: v }))}
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
