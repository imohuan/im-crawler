import { resolve } from "path";
import { CacheFsPlugin, Crawler, DownloadPlugin, StorePlugin } from "../src/index";
import { isNumber } from "lodash-es";

const formatNumber = (str: string, parse = parseFloat) => {
  str = String(str);
  const w: string = /[a-z]/.exec(str.toLowerCase().slice(-1)[0]) as any;
  if (!w) return parse(str);
  else return parse(str.replace(w + "", "")) * (w[0] === "k" ? 1000 : w[0] === "w" ? 10000 : 0);
};

const crawler = new Crawler({
  dirname: resolve(__dirname, "datas"),
  pool: { max: 30 },
  spider: { max: 0 },
  cycleLen: 10,
  pages: [
    {
      name: "18comic",
      description: "漫画解析",
      matches: [
        {
          name: "list",
          merger: "main-list",
          regexp: /https\:\/\/jmcomic\.city\/albums\?o=mv/,
          parsers: [
            {
              name: "main-list",
              parent: ".container .row .list-col",
              children: [
                { name: "title", cls: ".video-title::text", unique: true },
                { name: "author", cls: ".title-truncate a::text" },
                { name: "categorys", cls: "@.category-icon div::text", rules: ["trim"] },
                { name: "tags", cls: "@.tags .tag::text" },
                { name: "date", cls: ".video-views::text", rules: ["trim"] },
                {
                  name: "like",
                  cls: ".label-loveicon span::text",
                  type: "integer",
                  processing: (data) => formatNumber(data, parseInt)
                },
                {
                  name: "src",
                  cls: ".thumb-overlay-albums img::attr(data-original)|.thumb-overlay-albums img::attr(src)",
                  unique: true,
                  download: true
                },
                {
                  name: "detail",
                  cls: ".thumb-overlay-albums > a::attr(href)",
                  target: true,
                  unique: true
                }
              ],
              processing: (list: any[]) => {
                return list?.filter((item) => {
                  return item?.title && item?.src;
                });
              }
            },
            {
              name: "next",
              cls: "@.pagination li a::text",
              target: true,
              processing: (data, option) => {
                if (!data) return null;
                const params = new URLSearchParams(option.search);
                const page = parseInt(params.get("page") + "") || 1;
                const maxPage = parseInt(data.filter((f: any) => /\d+/.exec(f)).slice(-1)[0]);
                if (page >= maxPage) return null;
                if (!page || !isNumber(page)) return null;
                // if (page >= 750) return null;

                const nextPage = Array.from({ length: 10 }, (_, index) => page + index + 1).map(
                  (m) => `${option.origin}${option.pathname}?o=mv&page=${m}`
                );
                // const nextPage = `${option.origin}${option.pathname}?o=mv&page=${page + 1}`;
                return nextPage;
              }
            }
          ]
        },
        {
          name: "detail",
          regexp: /https\:\/\/jmcomic\.city\/album\/\d+/,
          parsers: [
            {
              unique: true,
              name: "comic_id",
              cls: ".train-number .number::text",
              processing: (data) => data?.split("：")[1]
            },
            { name: "eyes", cls: ".fa-eye + span::text", rules: ["int"], type: "integer" },
            {
              name: "create_date",
              cls: ".p-t-5.float-left::text",
              processing: (data) => /(\d+-\d+-\d+)/.exec(data)?.[1] + ""
            },
            {
              name: "update_date",
              cls: ".p-t-5.float-right::text",
              processing: (data) => /(\d+-\d+-\d+)/.exec(data)?.[1] + ""
            },
            {
              name: "page_count",
              cls: ".train-number .pagecount::text",
              processing: (data) => parseInt(/(\d+)/.exec(data)?.[0] + "")
            },
            { name: "authors", cls: "@.nav-tab-content span[data-type=author] a::text" },
            {
              name: "author_works",
              cls: "@.nav-tab-content span[data-type=works] a::text"
            },
            { name: "read", cls: ".reading::attr(href)" }
          ]
        }
      ]
    }
  ]
});

crawler.use(StorePlugin());
crawler.use(CacheFsPlugin);
crawler.use(DownloadPlugin("default"));
// crawler.start("https://jmcomic.city/albums?o=mv&page=1316");
