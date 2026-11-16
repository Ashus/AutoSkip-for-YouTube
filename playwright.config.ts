import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  projects: [
    { name: "regression", testIgnore: "**/selectors.spec.ts" },
    { name: "youtube-live", testMatch: "**/selectors.spec.ts" },
  ],
  timeout: 120000,
  retries: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    browserName: "chromium",
    channel: "chromium",
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  workers: 1,
});
