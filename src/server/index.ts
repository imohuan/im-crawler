import { app as electronApp, BrowserWindow } from "electron";
import { createPool } from "generic-pool";
import { app, KoaErrors, LogLevels } from "koa-micro-ts";
import { isString } from "lodash-es";

import { asyncHtml, initElectronContent } from "../async";
import { queryParser } from "../helper";
import { AsyncElectronOption } from "../typings";

export const createRouter = () => {};

export const createServer = async (max = 10, port: number = 4445) => {
  const pool = createPool({ create: async () => [], destroy: async () => {} }, { max });
  const browser = await initElectronContent();

  app.logger({ level: LogLevels.all });
  app.bodyParser({ multipart: true });

  app.apiDoc = "/api/doc";

  // app.helmet();
  app.cors();
  app.catchErrors();

  // app.static(resolve(__dirname, "..", "public"));

  // Electron 获取网页异步源码返回
  // ------------------------------------------------------------------------------
  type AsyncStatus = { status: boolean; content: any };
  const getAsync = (url: string, option: AsyncElectronOption): Promise<AsyncStatus> => {
    console.log("option", option);
    return new Promise(async (resolve) => {
      pool
        .acquire()
        .then(async (client: any) => {
          const content = await asyncHtml(browser, url, option);
          resolve({ status: true, content });
          pool.release(client);
        })
        .catch((e: any) => {
          resolve({ status: false, content: e.message });
        });
    });
  };

  const autoResult = (ctx: any, state: AsyncStatus) => {
    if (state.status) ctx.body = { length: state.content.length, content: state.content };
    else {
      const error: KoaErrors = new Error(`获取页面发生不可控错误`);
      error.code = "Error_001";
      error.description = state.content;
      throw error;
    }
  };

  const router = app.newRouter();

  /**
   * 案例: http://localhost:4445/?show=true&url=https://www.bilibili.com/&controller=focus:.nav-search-input,input:abc
   */
  router.get("/", async (ctx: any): Promise<any> => {
    const { url, ...option } = ctx.query;
    console.log("option", option);
    if (url.length === 0) return (ctx.body = { message: "url不能为空！" });
    if (option?.controller && isString(option.controller)) {
      option.controller = queryParser(option.controller);
    }
    autoResult(ctx, await getAsync(url, option));
  });

  router.post("/", async (ctx: any): Promise<any> => {
    const { url, option } = ctx.request.body;
    if (url.length === 0) return (ctx.body = { message: "url不能为空！" });
    autoResult(ctx, await getAsync(url, option));
  });
  app.useRouter(router);
  // ------------------------------------------------------------------------------

  app.gracefulShutdown({ finally: () => app.log.info("Server gracefully terminated") });
  app.start(port);
  app.log.info(`服务启动, Url: http://localhost:${port}`);
};

export const startElectronService = () => {
  createServer();
  electronApp.on("ready", () => {
    // 避免后台直接挂掉
    new BrowserWindow({ show: false });
  });
};
