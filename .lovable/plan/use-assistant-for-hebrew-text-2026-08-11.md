# Use Assistant for Hebrew text

## What's happening

Assistant is already loaded, but the app's type tokens name the Latin fonts first (Plus Jakarta Sans for body, Syne for headings). Hebrew falls through to whatever the browser picks per glyph, and the tight letter-spacing used for the Latin display face makes Hebrew look cramped and uneven.

## What to change

1. When the app is in Hebrew (RTL), set both body and heading type to Assistant explicitly, so every screen — headings, cards, buttons, nav — renders in one consistent Hebrew face.
2. Tune Hebrew typography: remove the negative letter-spacing (Hebrew has no letterforms that benefit from it), and give Hebrew headings and body slightly more line-height so they breathe.
3. Keep English exactly as it is today (Syne headings, Plus Jakarta body).

## Technical notes

- `src/styles.css`: add an override scoped to `[dir="rtl"]`/`html[lang="he"]` that sets `--font-sans` and `--font-display` to `"Assistant", ui-sans-serif, system-ui, sans-serif`, plus `letter-spacing: normal` and a modest `line-height` bump for headings inside RTL.
- No change to the Google Fonts `<link>` in `src/routes/__root.tsx` — Assistant is already requested with the needed weights (400–800).
- Styling-only change; no component or logic edits.
