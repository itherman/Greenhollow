# Architecture

This doc is for contributors. The guiding principle is: **put rules in pure TypeScript and unit-test them; keep Phaser scenes thin.**

## Runtime flow (browser)
- **HTML entry**: `index.html` mounts `#app` and loads `src/main.ts`.
- **Game creation**: `src/main.ts` creates the Phaser game via `src/game/createGame.ts`.
- **Session selection**:
  - If a session exists in `localStorage` (`game.session.v1`), it is used.
  - Otherwise a DOM overlay is mounted (`src/ui/authOverlay.ts`) that lets the player **sign in / sign up** (Firebase) or **continue as guest**.
- **Scenes**:
  - `BootScene` immediately starts `WorldScene`.
  - `WorldScene` drives rendering + input, and calls into `src/core/*` for rules/layout/state transitions.

## Module boundaries (where to put new code)
- **`src/core/`**: pure rules and state transitions (preferred place for new logic).
  - Examples: movement, dialog state machine, inventory/equipment, combat math, UI layout calculators.
  - Should be **easy to test** with Vitest in Node (no `window`, no Phaser objects).
- **`src/game/`**: Phaser scenes, textures, and wiring.
  - Should mostly translate Phaser inputs/events into calls to `src/core/` and then render the results.
- **`src/services/`**: persistence + adapters.
  - Local persistence uses `localStorage`.
  - Cloud persistence uses Firebase (Auth + Firestore) when configured.
- **`src/ui/`**: DOM overlays (auth) that sit on top of the canvas.

## Persistence overview

### Session
- Stored under `localStorage` key `game.session.v1` (see `src/services/auth/session.ts`).
- Modes:
  - `guest`: offline/local play, `uid` looks like `guest:<id>`.
  - `firebase`: authenticated play, `uid` is the Firebase Auth UID.

### Local game state (guest + firebase)
Stored in `localStorage`:
- `game.inventory.v1` (inventory)
- `game.equipment.v1` (equipment)
- `game.flags.v1` (progress/flags)
- `game.progress.v1` (area/entry, player position, hp/maxHp)

These stores are loaded/saved by `src/services/game/*Store.ts` and should remain simple IO wrappers.

### Cloud save/load (firebase mode only)
If Firebase is configured and the session mode is `firebase`:
- Save/load happens through `src/services/game/cloudPlayerState.ts`.
- Player state is stored on the user document: `users/{uid}.state`.
  - The payload is versioned via `src/core/playerStateCodec.ts` (currently `v: 1`).
  - Writes use Firestore `merge: true` so fields like `createdAt` aren’t overwritten.

### Town presence (firebase mode only)
When a player enters the Town hub:
- `src/services/game/presence.ts` publishes tile + facing data to Realtime Database at `towns/town/presence/{uid}`.
- Other clients subscribe to the `towns/town/presence` path and filter locally.

## Auth model (username + password)
- The UI collects `username` + `password`.
- Internally, we map the normalized username to a synthetic email: `<username>@game.local` (see `src/core/username.ts`).
- Firebase Auth uses email/password with that synthetic email (see `src/services/auth/authService.ts`).
- Username uniqueness is enforced via a Firestore transaction on `usernames/{username}`.

## Testing strategy
- Vitest runs in **Node** (`vitest.config.ts`), so code under test should not require `window`.
- If a module needs storage, prefer injecting a `StorageLike` interface (many modules already do).
