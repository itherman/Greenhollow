# Troubleshooting

## Login fails / “Firebase not configured”
Symptoms:
- Auth overlay shows: “Login failed (Firebase not configured or wrong credentials).”

Checks:
- Ensure you have a local `.env` (copied from `ENV.template`).
- Ensure all required keys are present (see `docs/FIREBASE_SETUP.md`).
- Restart the dev server after changing `.env`.

Note:
- Guest mode works without Firebase and should never be blocked by missing env vars.

## “Missing Firebase env vars…” error in console
This comes from `src/services/firebase/firebase.ts` when code tries to access Firebase services without complete env vars.

Fix:
- Create/fix `.env` and include all `VITE_FIREBASE_*` keys, then restart `npm run dev`.

## Tests fail because of `window` / `localStorage`
Vitest runs in **Node** (`vitest.config.ts`), so `window` may not exist.

Fix:
- Keep business logic in `src/core/` pure.
- For persistence-related logic, inject a small `StorageLike` interface instead of directly using `window.localStorage` (see patterns in `src/services/auth/session.ts`, `src/services/game/flags.ts`, `src/services/game/progressStore.ts`).

## Resetting local saved state
Local state is stored in `localStorage`. Common keys:
- `game.session.v1`
- `game.inventory.v1`
- `game.equipment.v1`
- `game.flags.v1`
- `game.progress.v1`

To reset:
- Clear these keys in your browser devtools Application/Storage tab, or clear site storage for the local dev origin.

## Deployed site shows a blank page on refresh
Firebase Hosting should rewrite all paths to `/index.html` for a SPA.

Checks:
- Verify `firebase.json` includes a rewrite from `**` → `/index.html`.
- Re-deploy hosting after config changes (`npm run deploy:hosting`).


