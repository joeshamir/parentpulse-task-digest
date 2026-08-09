# Fix the "This page didn't load" screen

## What I found

- The error screen is the app's generic server-side fallback, shown when the server can't render a page.
- Server logs show the real cause during that window: `Error: Worker bundle not found: ...:_worker_bundle.json` at 18:19, and one preview request returning status 0 at 18:28. That means the preview's server build was missing/being rebuilt while you loaded the page.
- The only change synced from GitHub in the last 20 minutes is commit `67e3c91 Update railway.json`, which added an `npm install` step to the Railway build config. It does not touch any app code.
- The working tree is clean and matches GitHub; `/groups` currently renders with HTTP 200 locally, in preview, and on the published site.

So the app code is not broken. The screen came from a rebuild gap, not from your GitHub edit.

## One real problem the GitHub file does introduce

`railway.json` sets the start command to `node .output/server/index.mjs`. This project builds for an edge/worker target and does not emit `.output/server/index.mjs`, so a Railway deploy from this repo would fail to boot even though Lovable hosting is fine. This is unrelated to the error screen you saw, but it will bite if you actually deploy to Railway.

## Plan

1. Run a full production build to prove the current GitHub state compiles and prerenders cleanly — this is the definitive check that the sync didn't break anything.
2. Reload the preview and the published URL for `/`, `/digest`, and `/groups` and confirm all three render (no fallback page).
3. If the build surfaces a genuine error, fix that error in app code and re-verify.
4. Decide on `railway.json`:
   - If you are not deploying to Railway: delete the file so it stops implying a broken deploy path.
   - If you are: correct the start command and build output to match this project's actual build target.

## Technical notes

- The fallback page comes from `src/lib/error-page.ts`, rendered by `src/server.ts` and the error middleware in `src/start.ts`. It intentionally hides stack details from users; the detail lands in server logs.
- No change is planned to `src/routes/groups.tsx` or any other route unless step 1 turns up a real failure.
