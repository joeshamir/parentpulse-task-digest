import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useLang } from "@/lib/lang";

const DISMISS_KEY = "pp-install-banner-dismissed";

/**
 * Subtle, dismissible "Add to Home Screen" hint.
 * Shown only to mobile browser visitors who haven't installed the app yet.
 */
export function InstallBanner() {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari exposes standalone mode on navigator.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isMobile = /iphone|ipad|ipod|android/i.test(window.navigator.userAgent);
    const inIframe = window.self !== window.top;

    if (isMobile && !isStandalone && !inIframe) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div className="px-5 pt-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border px-4 py-3">
        <Share className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">
          {t({
            en: "Tap Share → Add to Home Screen to install ParentPulse.",
            he: "הקישו שיתוף ← הוספה למסך הבית כדי להתקין את ParentPulse.",
          })}
        </p>
        <button
          onClick={dismiss}
          aria-label={t({ en: "Dismiss", he: "סגירה" })}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
