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

test.describe("Shop quantity controls", () => {
  test("adjusts purchase quantity in the confirm dialog", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    const harness = await getHarness(page);
    await harness.evaluate((h) => h.grantCoins(120));
    const opened = await harness.evaluate((h) => h.openShopConfirm("dagger"));
    expect(opened).toBe(true);

    await page.waitForFunction(
      () => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.nodeId === "confirm",
      undefined,
      { timeout: 10_000 },
    );

    const headerBefore = await harness.evaluate((h) => h.getDialogHeaderText());
    expect(headerBefore).toContain("x1");
    expect(headerBefore).toContain("40c");

    const bumped = await harness.evaluate((h) => h.adjustShopQuantity(1));
    expect(bumped).toBe(true);

    const headerAfter = await harness.evaluate((h) => h.getDialogHeaderText());
    expect(headerAfter).toContain("x2");
    expect(headerAfter).toContain("80c");
  });
});
