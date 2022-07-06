import { beforeEach, describe, expect, it } from "vitest";
import {
  getMaxVersion,
  getChromeExtension,
  getChromeExtensions,
  initElectronContent,
  asyncHtml
} from "../src/index";

describe("测试", () => {
  it("插件获取", async () => {
    expect(getMaxVersion(["1.2.3", "42.6.7.9.3-alpha", "5.0.1", "^7.0.1"])).toEqual([
      "42.6.7.9.3-alpha",
      "42.6.7"
    ]);
    expect(getMaxVersion(["1.2.3", "^7.0.1_0"])).toEqual(["^7.0.1_0", "7.0.1"]);
    getChromeExtensions();
    console.log(getChromeExtension("bgnkhhnnamicmpeenaelnjfhikgbkllg"));
  });
});
