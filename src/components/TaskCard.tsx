import { Calendar, Check } from "lucide-react";
import { useLang } from "@/lib/lang";
import type { Task } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

const categoryStyles: Record<Task["category"], string> = {
  school: "bg-school/12 text-school",
  sports: "bg-sports/14 text-sports",
  social: "bg-social/14 text-social",
};

const railStyles: Record<Task["category"], string> = {
  school: "bg-school",
  sports: "bg-sports",
  social: "bg-social",
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

  return (
    <article
      className={cn(
        "card-soft relative overflow-hidden rounded-3xl p-4 ps-5 transition-all",
        done && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-3 start-0 w-1 rounded-full", railStyles[task.category])}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-tight",
            categoryStyles[task.category],
          )}
        >
          {t(task.categoryLabel)}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-tight",
            task.urgent ? "bg-peach text-peach-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {t(task.due)}
        </span>
      </div>

      <h3
        className={cn(
          "mt-3 font-display text-[17px] font-bold leading-snug tracking-tight text-card-foreground",
          done && "line-through",
        )}
      >
        {t(task.title)}
      </h3>

      <p className="mt-1 text-xs font-semibold text-muted-foreground">{t(task.source)}</p>

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
          <Calendar className="h-[18px] w-[18px]" />
        </button>
      </div>
    </article>
  );
}
