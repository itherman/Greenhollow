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

test.describe("Town chat button", () => {
  test("opens the town chat panel from the HUD button", async ({ page }) => {
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

    const rect = await harness.evaluate((h) => h.getTownChatButtonRect());
    expect(rect).not.toBeNull();
    if (!rect) throw new Error("Missing town chat button");
    await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2);

    // Panel should now be visible — the input field is the canonical anchor.
    await expect(page.getByPlaceholder("Type a message\u2026")).toBeVisible();

    await harness.evaluate((h) =>
      h.setTownChatMessages([{ id: "m1", uid: "peer-1", username: "Lysa", text: "Hello town!", createdAtMs: Date.now() }]),
    );
    // Message should appear in the panel DOM.
    await expect(page.getByText("Hello town!")).toBeVisible();
  });
});
