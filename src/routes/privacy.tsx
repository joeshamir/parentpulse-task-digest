import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Database,
  Fingerprint,
  Lock,
  MessageSquareOff,
  ShieldCheck,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useLang } from "@/lib/lang";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Security — ParentPulse" },
      {
        name: "description",
        content:
          "What ParentPulse stores, how it uses WhatsApp data, and how your account stays secure.",
      },
      { property: "og:title", content: "Privacy & Security — ParentPulse" },
      {
        property: "og:description",
        content:
          "What ParentPulse stores, how it uses WhatsApp data, and how your account stays secure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:url",
        content: "https://parentpulse-task-digest.lovable.app/privacy",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://parentpulse-task-digest.lovable.app/privacy",
      },
    ],
  }),
  component: PrivacyScreen,
});

const copy = {
  title: {
    en: "Privacy & Security",
    he: "פרטיות ואבטחה",
  },
  subtitle: {
    en: "What ParentPulse does and doesn't do with your data.",
    he: "מה ParentPulse כן ולא עושה עם המידע שלכם.",
  },
  back: {
    en: "Back to Settings",
    he: "חזרה להגדרות",
  },
  sections: [
    {
      icon: MessageSquareOff,
      hue: "bg-success/15 text-success",
      title: {
        en: "We don't keep your chats",
        he: "אנחנו לא שומרים את הצ׳אטים",
      },
      body: {
        en:
          "ParentPulse turns WhatsApp messages into tasks or summaries and removes the original message. Your chat history is never stored.",
        he:
          "ParentPulse הופכת הודעות וואטסאפ למשימות או תקצירים ומוחקת את ההודעה המקורית. היסטוריית הצ׳אטים שלכם אף פעם לא נשמרת.",
      },
    },
    {
      icon: Database,
      hue: "bg-primary/15 text-primary",
      title: {
        en: "We store only what you need",
        he: "אנחנו שומרים רק מה שנדרש",
      },
      body: {
        en:
          "Your account keeps your selected groups, your extracted tasks, short daily summaries, and basic sign-in details so the app can work.",
        he:
          "החשבון שלכם שומר את הקבוצות שנבחרו, את המשימות שחולצו, תקצירים יומיים קצרים, ופרטי כניסה בסיסיים כדי שהאפליקציה תוכל לפעול.",
      },
    },
    {
      icon: Fingerprint,
      hue: "bg-info/15 text-info",
      title: {
        en: "Sign-in is managed securely",
        he: "הכניסה מתבצעת בצורה מאובטחת",
      },
      body: {
        en:
          "Google sign-in is handled by a managed auth service. ParentPulse does not store your Google password or raw tokens.",
        he:
          "הכניסה דרך Google מתבצעת דרך שירות אימות מנוהל. ParentPulse לא שומרת את הסיסמה של Google או את האסימונים הגולמיים.",
      },
    },
    {
      icon: Lock,
      hue: "bg-accent/30 text-foreground",
      title: {
        en: "Your data is protected",
        he: "המידע שלכם מוגן",
      },
      body: {
        en:
          "Data is sent between WhatsApp and ParentPulse over encrypted connections. No one else can post information into your account.",
        he:
          "המידע נשלח בין וואטסאפ ל-ParentPulse דרך חיבורים מוצפנים. אף אחד אחר לא יכול להזין מידע לחשבון שלכם.",
      },
    },
  ],
};

function PrivacyScreen() {
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
          {t(copy.back)}
        </Link>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight">
          {t(copy.title)}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          {t(copy.subtitle)}
        </p>
      </header>

      <section className="mt-5 px-5">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {copy.sections.map((section, i) => (
            <article key={i} className="p-4">
              <div className="flex items-start gap-3">
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border", section.hue)}>
                  <section.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-semibold tracking-tight text-card-foreground">
                    {t(section.title)}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {t(section.body)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-4 px-5 pb-8">
        <div className="flex items-center gap-3 rounded-xl border border-border p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-[13px] font-medium text-muted-foreground">
            {t({
              en: "Questions? Contact us through the app feedback channel.",
              he: "שאלות? צרו קשר דרך ערוץ המשוב של האפליקציה.",
            })}
          </p>
        </div>
      </section>
    </MobileShell>
  );
}
