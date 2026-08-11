import { useRef, useState } from "react";
import { Check, Clock, GraduationCap, PartyPopper, Plus, Trash2, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLang } from "@/lib/lang";
import type { Task } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

const tileIcons: Record<Task["category"], LucideIcon> = {
  school: GraduationCap,
  sports: Trophy,
  social: PartyPopper,
};

const REVEAL = 84;

export function TaskCard({
  task,
  done,
  onToggle,
  onDelete,
}: {
  task: Task;
  done: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const { t, lang } = useLang();
  const Icon = tileIcons[task.category];
  const rtl = lang === "he";

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  // Swipe left (LTR) / right (RTL) to reveal the delete action.
  const dir = rtl ? 1 : -1;

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
    setOffset(Math.abs(offset) > REVEAL / 2 ? REVEAL * dir : 0);
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={t({ en: "Delete task", he: "מחיקת משימה" })}
          className={cn(
            "absolute inset-y-0 flex w-[84px] items-center justify-center bg-destructive text-destructive-foreground",
            rtl ? "start-0" : "end-0",
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
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/8 text-primary"
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t(task.source)}
            </p>
            <h3
              className={cn(
                "mt-1 text-[16px] font-bold leading-snug tracking-tight text-card-foreground",
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
                <span className="rounded-md border border-info-border bg-info px-1.5 py-0.5 text-[11px] font-semibold text-info-foreground">
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
            onClick={onToggle}
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
