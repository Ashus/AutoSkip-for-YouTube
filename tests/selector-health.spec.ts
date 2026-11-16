import { test, expect } from "@playwright/test";
import { checkLiveSkipControl, waitForYouTubePlayer } from "./helpers/selectorHealth";
import {
  AD_SKIP_SELECTORS, AD_INDICATOR_SELECTORS, FALLBACK_SKIP_SELECTORS,
  OVERLAY_CLOSE_SELECTORS, SURVEY_SKIP_SELECTORS,
} from "../src/extension/shared/skipSelectors";

test("all production selectors have valid CSS syntax", async ({ page }) => {
  const invalid = await page.evaluate((selectors) => selectors.filter((selector) => {
    try { document.querySelectorAll(selector); return false; } catch { return true; }
  }), [...AD_SKIP_SELECTORS, ...SURVEY_SKIP_SELECTORS, ...OVERLAY_CLOSE_SELECTORS,
    ...FALLBACK_SKIP_SELECTORS, ...AD_INDICATOR_SELECTORS]);
  expect(invalid).toEqual([]);
});

test("a hidden player is reported separately from missing ads", async ({ page }) => {
  await page.setContent('<div id="movie_player" hidden><video></video></div>');
  await expect(waitForYouTubePlayer(page, 250)).rejects.toThrow("YouTube player unavailable before ad observation");
});

test("a visible player can proceed to ad observation", async ({ page }) => {
  await page.setContent('<div id="movie_player"><video></video></div>');
  await expect(waitForYouTubePlayer(page, 1000)).resolves.toBeUndefined();
});

test("selector health checks require a matching real control", async ({ page }) => {
  await page.setContent('<div id="movie_player" class="ad-showing"><button class="ytp-skip-ad-button">Skip</button></div>');
  expect((await checkLiveSkipControl(page, undefined, 1000)).matches).toContain(".ytp-skip-ad-button");
});

test("selector health checks reject renamed skip controls", async ({ page }) => {
  await page.setContent('<div id="movie_player" class="ad-showing"><button class="new-youtube-skip">Skip</button></div>');
  await expect(checkLiveSkipControl(page, undefined, 1000)).rejects.toThrow("not matched by AD_SKIP_SELECTORS");
});

test("selector health checks reject renamed ad state classes", async ({ page }) => {
  await page.setContent('<div id="movie_player" class="new-ad-state"><button class="ytp-skip-ad-button">Skip</button></div>');
  await expect(checkLiveSkipControl(page, undefined, 1000)).rejects.toThrow("ad classes used for muting are missing");
});

for (const opacity of [0, 0.2]) {
  test(`selector health checks ignore controls hidden by ancestor opacity ${opacity}`, async ({ page }) => {
    await page.setContent(`<div id="movie_player" class="ad-showing">
      <div style="opacity: ${opacity}"><div style="opacity: 0.2">
        <button class="ytp-skip-ad-button" style="opacity: 1">Skip</button>
      </div></div>
      <button class="renamed-visible-skip">Skip</button>
    </div>`);
    // The hidden old control must not hide a selector mismatch on the visible one.
    await expect(checkLiveSkipControl(page, undefined, 1000)).rejects.toThrow("not matched by AD_SKIP_SELECTORS");
  });
}

test("selector health checks accept controls with visible ancestor opacity", async ({ page }) => {
  await page.setContent('<div id="movie_player" class="ad-showing" style="opacity: 0.5"><div style="opacity: 0.5"><button class="ytp-skip-ad-button">Skip</button></div></div>');
  expect((await checkLiveSkipControl(page, undefined, 1000)).matches).toContain(".ytp-skip-ad-button");
});

test("a run without a skippable ad cannot report healthy selectors", async ({ page }) => {
  await page.setContent('<div id="movie_player"><button>Skip intro</button><button style="display:none">Skip</button></div>');
  await expect(checkLiveSkipControl(page, undefined, 250)).rejects.toThrow("INCONCLUSIVE");
});
