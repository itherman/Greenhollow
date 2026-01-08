import { expect, test, type JSHandle, type Page } from "@playwright/test";
import type { TestHarness } from "../../src/testing/testHarness";

type HarnessHandle = JSHandle<TestHarness>;

async function getHarness(page: Page): Promise<HarnessHandle> {
  const handle = await page.waitForFunction(
    () => window.__GREENHOLLOW_TEST_HOOKS__ as TestHarness | undefined,
    { timeout: 20_000 },
  );
  return handle;
}

test.describe("Town hub travel", () => {
  test("shows a loading overlay before entering the town hub", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    const harness = await getHarness(page);
    const restarted = await harness.evaluate((h) => h.restartInArea({ areaId: "village", entry: "start" }));
    expect(restarted).toBe(true);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "village",
      undefined,
      { timeout: 20_000 },
    );

    await page.click("canvas");

    await page.evaluate(() => {
      const times = { start: null as number | null, end: null as number | null };
      (window as any).__townOverlayTimes = times;
      const observer = new MutationObserver(() => {
        const overlay = document.querySelector("#gh-loading-overlay");
        if (overlay && times.start == null) times.start = performance.now();
        if (!overlay && times.start != null && times.end == null) times.end = performance.now();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      (window as any).__townOverlayObserver = observer;
    });

    const teleported = await harness.evaluate((h, tile) => h.teleportToTileCenter(tile), { x: 0, y: 15 });
    expect(teleported).toBe(true);

    const overlay = page.locator("#gh-loading-overlay");
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "town",
      undefined,
      { timeout: 20_000 },
    );

    await overlay.waitFor({ state: "detached", timeout: 10_000 });
    await page.waitForFunction(() => (window as any).__townOverlayTimes?.end != null);
    const elapsedMs = await page.evaluate(() => {
      const times = (window as any).__townOverlayTimes;
      if (!times || times.start == null || times.end == null) return null;
      return times.end - times.start;
    });
    expect(elapsedMs).not.toBeNull();
    expect(elapsedMs).toBeGreaterThanOrEqual(1000);
  });
});
