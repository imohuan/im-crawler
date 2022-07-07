import { resolve } from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { Crawler, FileFsPlugin } from "../src/index";

const dirname = resolve(process.cwd(), "datas");

const delay = (timeout: number) =>
  new Promise((_resolve) => setTimeout(() => _resolve(true), timeout));

describe("插件测试", () => {
  it("本地文件缓存", async () => {
    const crawler = new Crawler({ dirname, pages: [] });
    crawler.use(FileFsPlugin);
    const result = await crawler.get("https://www.bilibili.com/", {
      request: { async: { show: true } },
      regexp: /https\:\/\/www\.bilibili\.com.+/,
      parsers: [
        { name: "title", cls: "title::text" },
        { name: "src", cls: "img::attr(src)" }
      ]
    });
    console.log(Object.keys(result));
  });
});
