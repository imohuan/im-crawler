import { builtinModules } from "node:module";
import { resolve } from "path";
import { defineConfig, UserConfigExport } from "vite";
import Dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const option: UserConfigExport = {
    clearScreen: true,
    optimizeDeps: {
      extensions: [".ts", ".js"]
    },
    build: {
      outDir: resolve(__dirname, "./dist"),
      assetsDir: "",
      emptyOutDir: true,
      lib: {
        entry: resolve(__dirname, "./src/index.ts"),
        formats: ["cjs", "es"],
        name: "crawler",
        fileName: (format) => `lib-${format}.js`
      },
      rollupOptions: {
        external: builtinModules.concat([
          "chalk",
          "electron",
          "axios",
          "axios-retry",
          "random-useragent",
          "generic-pool",
          "iconv-lite",
          "puppeteer-core",
          "puppeteer-in-electron",
          "im-selector",
          "@imohuan/log",
          "koa-micro-ts"
        ])
      }
    },
    plugins: []
  };

  if (mode === "production") {
    /** https://github.com/qmhc/vite-plugin-dts/blob/HEAD/README.zh-CN.md */
    // option.plugins!.push(
    //   Dts({
    //     outputDir: resolve(__dirname, "dist/types"),
    //     skipDiagnostics: false,
    //     logDiagnostics: true
    //   })
    // );
  }

  return option;
});
