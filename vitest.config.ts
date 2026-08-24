import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@scenema/core": fromRoot("./packages/core/src/index.ts"),
      "@scenema/runtime-web": fromRoot("./packages/runtime-web/src/index.ts"),
      "@scenema/actorble": fromRoot("./packages/actor-actorble/src/index.ts"),
      "@scenema/presenter": fromRoot("./packages/presenter/src/index.ts"),
      scenema: fromRoot("./packages/scenema/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    coverage: { reporter: ["text", "json", "html"] },
  },
});
