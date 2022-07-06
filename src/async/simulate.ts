import { BrowserWindow } from "electron";
import { defaultsDeep, isArray, isFunction, isNumber, isString } from "lodash-es";
import { devices, KeyInput, Page } from "puppeteer-core";

import { AutoScroll, SimulateOption } from "../typings";
import { cookieParser } from "./helper";

const defaultTimeout = 10 * 1000;

/** 网页所有带有滚动条的容器进行滚动 */
async function autoScroll(page: Page, option: Partial<AutoScroll>) {
  const run = async (option: any) => {
    /** 下面代码都是在网页中执行，所以这里使用不能 Lodash 中的方法 */
    async function autoScroll(ops?: Partial<AutoScroll>) {
      return new Promise((resolve) => {
        const option: AutoScroll = Object.assign(ops || {}, {
          speed: 100,
          distance: 30,
          timeout: 5000
        } as AutoScroll);
        console.log("Get AutoScroll Args:", ops, option);
        // 1. 获取所有包含滚动条的元素
        const elements: any[] = document.querySelectorAll("*") as any;
        const scrollElements = Array.from(elements).filter((element: HTMLElement) => {
          return (
            element.scrollHeight - element.clientHeight >
            document.documentElement.clientHeight * 0.7
          );
        });
        console.log("Get Scroll Element:", scrollElements);
        const currentScrollElement: HTMLElement[] = [];
        // 2. 滚动事件
        const down = (target: HTMLElement) => {
          return new Promise((resolveDown) => {
            let count = 0;
            const startTop = target.scrollTop;
            currentScrollElement.push(target);
            const end = () => {
              const index = currentScrollElement.indexOf(target);
              if (index !== -1) currentScrollElement.splice(index, 1);
              resolveDown(true);
            };
            const scrollDown = () => {
              target.scrollTo(0, target.scrollTop + option.speed);
              if (
                Math.abs(target.scrollHeight - (target.clientHeight + target.scrollTop)) >
                option.distance
              ) {
                requestAnimationFrame(() => {
                  count++;
                  if (count >= 10 && target.scrollTop - startTop < count * option.distance) end();
                  else scrollDown();
                });
              } else end();
            };
            scrollDown();
            setTimeout(() => resolveDown(false), option.timeout);
          });
        };

        // 超时处理
        setTimeout(
          () => resolve({ message: "执行滚动超时！", errorElementList: currentScrollElement }),
          option.timeout
        );

        Promise.all(scrollElements.map((element) => down(element))).then(() => {
          if (currentScrollElement.length > 0)
            return resolve({
              message: "执行滚动存在部分异常",
              errorElementList: currentScrollElement
            });
          else resolve(true);
        });
      });
    }
    return await autoScroll(option);
  };
  await page.waitForFunction(run, {}, option);
}

export class AutoSimulate {
  private page: Page;
  private url: URL;
  private domain: string;
  private window: BrowserWindow;

  constructor(page: Page, window: BrowserWindow) {
    this.page = page;
    this.window = window;
    this.url = new URL(page.url());
    this.domain = this.url.host.replace(/^(www|m)\./, ".");
  }

  /** 自动滚动 */
  async autoScroll(option: SimulateOption["autoScroll"]) {
    await autoScroll(this.page, option);
  }

  /** 用户代理 (服务器能够识别客户使用的操作系统及版本、CPU 类型、浏览器及版本、浏览器渲染引擎) */
  async userAgent(option: SimulateOption["userAgent"]) {
    await this.page.setUserAgent(option);
  }

  /** 模拟设备 会修改UserAgent, 但没有直接设置userAgent优先级高 */
  async device(option: SimulateOption["device"]) {
    await this.page.emulate(devices[option]);
  }

  /** 聚焦 css */
  async focus(option: SimulateOption["focus"]) {
    await this.page.focus(option);
  }

  /** 截图 */
  async screenshot(option: SimulateOption["screenshot"]) {
    await this.page.screenshot(option);
  }

  /** 设置Cookie */
  async setCookie(cookies: SimulateOption["setCookie"]) {
    await this.page.setCookie(...cookieParser(cookies, { domain: this.domain }));
    await this.page.evaluateHandle(
      ({ domain, cookie }) => {
        // console.log(cookie + `;domain=${domain}`);
        document.cookie = cookie + `;domain=${domain}`;
      },
      { cookie: cookies, domain: this.domain }
    );
  }

  /** 删除Cookie */
  async delCookie(cookies: SimulateOption["delCookie"]) {
    await this.page.deleteCookie(cookies.map((m) => ({ name: m, domain: this.domain })));
    await this.page.evaluateHandle(
      ({ delCookie, domain }) => {
        const exp = new Date();
        exp.setTime(exp.getTime() - 100);
        document.cookie = delCookie
          .map((m) => `${m}=-1;domain=${domain}expires=${exp.toUTCString()}`)
          .join(";");
      },
      { delCookie: cookies, domain: this.domain }
    );
  }

  /**
   * 等待 class， 时间， 函数
   * 1. `"Fn::window.innerWidth > 700"`
   * > `Fn::`标志为字符串函数
   * 2. `100000`
   * 3. `() => window.innerWidth < 400`
   * 4. `#id` | `.class`
   * */
  async wait(option: SimulateOption["wait"], timeout: number = defaultTimeout) {
    const waitOption = { timeout };
    const waitFnStr = "Fn::";
    if (isString(option) && option.startsWith(waitFnStr)) {
      await this.page.waitForFunction(option.replace(waitFnStr, ""), waitOption);
    } else {
      if (isFunction(option)) {
        await this.page.waitForFunction(option, waitOption);
      } else if (isString(option)) {
        await this.page.waitForSelector(option, waitOption);
      } else if (isNumber(option)) {
        await this.page.waitForTimeout(option);
      }
    }
  }

  /** 输入 */
  async input(option: SimulateOption["input"]) {
    const { value, delay } = isString(option) ? { value: option, delay: 0 } : option;
    await this.page.keyboard.type(value, { delay });
  }

  /** 点击 */
  async click(option: SimulateOption["click"]) {
    const defaultClick = { button: "left", count: 1, delay: 10 };
    const { cls, button, count, delay } = isString(option)
      ? { cls: option, ...defaultClick }
      : defaultsDeep(option, defaultClick);
    await this.page.click(cls, { button: button, clickCount: count, delay });
  }

  /** 按键模拟 */
  async keyboard(option: SimulateOption["keyboard"]) {
    const { key, type } = isString(option) ? { key: option, type: "press" } : option;
    if (type === "group") {
      const keys = key as KeyInput[];
      if (keys.length === 1) await this.page.keyboard.press(keys[0]);
      if (keys.length >= 2) {
        const first = keys.shift() as any;
        await this.page.keyboard.down(first);
        for (let i = 0; i < keys.length; i++) await this.page.keyboard.press(keys[i]);
        await this.page.keyboard.up(first);
      }
    } else {
      await (this.page.keyboard as any)[type](key);
    }
  }

  /** 节点截图 */
  async screenshotForSelector(option: SimulateOption["screenshotForSelector"]) {
    const { cls, path, margin: _margin, timeout } = option;
    const defaultMargin = { top: 0, left: 0, bottom: 0, right: 0 };
    const margin = defaultsDeep(_margin, defaultMargin);
    await this.page.waitForSelector(cls, { timeout: timeout || defaultTimeout });

    const rectResult: any = await this.page.evaluateHandle((cls) => {
      const r = document.querySelector(cls)!.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }, cls);
    const rect = await rectResult.jsonValue();

    rect.top -= margin.top;
    rect.left -= margin.left;
    rect.width += margin.right;
    rect.height += margin.bottom;

    await this.page.screenshot({
      path,
      quality: 100,
      clip: { x: rect.left + 8, y: rect.top, width: rect.width, height: rect.height }
    });
  }

  /** 插入js */
  async insertJavaScript(option: SimulateOption["insertJavaScript"]) {
    const scriptText: string = option.toString();
    await this.page.evaluateHandle((scriptText) => {
      const oScript = document.createElement("script");
      oScript.innerHTML = scriptText;
      document.body.appendChild(oScript);
    }, scriptText);
  }

  /** 插入css */
  async insertCSS(option: SimulateOption["insertCSS"]) {
    await this.window.webContents.insertCSS(option);
  }

  /** 滑动操作 */
  async move(option: SimulateOption["move"]) {
    const { cls, start, list, steps } = option;
    const moves = isArray(list) ? list : [list];
    let rect: any = { x: 0, y: 0, width: 0, height: 0 };
    if (cls && cls.length > 0) {
      const result = await this.page.evaluateHandle((cls: string) => {
        const dom = document.querySelector(cls);
        const result = (dom as HTMLElement)?.getBoundingClientRect();
        return JSON.parse(JSON.stringify(result));
      }, cls);
      const resultJson = await result?.jsonValue();
      resultJson && (rect = resultJson);
    }
    await this.page.mouse.move(rect.x + start.x, rect.y + start.y);
    await this.page.mouse.down();
    for (let i = 0; i < moves.length; i++) {
      let { x: _x, y: _y } = moves[i];
      if (_x < 0) _x = rect.width + _x;
      if (_y < 0) _y = rect.height + _y;
      await this.page.mouse.move(rect.x + _x, rect.y + _y, { steps });
    }
    await this.page.mouse.up();
  }
}

export function simulate(
  autoSimulate: AutoSimulate,
  option: Partial<SimulateOption> = {}
): Promise<any> {
  return new Promise(async (resolve) => {
    try {
      if (option.wait) await autoSimulate.wait(option.wait, option.waitTimeout || defaultTimeout);
      if (option.setCookie) await autoSimulate.setCookie(option.setCookie);
      if (option.delCookie) await autoSimulate.delCookie(option.delCookie);
      if (option.userAgent) await autoSimulate.userAgent(option.userAgent);
      if (option.device) await autoSimulate.device(option.device);
      if (option.autoScroll) await autoSimulate.autoScroll(option.autoScroll);
      if (option.focus) await autoSimulate.focus(option.focus);
      if (option.screenshot) await autoSimulate.screenshot(option.screenshot);
      if (option.input) await autoSimulate.input(option.input);
      if (option.click) await autoSimulate.click(option.click);
      if (option.keyboard) await autoSimulate.keyboard(option.keyboard);
      if (option.screenshotForSelector)
        await autoSimulate.screenshotForSelector(option.screenshotForSelector);
      if (option.insertJavaScript) await autoSimulate.insertJavaScript(option.insertJavaScript);
      if (option.insertCSS) await autoSimulate.insertCSS(option.insertCSS);
      if (option.move) await autoSimulate.move(option.move);
      resolve(true);
    } catch (e: any) {
      console.log(`AutoSimulate Error: `, e.message, option);
      return resolve({ status: false, error: e.message });
    }
  });
}
