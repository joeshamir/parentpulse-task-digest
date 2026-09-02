import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useLang } from "@/lib/lang";
import { CONTROLLER } from "@/lib/consent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ParentPulse" },
      {
        name: "description",
        content:
          "What ParentPulse collects, why, how long it is kept, who it is shared with, and how to access, correct or delete your data.",
      },
      { property: "og:title", content: "Privacy Policy — ParentPulse" },
      {
        property: "og:description",
        content:
          "What ParentPulse collects, how long it is kept, and how to exercise your privacy rights.",
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

type Bi = { en: string; he: string };
type Section = { title: Bi; body: Bi; bullets?: Bi[] };

const sections: Section[] = [
  {
    title: { en: "Who is responsible for your data", he: "מי אחראי על המידע שלכם" },
    body: {
      en: `The controller of the information in ParentPulse is ${CONTROLLER.name.en}, Israel. For any privacy question or request, write to ${CONTROLLER.email}. We answer requests within 30 days.`,
      he: `בעל השליטה במידע ב-ParentPulse הוא ${CONTROLLER.name.he}, ישראל. לכל שאלה או בקשה בנושא פרטיות ניתן לפנות ל-${CONTROLLER.email}. אנו משיבים לבקשות בתוך 30 יום.`,
    },
  },
  {
    title: { en: "What we store", he: "איזה מידע נשמר" },
    body: {
      en: "Only what the app needs in order to work:",
      he: "רק מה שנדרש כדי שהאפליקציה תפעל:",
    },
    bullets: [
      {
        en: "Your account: email address and sign-in identity (email/password or Google).",
        he: "החשבון שלכם: כתובת אימייל וזהות הכניסה (אימייל/סיסמה או Google).",
      },
      {
        en: "The groups you selected: group name and WhatsApp group address.",
        he: "הקבוצות שבחרתם: שם הקבוצה וכתובת הקבוצה בוואטסאפ.",
      },
      {
        en: "Extracted items: a short task title, category, optional due date, the group it came from, and whether you completed it.",
        he: "פריטים שחולצו: כותרת משימה קצרה, קטגוריה, תאריך יעד אופציונלי, שם הקבוצה שממנה הגיעה, והאם סומנה כבוצעה.",
      },
      {
        en: "Preferences: language, notification settings, retention setting, and your consent record.",
        he: "העדפות: שפה, הגדרות התראות, הגדרת שמירת מידע, ורישום ההסכמה שלכם.",
      },
      {
        en: "Technical: pairing status of your WhatsApp link and, if you enable notifications, a push subscription for your browser.",
        he: "טכני: סטטוס הצימוד לוואטסאפ, ואם הפעלתם התראות — מנוי התראות עבור הדפדפן שלכם.",
      },
    ],
  },
  {
    title: { en: "What we never store", he: "מה לעולם לא נשמר" },
    body: {
      en: "Message content, images, documents, voice recordings and their transcripts, contact lists, and phone numbers of group members. Messages are processed in memory only, and are discarded immediately after a task is or is not extracted.",
      he: "תוכן הודעות, תמונות, מסמכים, הקלטות קוליות והתמלולים שלהן, רשימות אנשי קשר ומספרי טלפון של חברי הקבוצה. ההודעות מעובדות בזיכרון בלבד ונמחקות מיד לאחר שחולצה מהן משימה — או שלא.",
    },
  },
  {
    title: { en: "Why we process it, and on what basis", he: "מטרת העיבוד והבסיס החוקי" },
    body: {
      en: "The only purpose is to give you a personal list of tasks from the groups you chose. The legal basis is your explicit consent, given at sign-up, together with performance of the service you asked for. You are not legally required to provide any of this information — providing it is voluntary, and without it the service cannot operate. You may withdraw consent at any time in Settings.",
      he: "המטרה היחידה היא להציג לכם רשימת משימות אישית מהקבוצות שבחרתם. הבסיס החוקי הוא הסכמתכם המפורשת בעת ההרשמה, לצד אספקת השירות שביקשתם. אינכם חייבים על פי חוק למסור את המידע — המסירה היא מרצון, ובלעדיה השירות אינו יכול לפעול. ניתן לבטל את ההסכמה בכל עת דרך ההגדרות.",
    },
  },
  {
    title: { en: "Who else is involved", he: "מי עוד מעורב" },
    body: {
      en: "We use service providers strictly to run the app, under their own security obligations:",
      he: "אנו נעזרים בספקי שירות אך ורק לצורך הפעלת האפליקציה, תחת מחויבויות אבטחה שלהם:",
    },
    bullets: [
      {
        en: "Cloud hosting, database and authentication for your account and tasks.",
        he: "אחסון ענן, בסיס נתונים ואימות משתמשים עבור החשבון והמשימות.",
      },
      {
        en: "A speech-to-text provider used momentarily to read voice notes; audio is not retained by us.",
        he: "ספק תמלול דיבור שמשמש לרגע קצר לקריאת הודעות קוליות; אנחנו לא שומרים את האודיו.",
      },
      {
        en: "An AI model provider that classifies whether a message contains a task.",
        he: "ספק מודל בינה מלאכותית שמסווג האם הודעה מכילה משימה.",
      },
      {
        en: "A push notification service, only if you turn notifications on.",
        he: "שירות התראות, רק אם הפעלתם התראות.",
      },
    ],
  },
  {
    title: { en: "Transfer outside Israel", he: "העברת מידע מחוץ לישראל" },
    body: {
      en: "These providers operate servers outside Israel, including in the European Union and the United States, so your data may be processed abroad under providers that apply recognised data-protection safeguards. By using the service you consent to this transfer.",
      he: "ספקים אלה מפעילים שרתים מחוץ לישראל, בין היתר באיחוד האירופי ובארצות הברית, ולכן ייתכן שהמידע יעובד בחו״ל אצל ספקים המיישמים אמצעי הגנה מוכרים על מידע. השימוש בשירות מהווה הסכמה להעברה זו.",
    },
  },
  {
    title: { en: "How long we keep it", he: "משך שמירת המידע" },
    body: {
      en: "Data is deleted automatically:",
      he: "המידע נמחק אוטומטית:",
    },
    bullets: [
      {
        en: "Completed tasks: 30 days after completion (you can shorten this to 7 days in Settings).",
        he: "משימות שהושלמו: 30 יום לאחר ההשלמה (ניתן לקצר ל-7 ימים בהגדרות).",
      },
      { en: "All tasks: 12 months after creation.", he: "כל המשימות: 12 חודשים לאחר היצירה." },
      { en: "Daily summaries: 90 days.", he: "תקצירים יומיים: 90 יום." },
      {
        en: "Disconnected pairing sessions: 30 days.",
        he: "חיבורי צימוד לא פעילים: 30 יום.",
      },
      {
        en: "Account data: deleted immediately when you delete your account.",
        he: "נתוני החשבון: נמחקים מיד עם מחיקת החשבון.",
      },
    ],
  },
  {
    title: { en: "Your rights", he: "הזכויות שלכם" },
    body: {
      en: "Under the Israeli Privacy Protection Law and the GDPR you may: review the information held about you, correct it, delete it, object to processing, withdraw consent, and receive a copy in a portable format. Settings gives you one-tap access to a full data export, consent withdrawal and complete deletion; you can also email us. If you believe your rights were breached, you may complain to the Israeli Privacy Protection Authority (PPA).",
      he: "לפי חוק הגנת הפרטיות בישראל ולפי ה-GDPR אתם רשאים: לעיין במידע שנשמר עליכם, לתקן אותו, למחוק אותו, להתנגד לעיבוד, לבטל הסכמה, ולקבל עותק בפורמט נייד. במסך ההגדרות יש גישה בלחיצה אחת לייצוא מלא של המידע, לביטול ההסכמה ולמחיקה מלאה; אפשר גם לפנות אלינו במייל. אם אתם סבורים שזכויותיכם נפגעו, ניתן להגיש תלונה לרשות להגנת הפרטיות.",
    },
  },
  {
    title: { en: "If you are in a group with a ParentPulse user", he: "אם אתם בקבוצה עם משתמש ParentPulse" },
    body: {
      en: "A member of your group may use ParentPulse to organise their own tasks. In that case the app extracts a short action item — for example \"bring a costume on Thursday\" — with the group name. Your message text, name, phone number and any media you send are not stored and are not visible to anyone. If you would rather that group not be processed at all, ask the member who uses ParentPulse to disconnect it, or contact us at the address above.",
      he: "ייתכן שחבר בקבוצה שלכם משתמש ב-ParentPulse כדי לארגן את המשימות שלו. במקרה כזה האפליקציה מחלצת פריט משימה קצר — למשל ״להביא תחפושת ביום חמישי״ — יחד עם שם הקבוצה. תוכן ההודעה שלכם, השם, מספר הטלפון וכל מדיה שתשלחו אינם נשמרים ואינם גלויים לאיש. אם אתם מעדיפים שהקבוצה לא תעובד כלל, בקשו מהחבר שמשתמש ב-ParentPulse לנתק אותה, או פנו אלינו לכתובת שלמעלה.",
    },
  },
  {
    title: { en: "Security", he: "אבטחה" },
    body: {
      en: "All traffic is encrypted in transit. Data is isolated per account by database-level access rules, so no user can read another user's rows, and only the signed-in account can write into it. Access to production systems is limited to the controller.",
      he: "כל התעבורה מוצפנת. המידע מבודד לכל חשבון באמצעות כללי גישה ברמת בסיס הנתונים, כך שאף משתמש אינו יכול לקרוא נתונים של אחר, ורק החשבון המחובר יכול לכתוב אליהם. הגישה למערכות הייצור מוגבלת לבעל השליטה במידע.",
    },
  },
  {
    title: { en: "Children", he: "קטינים" },
    body: {
      en: "The service is intended for parents aged 18 and over. We do not knowingly create accounts for children, and we do not build profiles of children from group messages.",
      he: "השירות מיועד להורים מגיל 18 ומעלה. איננו יוצרים ביודעין חשבונות לילדים, ואיננו בונים פרופילים של ילדים מתוך הודעות בקבוצות.",
    },
  },
  {
    title: { en: "Changes", he: "שינויים" },
    body: {
      en: "If this policy changes materially, you will be asked to review and accept it again the next time you open the app.",
      he: "אם המדיניות תשתנה באופן מהותי, תתבקשו לעיין בה ולאשר אותה מחדש בכניסה הבאה לאפליקציה.",
    },
  },
];

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
          {t({ en: "Back to Settings", he: "חזרה להגדרות" })}
        </Link>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight">
          {t({ en: "Privacy Policy", he: "מדיניות פרטיות" })}
        </h1>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          {t({ en: "Last updated: 2 September 2026", he: "עודכן לאחרונה: 2 בספטמבר 2026" })}
        </p>
      </header>

      <section className="mt-5 px-5">
        <div className="rounded-xl border border-primary/25 bg-primary/8 p-4">
          <p className="text-[13px] font-semibold leading-relaxed text-foreground">
            {t({
              en: "In short: we never keep your chats. Only short task titles from the groups you chose, deleted automatically over time, and erasable by you in one tap.",
              he: "בקצרה: אנחנו לא שומרים את הצ׳אטים. רק כותרות משימה קצרות מהקבוצות שבחרתם, שנמחקות אוטומטית עם הזמן וניתנות למחיקה מלאה בלחיצה אחת.",
            })}
          </p>
        </div>

        <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {sections.map((section, i) => (
            <article key={i} className="p-4">
              <h2 className="text-[14px] font-semibold tracking-tight text-card-foreground">
                {t(section.title)}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {t(section.body)}
              </p>
              {section.bullets && (
                <ul className="mt-2 space-y-1.5 ps-4">
                  {section.bullets.map((bullet, j) => (
                    <li
                      key={j}
                      className="list-disc text-[13px] leading-relaxed text-muted-foreground marker:text-primary"
                    >
                      {t(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>

        <Link
          to="/terms"
          className="mt-3 flex items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-semibold text-card-foreground transition-colors hover:bg-muted/50"
        >
          {t({ en: "Read the Terms of Use", he: "קריאת תנאי השימוש" })}
        </Link>
      </section>

      <div className="h-10" />
    </MobileShell>
  );
}
