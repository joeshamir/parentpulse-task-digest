# Fix: red delete strip bleeding through completed task cards

## Root cause
In `src/components/TaskCard.tsx`, the swipe-to-delete panel (a red `bg-destructive` button) is always rendered behind the card. When a task is marked complete, the card's background class changes from solid `bg-card` to `bg-muted/40` — and since `cn()` merges Tailwind classes, `bg-muted/40` *replaces* `bg-card`, leaving a 40%-opaque background. The red panel shows straight through it. The signed-out demo feed has no delete panel, which is why this never appears there.

## Fix (frontend only, `src/components/TaskCard.tsx`)

1. **Hide the delete panel unless the card is swiped open.**
   - Give the red reveal button an opacity driven by the swipe offset: fully transparent and `pointer-events-none` when the card is at rest, fading in as the card is dragged.
   - Implementation: `style={{ opacity: Math.min(1, Math.abs(offset) / (REVEAL / 2)) }}` plus `aria-hidden`/`tabIndex={-1}` when closed, and `transition-opacity` only when not actively dragging so it eases out on snap-back.
   - This guarantees nothing red can ever show through a resting card, regardless of background opacity.

2. **Keep the completed look as-is.** With the panel hidden at rest, the intended soft `bg-muted/40` tint for completed cards now blends with the page background (the original design intent) instead of the delete panel.

## Verification
- In the preview with a signed-in session: mark a task complete and confirm no red shows through the card; swipe a card (touch emulation) and confirm the red delete action still reveals, and the trash fallback button still deletes.
- Check both English (LTR) and Hebrew (RTL), and confirm the exit animation on delete still plays smoothly.

No database, worker, or API changes.
