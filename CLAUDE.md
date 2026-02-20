# CLAUDE.md

## Project overview

Greenhollow is a 2D medieval adventure game (Zelda/Pokémon-style) built for the browser. It features multi-area exploration, NPC dialog, combat, inventory, and a real-time multiplayer town hub. Firebase is optional — the game works offline in guest mode.

## Tech stack

- **Vite 5 + TypeScript** — build tooling
- **Phaser 3** — 2D game engine (rendering, input, scenes)
- **Firebase** — Auth (username+password via synthetic email), Firestore (user profiles, usernames), Realtime Database (town presence, chat, trades)
- **Vitest** — unit tests (runs in Node, no browser)
- **Playwright** — end-to-end browser tests

## Commands

```bash
npm run dev          # start dev server
npm run build        # tsc + vite build
npm test             # unit tests + e2e tests
npm run test:unit    # vitest only
npm run test:e2e     # playwright only
npm run test:watch   # vitest watch mode
npm run test:rules   # Firestore security rules (needs emulator)
npm run deploy       # build + firebase deploy
```

## Source layout

```
src/core/       # Pure game logic — preferred place for new logic
src/game/       # Phaser scenes + rendering (should stay thin)
src/services/   # Firebase + localStorage adapters (IO only)
src/ui/         # DOM overlays (auth UI)
docs/           # Architecture, roadmap, ADRs, devlog
```

## Architecture rules

- Use the planner subagent first, then frontend and backend agents as needed.
- **`src/core/` is the source of truth for rules.** New game logic (movement, combat, dialog, inventory, validation) goes here as pure functions with no `window` or Phaser dependencies.
- **Phaser scenes (`src/game/`) are thin wrappers.** They translate input/events into calls to `src/core/` and render the results.
- **`src/services/` is IO only.** Push business logic down into `src/core/` rather than keeping it in service files.
- Code in `src/core/` must be testable by Vitest running in Node (no browser globals).

## Testing philosophy

- Aggressively unit-test logic (validation, state transitions, combat math, inventory rules).
- Avoid testing rendering — Phaser scenes should be thin enough not to need it.
- Every meaningful behavior change should have a unit test or Playwright regression.
- Inject a `StorageLike` interface rather than using `localStorage` directly so logic stays testable in Node.

## Auth model

- UI collects `username` + `password` (no email shown to user).
- Internally mapped to a synthetic email: `<username>@game.local`.
- Firebase Auth uses email/password with the synthetic email.
- Username uniqueness is enforced via a Firestore transaction on `usernames/{username}`.

## Persistence

| Store | Key / Path | Scope |
|---|---|---|
| Session | `localStorage: game.session.v1` | always |
| Inventory | `localStorage: game.inventory.v1` | always |
| Equipment | `localStorage: game.equipment.v1` | always |
| Flags | `localStorage: game.flags.v1` | always |
| Progress | `localStorage: game.progress.v1` | always |
| Cloud player state | `users/{uid}.state` (Firestore) | firebase mode |
| Town presence | `towns/town/presence/{uid}` (RTDB) | firebase + in town |
| Town chat | `towns/town/chat/{messageId}` (RTDB) | firebase + in town |
| Town trades | `towns/town/listings/{listingId}` (RTDB) | firebase + in town |

## Guest mode

Guest sessions use `uid: "guest:<id>"` stored in `localStorage`. Firebase is not required; the full single-player game works offline.
