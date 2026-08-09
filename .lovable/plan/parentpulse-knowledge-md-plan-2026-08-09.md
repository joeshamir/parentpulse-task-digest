# ParentPulse KNOWLEDGE.md Plan

## Goal
Create a `KNOWLEDGE.md` file at the project root that captures the product vision, constraints, and technical context for the ParentPulse PWA.

## Deliverable
A single markdown file (`/dev-server/KNOWLEDGE.md`) with the following sections derived from the provided specifications:

- **Mission & Product Definition**: What ParentPulse does — extracting actionable tasks and summaries from school/class/activity WhatsApp groups into a mobile-first dashboard.
- **Target Market**: Israel, with bilingual Hebrew/English UI support and native RTL layout readiness.
- **Tech Stack**: React, Tailwind CSS, Lucide Icons, Lovable Cloud (Supabase backend).
- **Core Aesthetic**: Calm, structured, modern, zero-clutter; soft rounded cards, subtle borders, high-contrast mobile scanning.
- **In-Scope Features**: Action items feed (Tasks), categorized digest feed (FYI/Summaries), low-friction group selection screen, QR code pairing status, PWA manifest settings.
- **Out-of-Scope & Privacy Policy**: Zero raw chat log retention, no direct 1-on-1 messaging, no native store binaries.
- **Architectural Context**: External Node.js background worker using Baileys and Groq Whisper v3 Turbo for Hebrew voice notes; parses messages in-memory and writes structured task JSON directly to Lovable Cloud.
- **Implementation Notes**: RTL/i18n readiness, mobile-first defaults, privacy-first data model (structured tasks only, no chat history).

## Out of Scope for This Plan
No code changes, UI builds, database schema, or PWA implementation. This turn produces only the knowledge document.

## Success Criteria
- `KNOWLEDGE.md` exists at the project root.
- Content accurately reflects every specification in the request.
- File uses clear markdown structure suitable for ongoing reference.
