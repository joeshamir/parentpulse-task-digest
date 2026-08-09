import type { Task } from "@/lib/parentpulse-data";

export type ActionItemRow = {
  id: string;
  group_name: string;
  title: string;
  category: string;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
};

const categoryMap: Record<string, Task["category"]> = {
  School: "school",
  Sports: "sports",
  Social: "social",
  Other: "social",
};

const categoryLabels: Record<string, { en: string; he: string }> = {
  School: { en: "School", he: "בית ספר" },
  Sports: { en: "Sports", he: "ספורט" },
  Social: { en: "Social", he: "חברתי" },
  Other: { en: "Other", he: "אחר" },
};

export function isUrgent(deadline: string | null) {
  if (!deadline) return false;
  const diff = new Date(deadline).getTime() - Date.now();
  return diff <= 24 * 60 * 60 * 1000;
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return { en: "No deadline", he: "ללא תאריך" };
  const d = new Date(deadline);
  const fmt = (locale: string) =>
    d.toLocaleString(locale, {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  return { en: `Due ${fmt("en-GB")}`, he: `עד ${fmt("he-IL")}` };
}

export function rowToTask(row: ActionItemRow): Task {
  return {
    id: row.id,
    category: categoryMap[row.category] ?? "social",
    categoryLabel: categoryLabels[row.category] ?? categoryLabels["Other"]!,
    title: { en: row.title, he: row.title },
    due: formatDeadline(row.deadline),
    urgent: isUrgent(row.deadline) && !row.is_completed,
    source: { en: `From: ${row.group_name}`, he: `מתוך: ${row.group_name}` },
  };
}
