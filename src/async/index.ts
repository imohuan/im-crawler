import { app, BrowserWindowConstructorOptions, session } from "electron";
import { readdirSync, readFileSync } from "fs-extra";
import { defaultsDeep, isArray, isFunction, isString } from "lodash-es";
import { dirname as Dirname, resolve } from "path";
import { Browser } from "puppeteer-core";
import pie from "puppeteer-in-electron";

import { Logger, setOption } from "@imohuan/log";

import { md5, varParseData } from "../helper";
import { AsyncElectronOption } from "../typings";
import { createWindow, getMaxVersion } from "./helper";
import { AutoSimulate, simulate } from "./simulate";

setOption({ label: "Async", objectLen: 100 });

export * from "./helper";

/**
 * 谷歌浏览器插件安装
 * 打开网页: `chrome://extensions/`
 * 复制对应插件ID 作为第一个参数
 * @param id 插件id
 * @returns
 */
export function getChromeExtension(id: string) {
  const pluginPath = resolve(
    process.env.HOME || process.env.USERPROFILE || "",
    "AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions",
    id
  );
  return resolve(pluginPath, getMaxVersion(readdirSync(pluginPath))[0]);
}

/** 推荐测试使用, 获取插件列表，因个别插件有自己独特的配置获取不了名称所以隐藏了 */
export function getChromeExtensions() {
  const dirname: string = resolve(
    process.env.HOME || process.env.USERPROFILE || "",
    "AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions"
  );

  const pluginList: any[] = [];

  Logger.info("插件地址: ", dirname);
  readdirSync(dirname).forEach((pluginName) => {
    const pluginPath = resolve(dirname, pluginName);
    const manifest = resolve(
      pluginPath,
      getMaxVersion(readdirSync(pluginPath))[0],
      "manifest.json"
    );
    const json = JSON.parse(readFileSync(manifest).toString());
    if (!/__(.+)__/.test(json.name)) pluginList.push({ name: json.name, path: Dirname(manifest) });
    Logger.info("manifest", manifest);
  });

  console.info({
    length: pluginList.length,
    names: pluginList.map((m) => m.name),
    detail: pluginList
  });
}

/**
 * 浏览器自动化
 * @param browser 操作实例
 * @param url 目标地址
 * @param option 详细配置
 * @returns 返回HTML
 */
export function asyncHtml(
  browser: Browser,
  url: string,
  _option: Partial<AsyncElectronOption>
): Promise<string> {
  return new Promise(async (res) => {
    const defaultOption: Partial<AsyncElectronOption> = {
      vars: {},
      show: false,
      images: true,
      javascript: true,
      devTool: false,
      filterUrl: [],
      controller: [],
      extensions: [],
      windowOption: {}
    };

    const option = defaultsDeep(_option, defaultOption) as AsyncElectronOption;
    const window = createWindow(
      defaultsDeep(option.windowOption, {
        show: option.show,
        webPreferences: { images: option.images, javascript: option.javascript }
      } as BrowserWindowConstructorOptions)
    );

    /** 配置代理 */
    window.webContents.session.setProxy(
      option?.proxy ? defaultsDeep(option.proxy, { proxyBypassRules: "localhost" }) : {}
    );

    /** 过滤请求，用于加快浏览器渲染的速度 */
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["*://*/*"] },
      (details, callback) => {
        const cancel = option.filterUrl.some((m: string | RegExp) => {
          return isString(m) ? details.url.indexOf(m) !== -1 : m.test(details.url);
        });
        cancel && Logger.info("过滤请求: ", details.url);
        callback({ cancel });
      }
    );

    /** 加载浏览器插件 */
    option.extensions.forEach((extension) => session.defaultSession.loadExtension(extension));

    if (url.startsWith("http")) await window.loadURL(url);
    else await window.loadFile(url);
    if (option.devTool) window.webContents.openDevTools({ mode: "bottom" });

    const start = new Date().getTime();
    const page = await pie.getPage(browser, window);
    const varData: any = defaultsDeep({ url, md5_url: md5(url, 10) }, option.vars);

    const resultFun = async () => {
      if (window.isDestroyed()) return;
      const html = await page.evaluateHandle(() => document.documentElement.innerHTML);
      await window.destroy();
      Logger.info("操作结束，总耗时:", new Date().getTime() - start + "ms");
      res(`<html>${String(html).replace("JSHandle:", "")}</html>`);
    };
    window.on("close", () => resultFun());

    /** 执行自定义异步操作 */
    const controller = option.controller;
    const autoSimulate = new AutoSimulate(page, window);

    const next = async () => {
      if (!controller || (isArray(controller) && controller.length === 0)) return;
      const itemOps = defaultsDeep(controller.shift(), { async: true });
      const parseOps = varParseData(itemOps, varData);
      const start = new Date().getTime();
      if (itemOps.async) await simulate(autoSimulate, parseOps);
      else simulate(autoSimulate, parseOps);
      Logger.info("操作", parseOps, "耗时:", new Date().getTime() - start + "ms");
      if (controller.length > 0) await next();
    };

    await next();

    if (isFunction(option.controllerFun)) {
      await option.controllerFun(autoSimulate);
    }

    resultFun();
  });
}
