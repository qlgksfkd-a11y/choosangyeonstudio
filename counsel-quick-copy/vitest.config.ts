import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.global.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "mysql://counsel:counsel@localhost:3306/counsel_test",
      SESSION_SECRET: "test-secret-test-secret-test-secret",
      UPLOAD_DIR: path.resolve(import.meta.dirname, ".data/test-uploads"),
    },
  },
});
