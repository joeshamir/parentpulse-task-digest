import { Check, Clock, GraduationCap, PartyPopper, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLang } from "@/lib/lang";
import type { Task } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

const tileIcons: Record<Task["category"], LucideIcon> = {
  school: GraduationCap,
  sports: Trophy,
  social: PartyPopper,
};

export function TaskCard({
  task,
  done,
  onToggle,
}: {
  task: Task;
  done: boolean;
  onToggle: () => void;
}) {
  const { t } = useLang();
  const Icon = tileIcons[task.category];

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-colors",
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
        </div>
      </div>

      <div className="mt-3.5 border-t border-border pt-3">
        <button
          onClick={onToggle}
          className={cn(
            "inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold tracking-tight transition-colors",
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
      </div>
    </article>
  );
}
