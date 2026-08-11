# Drop the Digest Tab for MVP

## Goal
Remove the Digest tab and route from the ParentPulse mobile UI so the MVP focuses on Actions and Groups/Settings only.

## Steps
1. **Remove the Digest route**
   - Delete `src/routes/digest.tsx`.
   - Let TanStack Router regenerate `src/routeTree.gen.ts`.
2. **Update bottom navigation**
   - In `src/components/MobileShell.tsx`, remove the Digest tab entry.
   - Change the nav grid from `grid-cols-3` to `grid-cols-2`.
   - Keep the floating dock styling intact.
3. **Handle deep links / bookmarks**
   - Add a redirect from `/digest` to `/` so any saved links or history land on the Actions feed instead of a 404.
4. **Verify no orphaned references**
   - Search the codebase for `/digest` or `digest` imports and remove any remaining links.

## Outcome
The app will have two bottom-nav tabs: **Actions** (default) and **Groups**. The Digest feature is removed from the UI but can be reintroduced later when summarization costs are justified.
