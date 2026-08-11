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
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-border bg-background sm:border-x">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-xl">
          <span className="flex items-center gap-2" dir="ltr">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-background">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 12.5h4l2-4.5 3.5 8 2.5-5 1.8 3h5.2" />
              </svg>
            </span>
            <span className="text-[15px] font-bold leading-none tracking-tight text-foreground">
              ParentPulse
            </span>
          </span>
          <button
            onClick={toggle}
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            aria-label="Toggle language"
          >
            {lang === "en" ? "עברית" : "English"}
          </button>
        </div>

        <main className="flex-1 pb-28">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-background/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <ul className="grid grid-cols-3">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  activeOptions={{ exact: tab.exact }}
                  className="flex flex-col items-center gap-1 py-2.5 text-muted-foreground transition-colors data-[status=active]:text-foreground"
                >
                  <tab.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  <span className="text-[11px] font-semibold tracking-tight">{t(tab.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
