import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TaskCard } from "@/components/TaskCard";
import { useLang } from "@/lib/lang";
import { categoryFilters, tasks } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ParentPulse — Today's Actions from Your Parent Groups" },
      {
        name: "description",
        content:
          "See every school, sports and social task pulled out of your WhatsApp parent groups in one calm, bilingual Hebrew/English feed.",
      },
      { property: "og:title", content: "ParentPulse — Today's Actions" },
      {
        property: "og:description",
        content: "Actionable tasks from your school and activity groups, in Hebrew and English.",
      },
    ],
  }),
  component: ActionsScreen,
});

function ActionsScreen() {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<string>("all");
  const [completed, setCompleted] = useState<string[]>([]);

  const visible = tasks.filter((task) => filter === "all" || task.category === filter);
  const pending = tasks.filter((task) => !completed.includes(task.id)).length;

  const today = new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <MobileShell>
      <header className="px-5 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {today}
        </p>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate font-display text-2xl font-bold tracking-tight">
            {t({ en: "Actions", he: "משימות" })}
          </h1>
          <span className="shrink-0 rounded-full bg-warning/18 px-3 py-1 text-xs font-bold text-warning">
            {pending} {t({ en: "Actions Pending", he: "משימות פתוחות" })}
          </span>
        </div>

        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryFilters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors",
                filter === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-4 space-y-3 px-5">
        {visible.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            done={completed.includes(task.id)}
            onToggle={() =>
              setCompleted((prev) =>
                prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id],
              )
            }
          />
        ))}
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t({ en: "Nothing here right now.", he: "אין כאן משימות כרגע." })}
          </p>
        )}
      </section>
    </MobileShell>
  );
}
