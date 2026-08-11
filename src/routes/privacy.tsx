import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Database,
  Fingerprint,
  Lock,
  MessageSquareOff,
  Server,
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
          "How ParentPulse handles your WhatsApp data, Google sign-in, and what we store.",
      },
      { property: "og:title", content: "Privacy & Security — ParentPulse" },
      {
        property: "og:description",
        content:
          "How ParentPulse handles your WhatsApp data, Google sign-in, and what we store.",
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
    en: "How ParentPulse handles your data, in plain language.",
    he: "איך ParentPulse מטפלת במידע שלכם, בשפה פשוטה.",
  },
  back: {
    en: "Back to Groups",
    he: "חזרה לקבוצות",
  },
  sections: [
    {
      icon: MessageSquareOff,
      hue: "bg-success/15 text-success",
      title: {
        en: "No chat logs are kept",
        he: "אנחנו לא שומרים היסטוריית צ׳אט",
      },
      body: {
        en:
          "ParentPulse reads incoming WhatsApp messages in memory, extracts tasks or summaries, and discards the original text. We do not store raw chat history in our database.",
        he:
          "ParentPulse קוראת הודעות וואטסאפ בתוך הזיכרון, מפיקה משימות או תקצירים, ומוחקת את הטקסט המקורי. אנחנו לא שומרים היסטוריית צ׳אט גולמית במסד הנתונים.",
      },
    },
    {
      icon: Server,
      hue: "bg-primary/15 text-primary",
      title: {
        en: "WhatsApp runs through a separate worker",
        he: "החיבור לוואטסאפ עובר דרך worker נפרד",
      },
      body: {
        en:
          "The app itself does not log into WhatsApp. A background worker on Railway keeps the connection alive using Baileys. That worker only sends structured results to ParentPulse.",
        he:
          "האפליקציה עצמה לא מתחברת לוואטסאפ. worker ברקע ב-Railway שומר על החיבור באמצעות Baileys. ה-worker שולח רק תוצאות מובנות ל-ParentPulse.",
      },
    },
    {
      icon: Database,
      hue: "bg-warning/15 text-warning",
      title: {
        en: "What we do store",
        he: "מה כן נשמר",
      },
      body: {
        en:
          "We keep only: your selected WhatsApp groups, connection state, extracted tasks (title, category, due date, completion status), short daily summaries, and basic Google account info from sign-in.",
        he:
          "אנחנו שומרים רק את: קבוצות וואטסאפ שנבחרו, מצב החיבור, משימות שחולצו (כותרת, קטגוריה, תאריך יעד, סטטוס השלמה), תקצירים יומיים קצרים, ופרטי חשבון Google בסיסיים מהכניסה.",
      },
    },
    {
      icon: Fingerprint,
      hue: "bg-info/15 text-info",
      title: {
        en: "Google sign-in is managed",
        he: "הכניסה דרך Google מנוהלת",
      },
      body: {
        en:
          "Google authentication is handled by Lovable Cloud managed auth. Your Google tokens are managed by the auth service; the app never stores raw tokens in its own database.",
        he:
          "האימות דרך Google מתבצע על ידי שירות האימות המנוהל של Lovable Cloud. האסימונים של Google מנוהלים על ידי שירות האימות; האפליקציה אף פעם לא שומרת אותם גולמיים במסד הנתונים שלה.",
      },
    },
    {
      icon: Lock,
      hue: "bg-accent/30 text-foreground",
      title: {
        en: "Worker requests are verified",
        he: "בקשות מה-worker מאומתות",
      },
      body: {
        en:
          "The worker sends data to the app using a signed token. This means random internet traffic cannot post fake tasks into your account.",
        he:
          "ה-worker שולח נתונים לאפליקציה באמצעות אסימון חתום. המשמעות היא שתעבורת אינטרנט אקראית לא יכולה לפרסם משימות מזויפות בחשבון שלכם.",
      },
    },
  ],
};

function PrivacyScreen() {
  const { t, dir } = useLang();

  return (
    <MobileShell>
      <header className="px-5 pt-1">
        <Link
          to="/groups"
          className={cn(
            "inline-flex items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground",
            dir === "rtl" && "flex-row-reverse",
          )}
        >
          <ArrowRight className="h-4 w-4" />
          {t(copy.back)}
        </Link>
        <h1 className="mt-3 font-display text-[30px] font-extrabold leading-tight tracking-tight">
          {t(copy.title)}
        </h1>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          {t(copy.subtitle)}
        </p>
      </header>

      <section className="mt-5 space-y-3 px-5">
        {copy.sections.map((section, i) => (
          <article
            key={i}
            className="card-soft rounded-3xl p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                  section.hue,
                )}
              >
                <section.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold text-card-foreground">
                  {t(section.title)}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(section.body)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 px-5 pb-8">
        <div className="flex items-center gap-3 rounded-3xl bg-primary/5 p-4 ring-1 ring-primary/15">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-sm font-semibold text-primary">
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
