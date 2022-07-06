import { beforeEach, describe, expect, it } from "vitest";

import { BaseCrawler } from "../src/index";

const delay = (timeout: number) =>
  new Promise((_resolve) => setTimeout(() => _resolve(true), timeout));

describe("爬虫", () => {
  it("基础配置", async () => {
    const crawler = new BaseCrawler({
      max: 10,
      request: {},
      pages: [
        {
          logo: "",
          name: "名称",
          description: "介绍",
          category: [{ name: "123", url: "" }],
          searchUrl: "",
          request: { "type-pages": 1, w: 2 },
          matches: [
            {
              regexp: /search/,
              paging: { page: 1, size: 10, maxPage: 20 },
              parsers: [{ name: "src", cls: "@img::attr(src)" }]
            },
            { regexp: [/list/, /category/], parsers: [{ name: "src", cls: "@img::attr(src)" }] },
            { regexp: /item/, parsers: [] },
            { regexp: /detail/, parsers: [] },
            { regexp: /detail-2/, parsers: [] },
            {
              request: { "type-matches": 1, w: 1, encode: true, resultEncode: "gbk" },
              regexp: /https\:\/\/www\.bilibili\.com.+/,
              parsers: [{ name: "title", cls: "title::text" }]
            }
          ]
        }
      ]
    });

    crawler.on("onInit", (option) => {
      // console.log("option 1", option);
    });

    crawler.use((_this, { onInit, onBeforeRequest, onAfterRequest }) => {
      onBeforeRequest((request) => {
        // request.url = "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0";
        // request.content = "1231231";
      });

      onAfterRequest(({ content, ...request }) => {
        console.log("request", request.url);
      });
    });

    // crawler
    //   .get("https://www.bilibili.com/", {
    //     regexp: new RegExp("https://www.bilibili.com/"),
    //     parsers: [{ name: "title", cls: "title::text" }]
    //   })
    //   .then(({ content, ...option }) => {
    //     console.log("res", option);
    //   });

    // crawler.get("https://www.bilibili.com/?url=你好").then(({ content, ...option }) => {
    //   console.log("res", option);
    // });

    await delay(1000);

    // crawler.emit("onInit", { w: 1 });

    // await crawler.getUrlData({
    //   url: "https://www.bilibili.com/",
    //   async: {
    //     show: true,
    //     controller: [
    //       { focus: ".nav-search-input" },
    //       { input: "斗罗大陆" },
    //       { click: ".nav-search-btn" },
    //       { wait: 3000 }
    //     ]
    //   }
    // });
  });

  it("get 方法测试", async () => {
    const crawler = new BaseCrawler({ max: 10, request: {}, pages: [] });

    crawler.on("onParserField", (option, callback) => {
      // console.log("onParserField option", option);
      /** 在解析 完成一次Parsers就会 将在这期间所有的函数执行 */
      callback((result) => {
        console.log("result", result);
      });
    });

    const result = await crawler.get("https://www.bilibili.com/", {
      request: {
        "type-matches": 1,
        w: 1,
        encode: true,
        // resultEncode: "gbk",
        async: { show: true }
      },
      regexp: /https\:\/\/www\.bilibili\.com.+/,
      parsers: [
        { name: "title", cls: "title::text" },
        { name: "src", cls: "img::attr(src)" }
      ]
    });

    if (result.status) {
      const { status, content, ...args } = result;
      console.log(args);
    }
  });
});
