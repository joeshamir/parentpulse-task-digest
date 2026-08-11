export type Category = "school" | "sports" | "social";

export type Task = {
  id: string;
  category: Category;
  categoryLabel: { en: string; he: string };
  title: { en: string; he: string };
  due: { en: string; he: string };
  urgent: boolean;
  source: { en: string; he: string };
  added?: { en: string; he: string };
};

export const categoryFilters: {
  key: "all" | Category;
  label: { en: string; he: string };
}[] = [
  { key: "all", label: { en: "All", he: "הכול" } },
  { key: "school", label: { en: "School", he: "בית ספר" } },
  { key: "sports", label: { en: "Sports", he: "ספורט" } },
  { key: "social", label: { en: "Social", he: "חברתי" } },
];

export const tasks: Task[] = [
  {
    id: "t1",
    category: "school",
    categoryLabel: { en: "School", he: "בית ספר" },
    title: { en: "Pay ₪50 for the Zoo trip", he: "לשלם 50 ש״ח לטיול לגן החיות" },
    due: { en: "Due Thursday 17:00", he: "עד יום חמישי 17:00" },
    urgent: true,
    source: { en: "From: Grade 4B", he: "מתוך: כיתה ד2" },
  },
  {
    id: "t2",
    category: "sports",
    categoryLabel: { en: "Soccer U10", he: "כדורגל עד גיל 10" },
    title: { en: "Bring white jersey for Friday match", he: "להביא חולצה לבנה למשחק ביום שישי" },
    due: { en: "Due Friday 08:00", he: "עד יום שישי 08:00" },
    urgent: true,
    source: { en: "From: Hapoel U10 Parents", he: "מתוך: הורים הפועל עד 10" },
  },
  {
    id: "t3",
    category: "school",
    categoryLabel: { en: "School", he: "בית ספר" },
    title: { en: "Sign the swimming permission form", he: "לחתום על אישור שחייה" },
    due: { en: "Due Sunday 12:00", he: "עד יום ראשון 12:00" },
    urgent: false,
    source: { en: "From: Grade 4B", he: "מתוך: כיתה ד2" },
  },
  {
    id: "t4",
    category: "social",
    categoryLabel: { en: "Social", he: "חברתי" },
    title: { en: "RSVP to Noa's birthday party", he: "לאשר הגעה ליום ההולדת של נועה" },
    due: { en: "Due Monday 20:00", he: "עד יום שני 20:00" },
    urgent: false,
    source: { en: "From: Class Moms 4B", he: "מתוך: אמהות כיתה ד2" },
  },
  {
    id: "t5",
    category: "school",
    categoryLabel: { en: "Parent Committee", he: "ועד הורים" },
    title: { en: "Send ₪30 for the teacher gift", he: "להעביר 30 ש״ח למתנה למורה" },
    due: { en: "Due Wednesday 21:00", he: "עד יום רביעי 21:00" },
    urgent: true,
    source: { en: "From: Committee 4B", he: "מתוך: ועד כיתה ד2" },
  },
];


export type Group = {
  id: string;
  name: { en: string; he: string };
  members: number;
  hue: string;
};

export const groups: Group[] = [
  { id: "g1", name: { en: "Grade 4B — Parents", he: "כיתה ד2 — הורים" }, members: 34, hue: "bg-school/15 text-school" },
  { id: "g2", name: { en: "Hapoel U10 Team", he: "קבוצת הפועל עד 10" }, members: 21, hue: "bg-sports/15 text-sports" },
  { id: "g3", name: { en: "Class Moms 4B", he: "אמהות כיתה ד2" }, members: 28, hue: "bg-social/15 text-social" },
  { id: "g4", name: { en: "Art Club / חוג אמנות", he: "חוג אמנות" }, members: 15, hue: "bg-social/15 text-social" },
  { id: "g5", name: { en: "Parent Committee / וועד", he: "וועד הורים" }, members: 12, hue: "bg-school/15 text-school" },
  { id: "g6", name: { en: "Coach Amit — Updates", he: "המאמן עמית — עדכונים" }, members: 24, hue: "bg-sports/15 text-sports" },
  { id: "g7", name: { en: "School Admin / בית ספר", he: "הנהלת בית ספר" }, members: 210, hue: "bg-school/15 text-school" },
  { id: "g8", name: { en: "Family Chat", he: "צ׳אט משפחתי" }, members: 9, hue: "bg-muted text-muted-foreground" },
  { id: "g9", name: { en: "Neighborhood Ramat Aviv", he: "שכונת רמת אביב" }, members: 187, hue: "bg-muted text-muted-foreground" },
  { id: "g10", name: { en: "Building Residents", he: "דיירי הבניין" }, members: 18, hue: "bg-muted text-muted-foreground" },
];

export const recommendKeywords = [
  "grade",
  "school",
  "class",
  "coach",
  "team",
  "כיתה",
  "בית ספר",
  "חוג",
  "וועד",
  "ועד",
  "מאמן",
];

export function isRecommended(group: Group) {
  const haystack = `${group.name.en} ${group.name.he}`.toLowerCase();
  return recommendKeywords.some((k) => haystack.includes(k.toLowerCase()));
}
