import { defineConfig } from "@playwright/test";

const SERVER_PORT = 4173;
const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: !!process.env.CI,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["line"],
  ],
  outputDir: "playwright-artifacts",
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host --port ${SERVER_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
    },
  ],
});
