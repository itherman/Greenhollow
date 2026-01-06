import { afterAll, beforeAll, expect, test } from "vitest";
import { createServer, type ViteDevServer } from "vite";

type Playwright = typeof import("playwright");

let playwright: Playwright | null = null;
let server: ViteDevServer | null = null;
let browser: any = null;
let page: any = null;
let baseUrl: string | null = null;

async function loadPlaywright(): Promise<Playwright | null> {
  try {
    const mod = await import("playwright");
    return mod as Playwright;
  } catch {
    return null;
  }
}

beforeAll(async () => {
  playwright = await loadPlaywright();
  if (!playwright) return;

  server = await createServer({
    server: {
      host: "127.0.0.1",
      port: 4173,
    },
    logLevel: "error",
  });
  await server.listen();
  baseUrl = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:4173";

  browser = await playwright.chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
}, 120_000);

afterAll(async () => {
  await browser?.close();
  if (server) await server.close();
});

test(
  "guest can talk to the elder using all dialog options",
  { timeout: 120_000 },
  async () => {
  if (!playwright || !page || !baseUrl) {
    console.warn("Skipping Playwright flow (playwright not installed in this environment).");
    return;
  }

  await page.goto(baseUrl);
  await page.getByRole("button", { name: /start/i }).click();
  await page.getByRole("button", { name: /continue as guest/i }).click();

  // Wait for the harness and focus the canvas to receive keyboard events.
  await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.areaId === "village");
  await page.click("canvas");

  const clickTile = async (x: number, y: number) => {
    const point = await page.evaluate(
      ([tx, ty]: [number, number]) => window.__GREENHOLLOW_TEST_HOOKS__?.tileCenterToScreen({ x: tx, y: ty }),
      [x, y],
    );
    if (!point) throw new Error("No harness or screen point available");
    await page.mouse.click(point.x, point.y);
  };

  const waitForPlayerNearTile = async (x: number, y: number) => {
    await page.waitForFunction(
      ([tx, ty]: [number, number]) => {
        const st = window.__GREENHOLLOW_TEST_HOOKS__?.getState();
        if (!st?.player) return false;
        const targetX = (tx + 0.5) * 32;
        const targetY = (ty + 0.5) * 32;
        const dx = st.player.x - targetX;
        const dy = st.player.y - targetY;
        return Math.sqrt(dx * dx + dy * dy) < 20;
      },
      [x, y],
      { timeout: 20_000 },
    );
  };

  const waitForNode = async (nodeId: string) => {
    await page.waitForFunction(
      (id: string) => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.nodeId === id,
      nodeId,
      { timeout: 10_000 },
    );
  };

  // Elder is at tile (13, 8) in the village.
  await clickTile(13, 8);
  await waitForPlayerNearTile(13, 8);
  await clickTile(13, 8);

  await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === true);

  await waitForNode("n1");
  await page.keyboard.press("KeyE");
  await waitForNode("n2");

  await page.keyboard.press("Digit1");
  await waitForNode("n3");
  await page.keyboard.press("KeyE");
  await waitForNode("n2");

  await page.keyboard.press("Digit2");
  await waitForNode("n4");
  await page.keyboard.press("KeyE");
  await waitForNode("n2");

  await page.keyboard.press("Digit3");
  await waitForNode("end");
  await page.keyboard.press("KeyE");

  await page.waitForFunction(() => window.__GREENHOLLOW_TEST_HOOKS__?.getState()?.dialog?.open === false);
  const finalState = await page.evaluate(() => window.__GREENHOLLOW_TEST_HOOKS__?.getState());
  expect(finalState?.dialog?.open ?? false).toBe(false);
  },
);
