import { Calendar, Check } from "lucide-react";
import { useLang } from "@/lib/lang";
import type { Task } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

const categoryStyles: Record<Task["category"], string> = {
  school: "bg-school/12 text-school",
  sports: "bg-sports/12 text-sports",
  social: "bg-social/12 text-social",
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
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity",
        done && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            categoryStyles[task.category],
          )}
        >
          {t(task.categoryLabel)}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            task.urgent
              ? "bg-warning/18 text-warning"
              : "bg-muted text-muted-foreground",
          )}
        >
          {t(task.due)}
        </span>
      </div>

      <h3
        className={cn(
          "mt-3 text-[17px] font-bold leading-snug text-card-foreground",
          done && "line-through",
        )}
      >
        {t(task.title)}
      </h3>

      <p className="mt-1 text-xs font-medium text-muted-foreground">{t(task.source)}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onToggle}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-colors",
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
        <button className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-bold text-foreground transition-colors hover:bg-accent">
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate">{t({ en: "Add to Calendar", he: "ליומן" })}</span>
        </button>
      </div>
    </article>
  );
}
