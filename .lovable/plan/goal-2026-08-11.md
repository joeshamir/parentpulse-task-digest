Remove the non-functional "Add to Calendar" button from task cards.

## Goal
The calendar button on each `TaskCard` is currently a placeholder with no handler. Drop it for the MVP to keep the card UI focused on the one working action: marking a task complete.

## Changes
1. Update `src/components/TaskCard.tsx`
   - Remove the `CalendarPlus` import from `lucide-react`.
   - Remove the secondary calendar button and its `aria-label`.
   - Let the "Mark Complete" / "Completed" button fill the available width cleanly.

2. Verify there are no other dead calendar references in the components or routes that would break after the import is removed.

## Out of scope
- Real calendar export (.ics, Google Calendar, device calendar) is deferred to a post-MVP feature.
- No database or worker changes are needed.
