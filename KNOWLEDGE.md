# ParentPulse — Product Knowledge Document

> **App:** ParentPulse (Progressive Web App)  
> **Status:** Vision & architecture reference for build sessions  
> **Last updated:** 2026-08-09

---

## 1. Mission & Product Definition

ParentPulse turns the chaotic flow of Israeli school, class, and activity WhatsApp groups into a calm, actionable dashboard for busy parents.

Instead of scrolling through hundreds of unread messages, parents open ParentPulse and immediately see:

- **Tasks** — things they need to do, pay, sign, send, or remember.
- **FYI / Summaries** — important updates they should know about, but do not need to act on.

The product is deliberately not a chat app. It is a **decision-support layer** that sits on top of group messaging noise.

---

## 2. Primary Market

- **Country:** Israel
- **Language:** Bilingual Hebrew / English UI
- **Layout:** Native Right-to-Left (RTL) readiness for Hebrew mode
- **Form factor:** Mobile-first; parents check this on the go

### Cultural / market notes
- WhatsApp is the dominant group-communication channel for schools, kindergartens, after-school activities, and parent committees.
- Voice notes are extremely common in Hebrew-speaking groups; transcription must handle Hebrew accurately.
- Parents often juggle multiple groups per child (class, grade, school, sports, arts, parent committee).

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend framework | React 19 |
| Routing / SSR framework | TanStack Start |
| Styling | Tailwind CSS v4 |
| Icons | Lucide Icons |
| Backend / database / auth | Lovable Cloud (Supabase) |
| PWA shell | Web app manifest + service worker (manifest-only unless offline mode is explicitly requested) |
| External parser | Node.js background worker using Baileys + Groq Whisper v3 Turbo |

---

## 4. Core Aesthetic

- **Calm, structured, modern, zero clutter.**
- Soft rounded cards with subtle borders.
- High-contrast typography for fast mobile scanning.
- Generous whitespace and clear visual hierarchy.
- No generic “AI aesthetic” gradients unless explicitly requested.
- Design tokens live in `src/styles.css`; avoid hardcoded color utilities in components.

### Mobile-first principles
- Thumb-reachable primary actions.
- Large tap targets.
- Clear status indicators (e.g., done / pending / due soon).
- Pull-to-refresh friendly feeds.

---

## 5. In-Scope Features

### 5.1 Action Items Feed (Tasks)
- Extracted to-dos from group messages.
- Metadata: title, due date, category, source group, priority, completion status.
- One-tap mark-as-done.
- Optional reminders / due-date sorting.

### 5.2 Categorized Digest Feed (FYI / Summaries)
- Non-actionable updates distilled into short cards.
- Categories: announcements, schedule changes, general FYI.
- Expandable for more detail when needed.

### 5.3 Low-Friction Group Selection Screen
- List of connected WhatsApp groups.
- Toggle groups on/off for parsing.
- Clear labels so parents know which group each task came from.

### 5.4 QR Code Pairing Status
- Visual indicator of whether the WhatsApp bridge / pairing is active.
- Re-pair flow if the connection drops.
- Security note: pairing is handled by the external Node.js worker, not inside the PWA.

### 5.5 PWA Manifest Settings
- `manifest.webmanifest` with app name, short name, theme colors, display mode.
- Home-screen installability on iOS and Android.
- Manifest-only installability by default; offline support only if explicitly requested.

---

## 6. Out-of-Scope & Privacy Policy

### Explicitly out of scope
- **Raw chat message storage.** ParentPulse does not retain chat logs.
- **Direct 1-on-1 messaging.** The app is read-only summary/dashboard layer.
- **Native App Store / Play Store binaries.** PWA-only distribution unless the user asks otherwise.

### Privacy-first data model
- The external parser processes messages **in memory** and writes only structured JSON (tasks, summaries, metadata) to Lovable Cloud.
- Original message text, media, and voice note audio are not persisted by the PWA backend.
- This is a core product promise and should be reflected in onboarding copy and any future privacy policy.

---

## 7. Architectural Context

```text
┌─────────────────────────────────────────────────────────────┐
│  WhatsApp Groups (school / class / activities)              │
└──────────────────────┬────────────────────────────────────────┘
                       │ messages + voice notes
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  External Node.js Worker                                    │
│  • Baileys — WhatsApp Web connection / message stream       │
│  • Groq Whisper v3 Turbo — Hebrew voice-note transcription  │
│  • In-memory parsing — extracts tasks & summaries           │
└──────────────────────┬────────────────────────────────────────┘
                       │ structured JSON only
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Lovable Cloud (Supabase)                                   │
│  • Auth (email / magic link / social as needed)             │
│  • Structured task & summary rows                             │
│  • User / group / pairing metadata                          │
└──────────────────────┬────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  ParentPulse PWA (React + Tailwind + Lucide)                │
│  • Mobile-first RTL dashboard                                │
│  • Tasks feed + digest feed + group selection                │
│  • QR pairing status + PWA installability                    │
└─────────────────────────────────────────────────────────────┘
```

### Worker responsibilities
- Maintain the WhatsApp Web connection via Baileys.
- Transcribe Hebrew voice notes with Groq Whisper v3 Turbo.
- Classify and extract structured data.
- Push only the extracted JSON to Lovable Cloud.
- Never store raw chat history.

### PWA responsibilities
- Authenticate users.
- Read and display structured tasks and summaries.
- Manage group selection and pairing status UI.
- Provide a fast, calm, mobile-first experience.

---

## 8. Implementation Notes

### RTL / i18n readiness
- Use logical CSS properties (`ms-` / `me-`, `ps-` / `pe-`, `start` / `end`) where possible.
- Set `dir="rtl"` on the root element when Hebrew is active.
- Keep all user-facing strings in a single i18n dictionary so Hebrew translations can be added without touching components.

### Privacy-first defaults
- Design the database schema around structured items, not messages.
- If a future feature needs to reference a message, store only a non-reversible identifier or hash — never the message body.

### PWA scope
- Start with manifest-only installability.
- Add offline support only if explicitly requested, using the platform’s guided PWA path.

---

## 9. Key Terms

| Term | Meaning |
|------|---------|
| **Task** | An actionable item extracted from a group message (pay, sign, send, RSVP, etc.). |
| **Digest / FYI** | A non-actionable summary or announcement. |
| **Group** | A WhatsApp group the parent belongs to (class, school, activity). |
| **Pairing** | The authenticated connection between the external worker and a user’s WhatsApp account. |
| **Worker** | The external Node.js service that parses messages and writes structured data. |

---

## 10. Open Questions for Future Prompts

- Preferred authentication method for parents (magic link, email/password, Google, Apple)?
- Should the app support dark mode by default?
- Should tasks support push reminders, or only in-app due-date sorting?
- Do we need a web-based onboarding flow, or is pairing fully handled by the worker?
