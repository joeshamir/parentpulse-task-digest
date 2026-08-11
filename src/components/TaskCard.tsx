import { CalendarPlus, Check, Clock, GraduationCap, PartyPopper, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLang } from "@/lib/lang";
import type { Task } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

const tileStyles: Record<Task["category"], string> = {
  school: "bg-school/12 text-school",
  sports: "bg-sports/14 text-sports",
  social: "bg-social/14 text-social",
};

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
      className={cn("card-soft rounded-[28px] p-5 transition-all", done && "opacity-60")}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t(task.source)}
          </p>
          <h3
            className={cn(
              "mt-2 font-display text-[19px] font-bold leading-snug tracking-tight text-card-foreground",
              done && "line-through",
            )}
          >
            {t(task.title)}
          </h3>
        </div>

        <span
          aria-hidden
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            tileStyles[task.category],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {t(task.due)}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-bold",
            done
              ? "bg-success/15 text-success"
              : task.urgent
                ? "bg-peach text-peach-foreground"
                : tileStyles[task.category],
          )}
        >
          {done
            ? t({ en: "Done", he: "בוצע" })
            : task.urgent
              ? t({ en: "Urgent", he: "דחוף" })
              : t(task.categoryLabel)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onToggle}
          className={cn(
            "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-bold transition-colors",
            done
              ? "bg-success text-success-foreground"
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
        <button
          aria-label={t({ en: "Add to Calendar", he: "הוספה ליומן" })}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-colors hover:bg-muted"
        >
          <CalendarPlus className="h-[18px] w-[18px]" />
        </button>
      </div>
    </article>
  );
}
