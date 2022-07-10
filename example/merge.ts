import { resolve } from "path";

import { Crawler, StorePlugin } from "../src/index";

const crawler = new Crawler({
  dirname: resolve(__dirname, "datas"),
  spider: { max: 2 },
  pages: [
    {
      name: "bilibili",
      description: "xxxx",
      matches: [
        {
          name: "main-list",
          // request: { async: { show: true } },
          regexp: /http:\/\/localhost:3344\/index.+/,
          // parsers: [
          //   { name: "title", cls: "title::text" },
          //   { name: "src", cls: "img::attr(src)" }
          // ]
          merger: "list-1.list-2.list-3",
          parsers: [
            {
              name: "list-1",
              parent: ".list-1 > li",
              children: [
                {
                  name: "list-2",
                  parent: ".list-2 > li",
                  children: [
                    {
                      name: "list-3",
                      parent: ".list-3 > li",
                      children: [
                        { name: "title", cls: ".title::text", unique: true },
                        { name: "next", cls: ".target::attr(href)", target: true }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: "detail-1",
          regexp: /http:\/\/localhost:3344\/test.+/,
          parsers: [{ name: "detail-name", cls: ".name::text", unique: true }]
        }
        // #region dd
        // {
        //   // list
        //   // -> [{},{}]
        //   parsers: [{ name: "list", parent: "", children: [{ name: "title", cls: "title::text" }] }]
        // },
        // {
        //   // list-1.list-2.list-3
        //   // -> [{,[,[]]}]
        //   parsers: [
        //     {
        //       name: "list-1",
        //       parent: "",
        //       children: [
        //         {
        //           name: "list-2",
        //           parent: "",
        //           children: [
        //             {
        //               name: "list-3",
        //               parent: "",
        //               children: [{ name: "list-1", parent: "", children: [] }]
        //             }
        //           ]
        //         }
        //       ]
        //     }
        //   ]
        // }
        // #endregion
      ]
    }
  ]
});

crawler.use(StorePlugin);
// crawler.start("https://www.bilibili.com/");
crawler.start("http://localhost:3344/index.html");
