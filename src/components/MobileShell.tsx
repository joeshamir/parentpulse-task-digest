import { Link } from "@tanstack/react-router";
import { CheckCircle2, Inbox, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useLang } from "@/lib/lang";

const tabs = [
  { to: "/", icon: CheckCircle2, label: { en: "Actions", he: "משימות" }, exact: true },
  { to: "/digest", icon: Inbox, label: { en: "Digest", he: "תקציר" }, exact: false },
  { to: "/groups", icon: Users, label: { en: "Groups", he: "קבוצות" }, exact: false },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const { t, lang, toggle, dir } = useLang();

  return (
    <div dir={dir} className="min-h-screen bg-surface text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-border bg-background shadow-sm sm:border-x">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <span className="font-display text-lg font-semibold tracking-tight text-primary">
            ParentPulse
          </span>
          <button
            onClick={toggle}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent"
            aria-label="Toggle language"
          >
            {lang === "en" ? "עברית" : "English"}
          </button>
        </div>

        <main className="flex-1 pb-28">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-background/95 backdrop-blur">
          <ul className="grid grid-cols-3">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  activeOptions={{ exact: tab.exact }}
                  className="flex flex-col items-center gap-1 py-3 text-muted-foreground transition-colors data-[status=active]:text-primary"
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="text-[11px] font-semibold">{t(tab.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      </div>
    </div>
  );
}
