# Stop the "needs to be republished" screen for good

## What you're seeing

That screen is ParentPulse's own error page. It appears when the app can't find its backend address and public key at startup. Right now those two values are baked into the app **at build time**. If a published build is produced without them, every visitor gets that screen and there is nothing they can do — no sign-in, no data, no recovery. That's exactly the loop we've been stuck in.

## The fix

Stop depending on build-time baking. The server that serves the app always knows the backend address and public key, so it will hand them to the browser on every page load.

- The page HTML will include the backend address and public key (both are public, safe-to-share values — no secrets).
- The app reads them at runtime; if the build-time values are missing, it uses the ones from the page.
- Result: even a build produced without the variables works, because the running server supplies them on each request.

Also: the error screen stops being a dead end. If configuration is genuinely unavailable, the app still loads the UI shell and shows a clear message instead of blocking the whole page.

## Technical changes

1. `src/routes/__root.tsx`
   - In `RootShell`, inject a small inline script tag setting `window.__PARENTPULSE_BACKEND__ = { url, key }`, sourced server-side from `process.env.SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` (falling back to the `VITE_*` values). Values are read inside the component render, not at module scope.
   - Keep the existing `errorComponent`, but the config branch becomes a rare fallback rather than the normal path.

2. New `src/integrations/supabase/browser-client.ts`
   - Resolves config in order: `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` → `window.__PARENTPULSE_BACKEND__` → `process.env` during SSR.
   - Creates the client lazily with the same options as the generated client (opaque `sb_publishable_` key handling via a custom `fetch` that sets `apikey` and strips the bearer header, `persistSession: true`, `autoRefreshToken: true`, `localStorage` in the browser).
   - Exports `supabase` (lazy proxy, same shape) and `hasBackendConfig()`.
   - The auto-generated `src/integrations/supabase/client.ts` is left untouched.

3. Swap browser imports to the new module in:
   `src/lib/auth.tsx`, `src/components/OAuthCallbackBootstrap.tsx`, `src/routes/auth.tsx`, `src/routes/groups.tsx`, `src/routes/index.tsx`.
   Server routes (`src/routes/api/public/*`) and `client.server.ts` stay as they are.

4. `src/lib/backend-config.ts` re-exports the runtime-aware `hasBackendConfig()` so existing checks agree with the new resolution order.

## Verification before I hand it back

- Load `/` and `/groups` in a real browser against a build with the `VITE_*` variables deliberately blanked, and confirm the app still boots and reaches the sign-in screen (this is the exact failure mode in your screenshot).
- Confirm the Google callback still consumes the returned tokens and clears them from the address bar.
- Confirm no secret values are injected — only the public backend URL and publishable key.

After this lands you'll need to publish once; from then on a missing build variable can no longer black-out the app.
