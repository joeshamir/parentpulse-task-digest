# Fix the broken swipe-to-delete on task cards

The screenshot shows the red delete panel bleeding out on every card, with the card content sliding the wrong way and never snapping back. Three defects in the swipe implementation cause this.

## What's wrong

1. **Wrong direction in Hebrew (RTL).** The delete panel is pinned to the right side, but the swipe math moves the card *right* instead of left, so the card slides away from the panel and exposes red underneath instead of covering it.
2. **Cards stay stuck open.** Once a card is dragged, the offset is never reset — tapping elsewhere, completing, or re-rendering the list leaves it half-open, which is why several cards look broken at once.
3. **Two delete affordances.** There is both a swipe panel and a trash button in the footer row, which makes the card look cluttered and duplicated.

## The fix

- Correct the RTL/LTR direction so the card always slides *over* toward the panel, revealing exactly the panel width and no more.
- Clamp travel so the red panel can never show more than its own width, and give the panel the same rounded corners as the card.
- Snap the card closed on tap-outside, on complete, and whenever the task list changes; only one card can be open at a time.
- Keep the footer trash button as the primary, accessible delete action and treat the swipe as a shortcut — or, if preferred, drop one of the two.

## Technical notes

Changes are confined to `src/components/TaskCard.tsx` (drag math, reset effect, panel styling). No data or backend changes.

## Question

Do you want to keep both the swipe gesture and the visible trash button, or only one of them?
