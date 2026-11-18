import { defineConfig } from "tsup";

// Bundles the server into dist/. Workspace packages (@dd/db, @dd/shared) are TypeScript
// source, so they are bundled in; npm dependencies stay external and come from node_modules.
export default defineConfig({
  entry: { server: "src/server.ts", "bootstrap-main-admin": "src/scripts/bootstrap-main-admin.ts" },
  format: "esm",
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@dd\//],
  // Bundled CommonJS code (e.g. the pg driver inside @dd/db) calls require(); give ESM one.
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
});
