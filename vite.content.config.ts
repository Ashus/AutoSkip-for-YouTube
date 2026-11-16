import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    target: ["chrome107", "edge107", "firefox104", "safari16"],
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(import.meta.dirname, "src/extension/content.ts"),
      name: "AutoSkipContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rolldownOptions: {
      output: {
        extend: true,
      },
    },
  },
});
