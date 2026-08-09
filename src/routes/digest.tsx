import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useLang } from "@/lib/lang";
import { digest, type DigestItem } from "@/lib/parentpulse-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/digest")({
  head: () => ({
    meta: [
      { title: "Digest — ParentPulse Group Summaries" },
      {
        name: "description",
        content:
          "Concise daily and weekly summaries of everything posted in your parent groups that you should know but don't need to act on.",
      },
      { property: "og:title", content: "Digest — ParentPulse" },
      {
        property: "og:description",
        content: "Daily and weekly summaries of your school and activity groups.",
      },
    ],
  }),
  component: DigestScreen,
});

function DigestScreen() {
  const { t } = useLang();
  const [range, setRange] = useState<"today" | "week">("today");
  const items = digest[range === "today" ? "today" : "week"];

  return (
    <MobileShell>
      <header className="px-5 pt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t({ en: "Digest", he: "תקציר" })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t({
            en: "Updates worth knowing — nothing to do.",
            he: "עדכונים שכדאי לדעת — בלי משימות.",
          })}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["today", "week"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cn(
                "rounded-lg py-2 text-[13px] font-bold transition-colors",
                range === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {key === "today"
                ? t({ en: "Today", he: "היום" })
                : t({ en: "This Week", he: "השבוע" })}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-4 space-y-3 px-5">
        {items.map((item) => (
          <SummaryCard key={item.id} item={item} />
        ))}
      </section>
    </MobileShell>
  );
}

function SummaryCard({ item }: { item: DigestItem }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-start"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t(item.group)} · {t(item.time)}
          </span>
          <span className="mt-1 block text-[15px] font-bold leading-snug text-card-foreground">
            {t(item.title)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {t(item.body)}
        </p>
      )}
    </article>
  );
}
