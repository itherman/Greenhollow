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

test.describe("Town player dialog", () => {
  test("shows Trade and Leave choices with no Chat option, and Trade advances to tradeWaiting", async ({ page }) => {
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

    const opened = await harness.evaluate((h) => h.openTownPlayerDialog({ uid: "peer-1", username: "Mara" }));
    expect(opened).toBe(true);

    // Menu should have Trade and Leave but NOT Chat.
    await page.waitForFunction(() => {
      const choices = window.__GREENHOLLOW_TEST_HOOKS__?.getDialogChoiceTexts() ?? [];
      return choices.some((t) => /trade/i.test(t)) && choices.some((t) => /leave/i.test(t));
    });

    const choices = await harness.evaluate((h) => h.getDialogChoiceTexts());
    expect(choices.some((t) => /chat/i.test(t))).toBe(false);

    // Choosing Trade should navigate to the tradeWaiting node.
    await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.chooseDialogChoice("Trade") === true);
    await page.waitForFunction(() => {
      const dialog = window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog;
      return dialog?.open && dialog?.nodeId === "tradeWaiting";
    });
  });
});
