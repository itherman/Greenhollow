import { defineConfig, splitVendorChunkPlugin } from "vite";
import { computeAppVersion } from "./config/version";

const appVersion = computeAppVersion();

export default defineConfig({
  plugins: [splitVendorChunkPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    // Keep Phaser/Firebase in their own chunks so the app entry stays small enough for
    // iterative deploys without overwhelming the default 500 kB warning threshold.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("phaser")) return "phaser";
          if (id.includes("firebase")) return "firebase";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
