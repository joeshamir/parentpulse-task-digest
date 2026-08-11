# Task feed: newest first, delete, and "added" timestamp

## 1. Newest tasks at the top
The feed currently sorts by deadline. Switch to newest-first by creation time, so a task that just arrived from a group is always the first card. Live-arriving tasks get prepended instead of appended.

## 2. Delete a task
Each card gets a delete affordance:
- Swipe the card sideways (left in English, right in Hebrew/RTL) to reveal a red Delete action.
- A small trash icon on the card as a fallback for non-touch use.
- Deleting removes the row from the database, with an optimistic removal and an undo-free error toast if it fails.

## 3. Show when the task was added
Each card shows the date and time the task arrived, styled as quiet secondary metadata (small, muted, with a plus/clock-less label like "Added Tue, 11 Aug 14:32"). It sits on its own line below the existing meta row, clearly separated from the deadline chip so the two dates never read as the same thing. Bilingual: "Added …" / "נוסף …".

## Technical notes
- `src/routes/index.tsx`: order query by `created_at` descending; realtime INSERT prepends; add `deleteTask(row)` calling `supabase.from("action_items").delete().eq("id", row.id)` with optimistic state and rollback.
- `src/lib/action-items.ts`: add `createdAt` formatting (bilingual `en-GB` / `he-IL`, weekday + day + month + time) to the `Task` shape.
- `src/components/TaskCard.tsx`: add `onDelete` prop, swipe-to-reveal using pointer/touch handlers with a translate transform (no new dependency), a Trash2 icon button, and the new "Added …" line.
- No database or worker changes; existing RLS already scopes deletes to the owner.
