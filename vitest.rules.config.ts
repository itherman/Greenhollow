import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/services/firebase/firestore.rules.test.ts"],
  },
});


