import { defineConfig } from "vite";
import { computeAppVersion } from "./config/version";

const appVersion = computeAppVersion();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});
