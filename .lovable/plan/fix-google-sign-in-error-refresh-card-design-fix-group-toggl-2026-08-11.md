# Fix Google sign-in error, refresh card design, fix group toggles

## 1. Google sign-in error card

The "Missing Supabase environment variable(s)" card appears when you press Google. The app's own screens use a resilient backend client that falls back to runtime configuration, but the managed Google helper file uses the older generated client, which throws immediately when build-time values are absent. That throw is what you see.

Fix: add an app-owned Google sign-in wrapper that calls the same managed Lovable auth provider but hands the resulting session to the resilient backend client. The auto-generated integration files stay untouched. If the provider itself returns an error, show that message instead of a crash card.

## 2. Card design refresh (reference image)

Restyle task and group cards toward the reference: white cards on a soft tinted background, generous rounding, very soft shadow instead of visible borders, small muted context line above a strong dark title, a colored rounded-square icon tile on the trailing side, and a small pill for status/time in the footer row. Same treatment applied consistently to Actions cards, Digest cards and Group rows so the app reads as one system. RTL stays correct.

## 3. Group activation toggles

When a group is on, the toggle currently looks broken: the knob shifts the wrong way in Hebrew (right-to-left) and sits half outside the track. Fix by making the switch direction-aware and slightly larger, with a properly inset knob, clear on/off colors and a smooth slide. Also soften the "selected" highlight on the row so an active group reads as gently tinted rather than outlined.

## Technical notes

- New `src/lib/google-signin.ts`: uses `createLovableAuth()` from `@lovable.dev/cloud-auth-js` and `supabase.auth.setSession` from `@/integrations/supabase/browser-client`; `src/routes/auth.tsx` calls it instead of `@/integrations/lovable/index`.
- `src/components/ui/switch.tsx`: h-6 w-11 track, h-5 w-5 thumb, `rtl:-translate-x-5` for the checked state, `data-[state=unchecked]:bg-muted-foreground/30`.
- Card styling changes limited to `src/styles.css` (`.card-soft`), `src/components/TaskCard.tsx`, `src/routes/index.tsx`, `src/routes/digest.tsx`, `src/routes/groups.tsx`.
- Frontend-only; needs a publish Update to reach the live site.
