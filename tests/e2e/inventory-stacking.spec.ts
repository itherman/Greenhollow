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

test.describe("Inventory stacking", () => {
  test("merges legacy stacks into a single slot", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start/i }).click();
    await page.getByRole("button", { name: /continue as guest/i }).click();

    await page.evaluate(() => {
      const legacyInventory = {
        size: 20,
        slots: [
          { id: "coins", name: "Coins", qty: 720, maxStack: 999 },
          { id: "coins", name: "Coins", qty: 334, maxStack: 999 },
          { id: "stew", name: "Stew", qty: 3, maxStack: 10 },
          { id: "stew", name: "Stew", qty: 10, maxStack: 10 },
        ],
      };
      window.localStorage.setItem("game.inventory.v1", JSON.stringify(legacyInventory));
    });

    const harness = await getHarness(page);
    const coinStacks = await harness.evaluate((h) => h.getInventoryStacks("coins"));
    const stewStacks = await harness.evaluate((h) => h.getInventoryStacks("stew"));

    expect(coinStacks).toEqual([1054]);
    expect(stewStacks).toEqual([13]);
  });
});
