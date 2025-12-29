# Game (Phaser 3 + Firebase)

2D medieval adventure game (Zelda/Pokémon-style) built for the web.

## Goals (near-term)
- Playable in a browser quickly (local first, deployable as static site later)
- 4-direction movement + sprite animations
- Multiple areas (village/woods/caves) via tilemaps
- Username/password login (no email in UI), backed by Firebase via synthetic email
- Global scoreboard/leaderboard (planned)
- Heavy unit testing for game logic and data rules

## Tech stack
- Vite + TypeScript
- Phaser 3
- Firebase (Auth + Firestore)
- Vitest (unit tests)

## Getting started

### Prerequisites
- Node.js (Vite 5 requires Node 18+)
- npm

### Install

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Run tests

```bash
npm test
```

### Watch tests

```bash
npm run test:watch
```

### Firebase (optional)
You can play in **guest mode** without Firebase. To enable login + cloud save (and future cloud features), follow:
- `docs/FIREBASE_SETUP.md`

### Build / preview / deploy
Build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Deploy (Firebase Hosting):

```bash
npm run deploy
```

## Repo map (high level)
- `src/core/`: **pure** game rules + logic (unit-tested)
- `src/game/`: Phaser scenes + rendering + asset wiring (should stay thin)
- `src/services/`: persistence + Firebase adapters (localStorage / Firestore)
- `src/ui/`: DOM overlays (auth UI)
- `docs/adr/`: architecture decision records (why we chose the current approach)

## Docs
- `docs/ROADMAP.md`
- `docs/DEVLOG.md`
- `docs/TESTING.md`
- `docs/FIREBASE_SETUP.md`
- `docs/adr/` (architecture decision records)


