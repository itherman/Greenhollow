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

test.describe("Town presence peers", () => {
  test("renders remote player sprites in the town", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    const harness = await getHarness(page);
    const enteredTown = await harness.evaluate((h) => h.restartInArea({ areaId: "town", entry: "start" }));
    expect(enteredTown).toBe(true);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "town",
      undefined,
      { timeout: 20_000 },
    );

    const applied = await harness.evaluate((h) =>
      h.setTownPresencePeers([
        { uid: "peer-1", username: "bob123", x: 3, y: 2, facing: "right", updatedAtMs: Date.now() },
        { uid: "peer-2", username: "bob333", x: 10, y: 12, facing: "down", updatedAtMs: Date.now() },
      ]),
    );
    expect(applied).toBe(true);

    await page.waitForFunction(() => {
      const state = window.__GREENHOLLOW_TEST_HOOKS__?.getState();
      return state?.townPresence?.spriteCount === 2;
    });
  });
});
