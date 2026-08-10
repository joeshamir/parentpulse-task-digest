# Self-test a task without waiting for others

Add a one-tap "Send me a test task" button so the user can confirm the app works immediately, without waiting for someone else to post in a WhatsApp group.

## What we'll build

1. **Authenticated test-task server function**  
   A thin `createTestTask` server function that inserts one sample `action_items` row for the currently signed-in user.

2. **"Send me a test task" button in Groups & Settings**  
   Placed near the save button, visible only when signed in. Tapping it calls the server function and shows a success toast.

3. **Realtime confirmation**  
   The Actions tab already subscribes to `action_items` changes, so the test task will appear instantly when the user switches back to the Actions tab.

## Why this is safe

- Only the signed-in user can create a task for their own `user_id`.
- No secrets are exposed in the UI.
- The test row is a normal `action_items` record, so it exercises the same database, RLS, Realtime, and UI path as a real worker task.

## Out of scope for this plan

- This does not test the WhatsApp/Baileys parsing path itself. A full end-to-end worker test still requires either another person sending a message in a tracked group or running a manual `curl` from the Railway terminal using `WORKER_SECRET`.

## Steps

1. Create `src/lib/test-task.functions.ts` with `createTestTask` using `createServerFn` + `requireSupabaseAuth` middleware.
2. In `src/routes/groups.tsx`, import `useServerFn(createTestTask)` and add a secondary button that calls it.
3. Verify the inserted row appears in the Actions feed via the existing Realtime subscription.
4. Run a typecheck/build to confirm no import or auth-middleware issues.

## Files to change

- `src/lib/test-task.functions.ts` (new)
- `src/routes/groups.tsx` (add button + hook)
