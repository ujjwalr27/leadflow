import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // A non-UTC, half-hour offset zone makes "today" / midnight edge cases meaningful.
    env: { TZ: "Asia/Kolkata" },
  },
});
