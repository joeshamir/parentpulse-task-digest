import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { toast } from "sonner";
import { InstallBanner } from "@/components/InstallBanner";
import { MobileShell } from "@/components/MobileShell";
import { TaskCard } from "@/components/TaskCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/browser-client";
import { rowToTask, type ActionItemRow } from "@/lib/action-items";
import { useLang } from "@/lib/lang";
import { categoryFilters, tasks as demoTasks } from "@/lib/parentpulse-data";
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
      { property: "og:title", content: "ParentPulse — Today's Actions from Your Parent Groups" },
      {
        property: "og:description",
        content: "See every school, sports and social task pulled out of your WhatsApp parent groups in one calm, bilingual Hebrew/English feed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActionsScreen,
});

function ActionsScreen() {
  const { t, lang } = useLang();
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [rows, setRows] = useState<ActionItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  // Local completion state, used only for the signed-out demo feed.
  const [demoDone, setDemoDone] = useState<string[]>([]);
  // Cards playing their exit animation, and freshly-arrived cards to ease in.
  const [leavingIds, setLeavingIds] = useState<string[]>([]);
  const [freshIds, setFreshIds] = useState<string[]>([]);

  // Load the signed-in user's action items and keep them live.
  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from("action_items")
      .select("id, group_name, title, category, deadline, is_completed, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error) {
          toast.error(t({ en: "Could not load tasks.", he: "לא ניתן לטעון משימות." }));
          return;
        }
        setRows((data ?? []) as ActionItemRow[]);
      });

    const channel = supabase
      .channel("action_items_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "action_items", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== (payload.old as ActionItemRow).id);
            }
            const next = payload.new as ActionItemRow;
            const exists = prev.some((r) => r.id === next.id);
            // Newest tasks go to the top of the feed.
            return exists ? prev.map((r) => (r.id === next.id ? next : r)) : [next, ...prev];
          });
          if (payload.eventType === "INSERT") {
            const id = (payload.new as ActionItemRow).id;
            setFreshIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
            setTimeout(() => setFreshIds((prev) => prev.filter((x) => x !== id)), 800);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, t]);

  async function toggleComplete(row: ActionItemRow) {
    const nextValue = !row.is_completed;
    // Optimistic update; the realtime event confirms it.
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, is_completed: nextValue } : r)),
    );
    const { error } = await supabase
      .from("action_items")
      .update({ is_completed: nextValue })
      .eq("id", row.id);
    if (error) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, is_completed: row.is_completed } : r)),
      );
      toast.error(t({ en: "Could not update the task.", he: "לא ניתן לעדכן את המשימה." }));
    }
  }

  async function deleteTask(row: ActionItemRow) {
    // Play the exit animation before removing the card.
    setLeavingIds((prev) => [...prev, row.id]);
    const snapshot = rows;
    await new Promise((resolve) => setTimeout(resolve, 300));
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setLeavingIds((prev) => prev.filter((id) => id !== row.id));
    const { error } = await supabase.from("action_items").delete().eq("id", row.id);
    if (error) {
      setRows(snapshot);
      toast.error(t({ en: "Could not delete the task.", he: "לא ניתן למחוק את המשימה." }));
      return;
    }
    toast.success(t({ en: "Task deleted.", he: "המשימה נמחקה." }));
  }


  const signedIn = !!user;
  const liveTasks = rows.map(rowToTask);
  const source = signedIn ? liveTasks : demoTasks;
  const visible = source.filter((task) => filter === "all" || task.category === filter);
  const pending = signedIn
    ? rows.filter((r) => !r.is_completed).length
    : demoTasks.filter((task) => !demoDone.includes(task.id)).length;
  const doneCount = source.length - pending;



  const today = new Date().toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <MobileShell>
      <InstallBanner />
      <header className="px-5 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {today}
        </p>
        <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight">
          {t({ en: "Today's actions", he: "המשימות של היום" })}
        </h1>

        <div className="mt-4 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-card rtl:divide-x-reverse">
          <div className="px-4 py-3">
            <p className="text-[22px] font-bold leading-none tracking-tight text-primary">{pending}</p>
            <p className="mt-1.5 text-[12px] font-medium text-muted-foreground">
              {t({ en: "Open", he: "פתוחות" })}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[22px] font-bold leading-none tracking-tight text-primary/70">
              {doneCount}
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-muted-foreground">
              {t({ en: "Completed", he: "הושלמו" })}
            </p>
          </div>
        </div>

        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryFilters.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-[13px] font-semibold tracking-tight transition-colors",
                filter === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </header>


      {!authLoading && !signedIn && (
        <div className="mt-4 px-5">
          <Link
            to="/auth"
            className="flex items-center gap-3 rounded-xl border border-border p-3.5 transition-colors hover:border-foreground/25"
          >
            <LogIn className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 text-[13px]">
              <span className="block font-semibold tracking-tight text-foreground">
                {t({ en: "You're viewing a demo feed", he: "אתם צופים בפיד לדוגמה" })}
              </span>
              <span className="block text-muted-foreground">
                {t({ en: "Sign in to sync your real tasks.", he: "התחברו כדי לסנכרן משימות אמיתיות." })}
              </span>
            </span>
          </Link>
        </div>
      )}

      <section key={filter} className="animate-page-enter mt-4 space-y-3 px-5">
        {signedIn
          ? rows
              .map((row) => ({ row, task: rowToTask(row) }))
              .filter(({ task }) => filter === "all" || task.category === filter)
              .map(({ row, task }) => (
                <div
                  key={row.id}
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    leavingIds.includes(row.id) ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <TaskCard
                      task={task}
                      done={row.is_completed}
                      onToggle={() => toggleComplete(row)}
                      onDelete={() => deleteTask(row)}
                      leaving={leavingIds.includes(row.id)}
                      entering={freshIds.includes(row.id)}
                    />
                  </div>
                </div>
              ))
          : visible.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                done={demoDone.includes(task.id)}
                onToggle={() =>
                  setDemoDone((prev) =>
                    prev.includes(task.id)
                      ? prev.filter((id) => id !== task.id)
                      : [...prev, task.id],
                  )
                }
              />
            ))}

        {signedIn && !loading && visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t({
              en: "No tasks yet — they'll appear here as your groups are parsed.",
              he: "אין עדיין משימות — הן יופיעו כאן ברגע שהקבוצות ינותחו.",
            })}
          </p>
        )}
        {loading && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t({ en: "Loading…", he: "טוען…" })}
          </p>
        )}
      </section>
    </MobileShell>
  );
}
