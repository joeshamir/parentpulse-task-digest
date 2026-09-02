import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useLang } from "@/lib/lang";
import { CONTROLLER } from "@/lib/consent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — ParentPulse" },
      {
        name: "description",
        content:
          "The rules for using ParentPulse: who may connect groups, what the service does, and the limits of the service.",
      },
      { property: "og:title", content: "Terms of Use — ParentPulse" },
      {
        property: "og:description",
        content: "The rules for using ParentPulse and the limits of the service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://parentpulse-task-digest.lovable.app/terms" },
    ],
  }),
  component: TermsScreen,
});

const sections = [
  {
    title: { en: "1. The service", he: "1. השירות" },
    body: {
      en: "ParentPulse reads messages from the WhatsApp groups you explicitly select and turns them into action items and short summaries. It is a personal assistance tool. It does not send messages on your behalf and is not affiliated with WhatsApp or Meta.",
      he: "ParentPulse קוראת הודעות מקבוצות הוואטסאפ שבחרתם במפורש והופכת אותן למשימות ולתקצירים קצרים. זהו כלי עזר אישי. הוא אינו שולח הודעות בשמכם ואינו קשור לוואטסאפ או ל-Meta.",
    },
  },
  {
    title: { en: "2. Your responsibility for groups", he: "2. האחריות שלכם על הקבוצות" },
    body: {
      en: "You may only connect groups you are genuinely a member of. You are responsible for informing the members of those groups that an assistant extracts action items from their messages, and for respecting any member who objects by disconnecting that group.",
      he: "מותר לחבר רק קבוצות שאתם באמת חברים בהן. באחריותכם ליידע את חברי הקבוצות שעוזר אישי מחלץ משימות מההודעות, ולכבד התנגדות של חבר קבוצה על ידי ניתוק אותה קבוצה.",
    },
  },
  {
    title: { en: "3. Acceptable use", he: "3. שימוש מותר" },
    body: {
      en: "Do not use ParentPulse to monitor people, to collect information about others for any purpose beyond your own household organisation, to break the law, or to attempt to access another user's account or the service's infrastructure.",
      he: "אין להשתמש ב-ParentPulse למעקב אחר אנשים, לאיסוף מידע על אחרים מעבר לארגון משק הבית שלכם, לפעילות בלתי חוקית, או לניסיון גישה לחשבון של משתמש אחר או לתשתית השירות.",
    },
  },
  {
    title: { en: "4. Accounts", he: "4. חשבונות" },
    body: {
      en: "You are responsible for keeping your sign-in details secure. The service is intended for adults (18+). You may delete your account and all of its data at any time from Settings.",
      he: "אתם אחראים לשמור על פרטי הכניסה שלכם. השירות מיועד לבגירים (18+). ניתן למחוק את החשבון ואת כל המידע שבו בכל עת דרך ההגדרות.",
    },
  },
  {
    title: { en: "5. Availability and accuracy", he: "5. זמינות ודיוק" },
    body: {
      en: "The service is provided as is, without warranty. Task extraction is automated and may miss items or misread them — always verify anything important against the original group. We may suspend or end an account that breaches these terms.",
      he: "השירות ניתן כמות שהוא, ללא אחריות. חילוץ המשימות אוטומטי ועלול לפספס או לפרש לא נכון — תמיד כדאי לוודא דברים חשובים מול הקבוצה המקורית. אנו רשאים להשעות או לסגור חשבון שמפר את התנאים.",
    },
  },
  {
    title: { en: "6. Governing law", he: "6. הדין החל" },
    body: {
      en: "These terms are governed by the laws of the State of Israel, and the competent courts in Israel have exclusive jurisdiction.",
      he: "על תנאים אלה חלים דיני מדינת ישראל, ולבתי המשפט המוסמכים בישראל סמכות שיפוט ייחודית.",
    },
  },
];

function TermsScreen() {
  const { t, dir } = useLang();

  return (
    <MobileShell>
      <header className="px-5 pt-5">
        <Link
          to="/settings"
          className={cn(
            "inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground",
            dir === "rtl" && "flex-row-reverse",
          )}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          {t({ en: "Back to Settings", he: "חזרה להגדרות" })}
        </Link>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight">
          {t({ en: "Terms of Use", he: "תנאי שימוש" })}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          {t({ en: "Last updated: 2 September 2026", he: "עודכן לאחרונה: 2 בספטמבר 2026" })}
        </p>
      </header>

      <section className="mt-5 px-5">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {sections.map((section, i) => (
            <article key={i} className="p-4">
              <h2 className="text-[14px] font-semibold tracking-tight text-card-foreground">
                {t(section.title)}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {t(section.body)}
              </p>
            </article>
          ))}
          <article className="p-4">
            <h2 className="text-[14px] font-semibold tracking-tight text-card-foreground">
              {t({ en: "7. Contact", he: "7. יצירת קשר" })}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {t(CONTROLLER.name)}, {t(CONTROLLER.country)} ·{" "}
              <a href={`mailto:${CONTROLLER.email}`} className="font-semibold text-primary underline">
                {CONTROLLER.email}
              </a>
            </p>
          </article>
        </div>

        <Link
          to="/privacy"
          className="mt-3 flex items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-semibold text-card-foreground transition-colors hover:bg-muted/50"
        >
          {t({ en: "Read the Privacy Policy", he: "קריאת מדיניות הפרטיות" })}
        </Link>
      </section>

      <div className="h-10" />
    </MobileShell>
  );
}
