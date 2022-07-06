import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    deps: {
      inline: ["@imohuan/log", "im-selector"]
    }
  }
});
