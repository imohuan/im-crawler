import { resolve } from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { Crawler } from "../src/index";

const dirname = resolve(process.cwd(), "datas");

const delay = (timeout: number) =>
  new Promise((_resolve) => setTimeout(() => _resolve(true), timeout));

describe("Spider", () => {
  it("匹配 Targets", async () => {
    const crawler = new Crawler({
      dirname,
      spider: { max: 1 },
      pages: [
        {
          name: "ttt",
          description: "xxxx",
          matches: [
            {
              request: { async: { show: true } },
              regexp: /https\:\/\/www\.bilibili\.com.+/,
              targets: true,
              areas: ["@.bili-header__banner a::attr(href)"],
              parsers: [
                { name: "title", cls: "title::text" },
                { name: "src", cls: "img::attr(src)" }
              ]
            }
          ]
        }
      ]
    });

    crawler.use({
      onBeforeTarget(targets) {
        console.log("onBeforeTarget", targets);
      },
      onAreaTarget(targets) {
        console.log("onAreaTarget", targets);
      },
      onParserTarget(targets) {
        console.log("onParserTarget", targets);
      },
      onAfterTarget(targets) {
        console.log("onAfterTarget", targets);
      },
      onPipeSpider(item) {
        console.log("onPipeSpider", item.data.result);
      }
    });

    crawler.start("https://www.bilibili.com/");
    await delay(30000);
  });
});
