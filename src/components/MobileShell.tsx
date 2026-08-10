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
    <div dir={dir} className="app-canvas min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pb-3 pt-5 backdrop-blur-xl">
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-2xl bg-primary text-[13px] font-extrabold text-primary-foreground">
              P
            </span>
            <span className="font-display text-[17px] font-extrabold tracking-tight text-foreground">
              ParentPulse
            </span>
          </span>
          <button
            onClick={toggle}
            className="shrink-0 rounded-full bg-card/70 px-3 py-1.5 text-xs font-bold text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
            aria-label="Toggle language"
          >
            {lang === "en" ? "עברית" : "English"}
          </button>
        </div>

        <main className="flex-1 pb-32">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <ul className="grid grid-cols-3 gap-1 rounded-[1.75rem] bg-card/90 p-1.5 shadow-[0_18px_40px_-18px_color-mix(in_oklab,var(--color-foreground)_45%,transparent)] ring-1 ring-border backdrop-blur-xl">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  activeOptions={{ exact: tab.exact }}
                  className="flex flex-col items-center gap-1 rounded-[1.4rem] py-2.5 text-muted-foreground transition-all data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
                >
                  <tab.icon className="h-[18px] w-[18px]" />
                  <span className="text-[11px] font-bold">{t(tab.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
