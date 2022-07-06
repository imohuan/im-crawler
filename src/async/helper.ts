import { app, BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { defaultsDeep, isArray, isString } from "lodash-es";
import puppeteer from "puppeteer-core";
import pie from "puppeteer-in-electron";
import semver from "semver";
import { CookieParam } from "typings";

/** 创建窗口 */
export const createWindow = (option?: BrowserWindowConstructorOptions): BrowserWindow => {
  return new BrowserWindow(
    defaultsDeep(option, {
      width: 1700,
      height: 800,
      show: false,
      webPreferences: {
        webSecurity: false,
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        nodeIntegrationInSubFrames: true,
        allowRunningInsecureContent: true,
        javascript: true,
        images: true,
        disableDialogs: true
      }
    } as BrowserWindowConstructorOptions)
  );
};

/** 初始化 Puppeteer */
export const initElectronContent = async (): Promise<any> => {
  await pie.initialize(app);
  return await pie.connect(app, puppeteer as any);
};

/**
 * 获取最大版本号
 * @param versions 版本列表
 * @returns [最大原来版本号， 最大用来比较的版本号]
 */
export function getMaxVersion(versions: string[]): string[] {
  return versions
    .map((m) => [m, semver.valid(semver.coerce(m)) || "0.0.0"])
    .sort(([_, a], [__, b]) => (semver.lt(a, b) ? 1 : -1))[0];
}

/**
 * 解析Cookie
 * @param cookie Cookie
 * @param option 其他参数
 * @returns { name, value, ...option }
 */
export function cookieParser(cookie: CookieParam, option: any = {}): CookieParam {
  if (isString(cookie)) {
    return cookie
      .split(";")
      .filter((f) => f)
      .map((item) => {
        const [key, value] = item.split("=");
        return { name: key?.trim(), value: value?.trim(), expires: 60 * 60 * 240, ...option };
      }) as CookieParam[];
  }
  return isArray(cookie) ? cookie : [cookie];
}
