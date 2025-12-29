# Contributing

## Quick start
Install deps:

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

## Project conventions

## Engineering principle (please follow)
- Start from **first principles**: identify the core building blocks (data shapes, invariants, state transitions) before coding.
- Prefer the **smallest set of pure functions** that manipulates data to achieve the desired outcome.
- Make updates / fix bugs by reasoning about **fundamentals + invariants**, not by piling on ad-hoc conditions.
- Lock behavior in with **tests** (TDD recommended) so refactors stay safe.

### Prefer pure logic + unit tests
- Put rules/state transitions in `src/core/` as **pure functions**.
- Write/extend tests next to the module as `*.test.ts` (Vitest includes `src/**/*.test.ts`).
- Keep Phaser scenes in `src/game/` thin: they should mostly translate inputs into calls to `src/core/` and render results.

### Storage and IO
- Avoid touching `window` / `localStorage` in code that should be unit-tested.
- If you need persistence, use `StorageLike` injection patterns (see `src/services/auth/session.ts`, `src/services/game/flags.ts`, `src/services/game/progressStore.ts`).

### TypeScript
- This repo is `strict` (see `tsconfig.json`).
- Prefer explicit types at module boundaries (inputs/outputs of `src/core/*` functions).

## TDD workflow (recommended)
1. Write a failing test that captures the behavior you want.
2. Implement the minimal code to make it pass.
3. Refactor (keep `src/core/` pure and small).

Run a single test file:

```bash
npm test -- src/core/username.test.ts
```

Run by test name:

```bash
npm test -- -t "movement"
```

## What to update when you add features
- **New rule/behavior**: add tests in `src/core/*.test.ts`.
- **New persistence**: document the storage key in `docs/ARCHITECTURE.md`.
- **New Firebase usage**: update `docs/FIREBASE_SETUP.md` (collections/fields) and consider an ADR under `docs/adr/`.

## Deploying (maintainers)
See `docs/DEPLOYMENT.md`.


