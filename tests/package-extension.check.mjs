import { test } from "node:test";
import assert from "node:assert/strict";
import { rewriteScreenshotLinks } from "../scripts/package-extension.mjs";

const base = "https://raw.githubusercontent.com/example/fork/main/";

test("packaged Markdown rewrites screenshot links but keeps unrelated links", () => {
  const source = "![Preview](public/assets/screenshots/preview.png)\n[Source](src/App.tsx)\n![External](https://example.com/test.png)\n![Icon](public/assets/icons/icon128.png)";
  const result = rewriteScreenshotLinks(source, "README.md", base);
  assert.ok(result.includes(`![Preview](${base}public/assets/screenshots/preview.png)`));
  assert.ok(result.includes("[Source](src/App.tsx)"));
  assert.ok(result.includes("![External](https://example.com/test.png)"));
  assert.ok(result.includes("![Icon](public/assets/icons/icon128.png)"));
});

test("packaged Markdown supports nested paths, reference images and HTML images", () => {
  const source = '![Preview][preview]\n[preview]: ../assets/screenshots/preview.png\n<img src="../assets/screenshots/preview.png">\n![Inline](<../assets/screenshots/preview.png> "Preview")';
  const result = rewriteScreenshotLinks(source, "public/docs/guide.md", base);
  assert.equal(result.split(base + "public/assets/screenshots/preview.png").length - 1, 3);
});
