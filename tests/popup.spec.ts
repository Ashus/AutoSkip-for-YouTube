import { test, expect } from "@playwright/test";
import path from "node:path";

test("the production popup renders and persists settings through extension APIs", async ({ playwright }) => {
  const distPath = path.resolve("dist");
  const context = await playwright.chromium.launchPersistentContext("", {
    channel: "chromium",
    headless: true,
    locale: "en-US",
    args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    await expect.poll(() => worker.evaluate("chrome.storage.sync.get(['blurAds']).then(result => result.blurAds !== undefined)")).toBe(true);
    await worker.evaluate("chrome.storage.sync.set({ watcherEnabled: true, blurAds: false, skipMode: 'assist' })");
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`chrome-extension://${new URL(worker.url()).hostname}/index.html`);
    await expect(page.getByText("Ad Skip Mode", { exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup")).toHaveCSS("display", "flex");
    const off = page.getByRole("radio", { name: "Off", exact: true });
    await off.click();
    await expect(off).toBeChecked();
    await expect.poll(() => worker.evaluate("chrome.storage.sync.get(['skipMode']).then(result => result.skipMode)")).toBe("off");
    const blur = page.getByRole("switch").last();
    await expect(blur).not.toBeChecked();
    await blur.click();
    await expect.poll(() => worker.evaluate("chrome.storage.sync.get(['blurAds']).then(result => result.blurAds)")).toBe(true);
    await page.reload();
    await expect(page.getByRole("radio", { name: "Off", exact: true })).toBeChecked();
    await expect(page.getByRole("switch").last()).toBeChecked();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
