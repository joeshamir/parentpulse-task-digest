import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { CheckCircle2, Settings, Users } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { ConsentGate } from "@/components/ConsentGate";
import { useLang } from "@/lib/lang";

const tabs = [
  { to: "/", icon: CheckCircle2, label: { en: "Actions", he: "משימות" }, exact: true },
  { to: "/groups", icon: Users, label: { en: "Groups", he: "קבוצות" }, exact: false },
  { to: "/settings", icon: Settings, label: { en: "Settings", he: "הגדרות" }, exact: false },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const { t, lang, toggle, dir } = useLang();
  const pathname = useLocation({ select: (location) => location.pathname });
  const router = useRouter();

  // Warm the other tabs' code in the background so switching is instant.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const preload = () => {
      for (const tab of tabs) {
        void router.preloadRoute({ to: tab.to }).catch(() => undefined);
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preload, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 300);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <div dir={dir} className="app-canvas min-h-screen text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-border bg-background sm:border-x">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-xl">
          <span className="flex items-center gap-2" dir="ltr">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
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

        <main key={pathname} className="animate-page-enter flex-1 pb-28">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ul className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-card/80 p-1.5 shadow-[0_8px_24px_-16px_oklch(0.2_0.05_280/0.5)] backdrop-blur-xl">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  activeOptions={{ exact: tab.exact }}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted-foreground transition-colors data-[status=active]:text-primary"
                >
                  <tab.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <span className="text-[11px] font-medium tracking-tight">{t(tab.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <ConsentGate />
    </div>
  );
}
