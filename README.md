# ParentPulse: Your Family's Command Center

"I am building a Progressive Web App (PWA) called 'ParentPulse'. Its mission is to help busy parents in Israel manage the chaotic flow of school, class, and activity WhatsApp groups by extracting actionable tasks and concise summaries into a clean, mobile-first dashboard.

Please generate a 'KNOWLEDGE.md' file for this project with the following specifications: - App Name: ParentPulse (PWA) - Primary Market: Israel (Bilingual Hebrew/English UI support with native Right-to-Left RTL visual layout readiness). - Tech Stack: React, Tailwind CSS, Lucide Icons, Lovable Cloud (Supabase). - Core Aesthetic: Calm, structured, modern, zero clutter. Soft rounded cards, subtle borders, high contrast for fast mobile scanning. - In-Scope Features: Action items feed (Tasks), Categorized Digest feed (FYI/Summaries), Low-friction Group Selection screen, QR code pairing status, PWA manifest settings. - Out-of-Scope: Raw chat message storage (Zero chat log retention policy for privacy), direct 1-on-1 messaging, or native store binaries. - Architectural Context: An external Node.js background worker using Baileys and Groq Whisper v3 Turbo (for Hebrew voice notes) will parse messages in-memory and write structured task JSON straight to Lovable Cloud.

Acknowledge this vision and confirm you are ready for Prompt 2."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://parentpulse-task-digest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4eb221f-c61a-4755-a5a5-a10ffad8f097).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
