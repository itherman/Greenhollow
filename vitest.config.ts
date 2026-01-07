import { defineConfig } from "vitest/config";
import { computeAppVersion } from "./config/version";

const appVersion = computeAppVersion();

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Requires the Firebase Emulator Suite (run via `npm run test:rules`).
    exclude: ["src/services/firebase/firestore.rules.test.ts"],
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});

