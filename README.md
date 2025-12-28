# Game (Phaser 3 + Firebase)

2D medieval adventure game (Zelda/Pokémon-style) built for the web.

## Goals (near-term)
- Playable in a browser quickly (local first, deployable as static site later)
- 4-direction movement + sprite animations
- Multiple areas (village/woods/caves) via tilemaps
- Username/password login (no email in UI), backed by Firebase via synthetic email
- Global scoreboard/leaderboard
- Heavy unit testing for game logic and data rules

## Tech stack
- Vite + TypeScript
- Phaser 3
- Firebase (Auth + Firestore)
- Vitest (unit tests)

## Getting started

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Watch tests:

```bash
npm run test:watch
```

## Docs
- `docs/ROADMAP.md`
- `docs/DEVLOG.md`
- `docs/TESTING.md`
- `docs/FIREBASE_SETUP.md`
- `docs/adr/` (architecture decision records)


