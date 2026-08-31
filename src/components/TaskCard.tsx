import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  MoreHorizontal,
  PartyPopper,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/lang";
import type { Task } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

const tileIcons: Record<Task["category"], LucideIcon> = {
  school: GraduationCap,
  sports: Trophy,
  social: PartyPopper,
  other: MoreHorizontal,
};

const REVEAL = 84;

export function TaskCard({
  task,
  done,
  onToggle,
  onDelete,
  leaving = false,
  entering = false,
}: {
  task: Task;
  done: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  leaving?: boolean;
  entering?: boolean;
}) {
  const { t, lang } = useLang();
  const Icon = tileIcons[task.category];
  const rtl = lang === "he";

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // True right after a swipe, so the closing tap doesn't also open WhatsApp.
  const movedRef = useRef(false);

  // The delete panel sits on the trailing edge in LTR and the leading (right)
  // edge in RTL — in both cases it is on the right, so the card always slides left.
  const dir = -1;
  const open = offset !== 0;

  // Snap closed when the card's data changes (list refresh, completion, etc.).
  useEffect(() => {
    setOffset(0);
  }, [task.id, done, lang]);

  // Snap closed on any interaction outside this card.
  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOffset(0);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  function onPointerDown(e: React.PointerEvent) {
    if (!onDelete || e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const travel = Math.max(0, Math.min(REVEAL, dx * dir));
    setOffset(travel * dir);
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    start.current = null;
    const moved = Math.abs(offset) > 6;
    movedRef.current = moved;
    setOffset(Math.abs(offset) > REVEAL / 2 ? REVEAL * dir : 0);
  }

  const canOpen = Boolean(task.groupJid);
  const isMobile =
    typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  function openInWhatsApp() {
    // Ignore the tap that ends a swipe, or a tap while the delete panel is open.
    if (movedRef.current || open) {
      movedRef.current = false;
      return;
    }
    if (!task.groupJid) return;

    if (!isMobile) {
      void navigator.clipboard?.writeText(task.groupName ?? "").catch(() => {});
      toast.info(
        t({
          en: "Group chats open in WhatsApp on your phone. Group name copied.",
          he: "צ'אטים קבוצתיים נפתחים בוואטסאפ בטלפון. שם הקבוצה הועתק.",
        }),
      );
      return;
    }

    let left = false;
    const onHide = () => {
      left = true;
    };
    document.addEventListener("visibilitychange", onHide, { once: true });
    window.location.href = `whatsapp://chat?jid=${encodeURIComponent(task.groupJid)}`;
    // If the deep link didn't take, at least land the user inside WhatsApp.
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (!left && !document.hidden) window.location.href = "whatsapp://";
    }, 1200);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden rounded-xl",
        leaving &&
          "pointer-events-none -translate-x-6 opacity-0 transition-all duration-300 ease-in",
        entering && !leaving && "animate-card-enter",
      )}
    >
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={t({ en: "Delete task", he: "מחיקת משימה" })}
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          // Hidden at rest so it can never bleed through a translucent
          // (completed) card; fades in as the card is swiped.
          style={{ opacity: Math.min(1, Math.abs(offset) / (REVEAL / 2)) }}
          className={cn(
            "absolute inset-y-0 right-0 flex w-[84px] items-center justify-center rounded-e-xl bg-destructive text-destructive-foreground",
            rtl && "rounded-e-none rounded-s-xl",
            !dragging && "transition-opacity duration-200",
            !open && "pointer-events-none",
          )}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}

      <article
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ transform: `translateX(${offset}px)` }}
        className={cn(
          "relative rounded-xl border border-border bg-card p-4 transition-[transform,background-color]",
          dragging && "transition-none",
          done && "bg-muted/40",
        )}
      >
        <div
          {...(canOpen
            ? {
                role: "button" as const,
                tabIndex: 0,
                onClick: openInWhatsApp,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openInWhatsApp();
                  }
                },
                "aria-label": t({
                  en: "Open this group in WhatsApp",
                  he: "פתיחת הקבוצה בוואטסאפ",
                }),
              }
            : {})}
          className={cn(
            "flex items-start gap-3 rounded-lg text-start",
            canOpen && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
        >
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/8 text-primary"
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span className="truncate">{t(task.source)}</span>
              {canOpen &&
                (rtl ? (
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                ))}
            </p>
            <h3
              className={cn(
                "mt-1 text-[16px] font-bold leading-snug tracking-tight text-card-foreground transition-colors duration-300",
                done && "text-muted-foreground line-through",
              )}
            >
              {t(task.title)}
            </h3>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {t(task.due)}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="rounded-md border border-primary/20 bg-primary/8 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {t(task.categoryLabel)}
              </span>
              {!done && task.urgent && (
                <span className="rounded-md border border-urgent-border bg-urgent px-1.5 py-0.5 text-[11px] font-semibold text-urgent-foreground">
                  {t({ en: "Urgent", he: "דחוף" })}
                </span>
              )}
              {done && (
                <span className="animate-in fade-in rounded-md border border-info-border bg-info px-1.5 py-0.5 text-[11px] font-semibold text-info-foreground duration-300">
                  {t({ en: "Done", he: "בוצע" })}
                </span>
              )}
            </div>

            {task.added && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70">
                <Plus className="h-3 w-3" />
                {t(task.added)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
          <button
            onClick={() => {
              setOffset(0);
              onToggle();
            }}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold tracking-tight transition-colors",
              done
                ? "border border-border text-muted-foreground hover:text-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {done
                ? t({ en: "Completed", he: "הושלם" })
                : t({ en: "Mark Complete", he: "סמן כבוצע" })}
            </span>
          </button>

          {onDelete && (
            <button
              onClick={onDelete}
              aria-label={t({ en: "Delete task", he: "מחיקת משימה" })}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
