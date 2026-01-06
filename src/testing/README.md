# End-to-end test harness (browser-driven)

We expose a small **test harness** for browser automation tools (Playwright, Puppeteer, Selenium, SeleniumBase, etc.). It lets tests read basic game state and translate world/tile coordinates into DOM screen coordinates so they can click/tap accurately.

## API

When the app is running, `window.__GREENHOLLOW_TEST_HOOKS__` is available:

```ts
type TestHarness = {
  version: string; // currently "0.1"
  getState(): {
    areaId?: string;
    player?: { x: number; y: number };
    dialog?: { open: boolean; scriptId?: string; nodeId?: string };
  } | null;
  worldToScreen(world: { x: number; y: number }): { x: number; y: number } | null;
  tileCenterToScreen(tile: { x: number; y: number }): { x: number; y: number } | null;
  // Useful for stabilizing E2E tests that don't need to validate movement/pathing.
  teleportToTileCenter(tile: { x: number; y: number }): boolean;
};
```

Notes:
- `getState()` returns `null` until the WorldScene is active.
- Coordinates use Phaser world units (pixels) or tile indices (`tileCenterToScreen` assumes 32px tiles).
- `worldToScreen` uses the current camera bounds + zoom and the canvas bounding rect, so it remains accurate after resize or camera movement.

## Example usage (Playwright)

```ts
const harness = await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__);
const state = await harness.evaluate((h) => h.getState());
const elderScreen = await harness.evaluate((h) => h.tileCenterToScreen({ x: 13, y: 8 }));
await page.mouse.click(elderScreen.x, elderScreen.y);
```

This is intentionally minimal; extend it as we grow regression coverage.

## Wizard dialog regression test (browser-driven)

File: `tests/e2e/wizard-dialog.spec.ts` (runs under the Playwright test runner).

What it does:
- launches the Vite dev server via `playwright.config.ts`
- opens the game in Chromium/Firefox/WebKit
- clicks through the intro and guest login
- walks to the village elder and exercises every dialog choice (1, 2, 3), then closes the dialog
- captures a full-page screenshot at `playwright-artifacts/screenshots/wizard-dialog.png`

Running it locally:
1) Install dependencies (Playwright downloads browsers during install): `npm install`
2) Run the end-to-end suite: `npm run test:e2e` (or `npm test` for unit + E2E)

Notes:
- The test uses the harness helpers to translate tile coords to screen coords, so it remains stable even if the canvas size changes.
- Keyboard presses drive the dialog (E to advance, 1/2/3 for choices).
