# Soft transitions across the app

Add gentle, consistent motion to the moments that currently change instantly: switching tabs, deleting a task, new tasks arriving, filtering the feed, and completing a task. Everything stays subtle (200–300 ms, ease-out) and respects `prefers-reduced-motion`.

## What changes

### 1. Tab / screen switching
- When moving between Actions, Groups, and Settings, the screen content fades in with a slight rise (~8 px) instead of popping in.
- The dock already animates its active color; no change needed there.

### 2. Task deletion
- Tapping delete (button or swipe) now plays a short exit: the card slides toward the delete side and fades, then its height collapses so the list below closes the gap smoothly — instead of the card vanishing instantly.
- Only after the animation (~250 ms) is the row removed from state and deleted from the database. Failure still rolls back with the existing error toast.

### 3. New task arriving
- A task that arrives live (realtime insert) eases in at the top of the feed with a fade + slight drop-in, so it doesn't just appear.

### 4. Filter chips
- Switching a category filter cross-fades the list instead of an instant swap.

### 5. Completing a task
- The existing background change is kept, plus a soft fade on the title strike-through and "Done" badge so the state change reads smoothly.

### 6. Accessibility
- All animations are disabled under `prefers-reduced-motion: reduce` via a global CSS guard — users who ask for less motion get instant transitions.

## Technical notes

- `src/styles.css`: add a small set of shared keyframes/utilities (`card-enter`, `card-exit`, `page-enter`) and the `prefers-reduced-motion` guard. `tw-animate-css` is already imported, so its `animate-in` utilities are available too.
- `src/components/MobileShell.tsx`: apply the page-enter animation to `<main>`; key it by the current path so it replays on tab switch.
- `src/components/TaskCard.tsx`: accept an optional `leaving` prop; when true, apply the slide-out/fade classes (direction-aware via the existing `rtl` flag, logical-property safe).
- `src/routes/index.tsx`: track `leavingIds`; `deleteTask` marks the row leaving, waits ~250 ms, then removes it and calls the database delete. Track freshly-arrived realtime ids to apply the enter animation once. Key the list section by the active filter for the cross-fade.
- No new dependencies, no backend/worker changes, no data-shape changes. Demo-feed deletion isn't affected (demo cards have no delete).
