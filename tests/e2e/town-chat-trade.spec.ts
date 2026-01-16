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

test.describe("Town chat and trade", () => {
  test("opens chat log and trade listings from a player dialog", async ({ page }) => {
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

    await harness.evaluate((h) =>
      h.setTownChatMessages([
        { id: "m1", uid: "peer-1", username: "Mara", text: "Welcome to town.", createdAtMs: Date.now() - 2000 },
        { id: "m2", uid: "peer-2", username: "Rin", text: "Selling gear by the fountain.", createdAtMs: Date.now() - 1000 },
      ]),
    );

    await harness.evaluate((h) =>
      h.setTownTradeListings([
        {
          id: "listing-1",
          sellerUid: "peer-1",
          sellerName: "Mara",
          itemId: "dagger",
          qty: 1,
          price: 40,
          status: "open",
          createdAtMs: Date.now(),
        },
      ]),
    );

    const opened = await harness.evaluate((h) => h.openTownPlayerDialog({ uid: "peer-1", username: "Mara" }));
    expect(opened).toBe(true);

    await page.waitForFunction(() =>
      window.__GREENHOLLOW_TEST_HOOKS__?.getDialogChoiceTexts().some((t) => /Chat/i.test(t)),
    );

    await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.chooseDialogChoice("Chat") === true);
    await page.waitForFunction(() =>
      window.__GREENHOLLOW_TEST_HOOKS__?.getDialogChatLog()?.includes("Mara: Welcome to town."),
    );

    await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.chooseDialogChoice("Back") === true);
    await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.chooseDialogChoice("Trade") === true);
    await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.chooseDialogChoice("Browse") === true);

    await page.waitForFunction(() =>
      window.__GREENHOLLOW_TEST_HOOKS__?.getDialogChoiceTexts().some((t) => /Buy: Dagger/i.test(t)),
    );
  });
});
