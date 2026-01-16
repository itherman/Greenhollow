# Testing

## Philosophy
We aggressively unit-test logic and rules:
- Username rules (validation/normalization)
- Scoreboard rules (score validation, ordering) (planned)
- Game state transitions (quests/dialog/combat) as pure functions

We avoid brittle tests for rendering. Phaser scenes should be thin wrappers around tested logic modules.

## Running tests

Before the Playwright end-to-end suite can run, install the browser binaries and OS deps:

```bash
npm run setup:playwright
```

```bash
npm test
```

`npm test` runs both the Vitest unit suite and Playwright end-to-end checks. Use `npm run test:unit` or `npm run test:e2e` when you only need one layer.

```bash
npm run test:watch
```

## Running a single test / subset
Run a single test file:

```bash
npm test -- src/core/username.test.ts
```

Run by test name pattern:

```bash
npm test -- -t "username"
```

Watch mode + filter:

```bash
npm run test:watch -- -t "movement"
```

## Test layout
- `src/core/**` contains logic intended to be unit-tested
- `src/**/*.test.ts` contains tests (see `vitest.config.ts`)

## What belongs where (rule of thumb)
- `src/core/`: pure functions, reducers/state transitions, validation/normalization.
- `src/services/`: IO and adapters (localStorage, Firebase). Keep logic thin; push rules down into `src/core/` where possible.
- `src/game/`: Phaser scenes. Prefer calling into `src/core/` for rules and layout computations.
