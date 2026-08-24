import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const workspace = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
  root,
  resolve: {
    alias: {
      "@scenema/core": workspace("packages/core/src/index.ts"),
      "@scenema/runtime-web": workspace("packages/runtime-web/src/index.ts"),
      "@scenema/presenter": workspace("packages/presenter/src/index.ts"),
      scenema: workspace("packages/scenema/src/index.ts"),
    },
  },
  build: { outDir: workspace("dist/site"), emptyOutDir: true },
});
