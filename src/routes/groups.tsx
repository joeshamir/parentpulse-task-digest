import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useLang } from "@/lib/lang";
import { groups } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "Groups & Settings — ParentPulse" },
      {
        name: "description",
        content:
          "Manage which WhatsApp parent groups ParentPulse listens to, and control language and notification settings.",
      },
      { property: "og:title", content: "Groups & Settings — ParentPulse" },
      {
        property: "og:description",
        content: "Manage connected parent groups and app preferences.",
      },
    ],
  }),
  component: GroupsScreen,
});

function GroupsScreen() {
  const { t, lang, toggle } = useLang();

  return (
    <MobileShell>
      <header className="px-5 pt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t({ en: "Groups & Settings", he: "קבוצות והגדרות" })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t({
            en: "Choose which groups ParentPulse listens to.",
            he: "בחרו לאילו קבוצות ParentPulse מקשיב.",
          })}
        </p>
      </header>

      <section className="mt-4 space-y-3 px-5">
        {groups.map((group) => (
          <div
            key={group.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-bold text-card-foreground">
                {t(group.name)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {group.members} {t({ en: "members", he: "חברים" })}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                group.active
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {group.active ? t({ en: "Active", he: "פעיל" }) : t({ en: "Paused", he: "מושהה" })}
            </span>
          </div>
        ))}
      </section>

      <section className="mt-6 px-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t({ en: "Preferences", he: "העדפות" })}
        </h2>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="min-w-0 text-[15px] font-bold text-card-foreground">
            {t({ en: "Language", he: "שפה" })}
          </span>
          <button
            onClick={toggle}
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-accent"
          >
            {lang === "en" ? "English" : "עברית"}
          </button>
        </div>
      </section>
    </MobileShell>
  );
}
