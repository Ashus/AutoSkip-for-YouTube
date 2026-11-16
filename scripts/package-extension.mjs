import { execFileSync } from "node:child_process";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));

function screenshotBaseUrl() {
  let repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" }).trim();
    repository = remote.startsWith("git@github.com:")
      ? remote.slice("git@github.com:".length)
      : new URL(remote).hostname === "github.com" ? new URL(remote).pathname.slice(1) : "";
    repository = repository.replace(/\.git$/, "").replace(/\/$/, "");
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
    throw new Error("Set GITHUB_REPOSITORY to build documentation image URLs.");
  }
  return `https://raw.githubusercontent.com/${repository}/main/`;
}

export function rewriteScreenshotLinks(markdown, sourcePath, baseUrl) {
  const rewrite = (url) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(url)) return url;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), url));
    return resolved.startsWith("public/assets/screenshots/") ? baseUrl + resolved : url;
  };
  return markdown
    .replace(/(!?\[[^\]]*\]\(\s*<?)([^\s)>]+)(>?)/g, (_, prefix, url, suffix) => prefix + rewrite(url) + suffix)
    .replace(/^(\s*\[[^\]]+\]:\s*<?)([^\s>]+)(>?)/gm, (_, prefix, url, suffix) => prefix + rewrite(url) + suffix)
    .replace(/(<img\b[^>]*\bsrc\s*=\s*["\x27])([^"\x27]+)(["\x27])/gi, (_, prefix, url, suffix) => prefix + rewrite(url) + suffix);
}

async function* markdownFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* markdownFiles(file);
    else if (entry.isFile() && /\.md$/i.test(entry.name)) yield file;
  }
}

export async function packageExtension(directory) {
  const outDir = path.resolve(directory);
  // Restrict cleanup to the two named build outputs.
  if (!["dist", "dist-firefox"].includes(path.relative(root, outDir))) {
    throw new Error("Packaging is restricted to dist and dist-firefox inside this project.");
  }
  await rm(path.join(outDir, "assets/screenshots"), { recursive: true, force: true });
  await writeFile(path.join(outDir, "README.md"), await readFile(path.join(root, "README.md")));
  const baseUrl = screenshotBaseUrl();
  for await (const file of markdownFiles(outDir)) {
    const relative = path.relative(outDir, file).split(path.sep).join("/");
    const sourcePath = relative === "README.md" ? relative : `public/${relative}`;
    const markdown = await readFile(file, "utf8");
    await writeFile(file, rewriteScreenshotLinks(markdown, sourcePath, baseUrl));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const output = process.argv[2];
  if (!["dist", "dist-firefox"].includes(output)) throw new Error("Usage: node scripts/package-extension.mjs dist|dist-firefox");
  await packageExtension(path.join(root, output));
}
