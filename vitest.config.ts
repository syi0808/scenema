import { fileURLToPath } from "node:url";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ["browser"],
    alias: {
      "@scenema/core": fromRoot("./packages/core/src/index.ts"),
      "@scenema/runtime-web": fromRoot("./packages/runtime-web/src/index.ts"),
      "@scenema/presenter": fromRoot("./packages/presenter/src/index.ts"),
      scenema: fromRoot("./packages/scenema/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    coverage: { reporter: ["text", "json", "html"] },
  },
});
