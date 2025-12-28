# Testing

## Philosophy
We aggressively unit-test logic and rules:
- Username rules (validation/normalization)
- Scoreboard rules (score validation, ordering)
- Game state transitions (quests/dialog/combat) as pure functions

We avoid brittle tests for rendering. Phaser scenes should be thin wrappers around tested logic modules.

## Running tests

```bash
npm test
```

```bash
npm run test:watch
```

## Test layout
- `src/core/**` contains logic intended to be unit-tested
- `src/**/__tests__/**` or `src/**/*.test.ts` contains tests


