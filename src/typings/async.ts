import { BrowserWindowConstructorOptions, Config } from "electron";
import { KeyInput, MouseButton, ScreenshotOptions } from "puppeteer-core";

import { AutoSimulate } from "../async/simulate";

export interface AutoScroll {
  /** 滚动速度 */
  speed: number;
  /** 距离限制 */
  distance: number;
  /** 超时时间 */
  timeout: number;
}

export type CookieParam = any;
export type Position = { x: number; y: number };

export interface SimulateOption {
  /** 是否异步执行 */
  async: boolean;
  /** 自动滚动 */
  autoScroll: Partial<AutoScroll>;
  /** 按键模拟 */
  keyboard:
    | { type: "down" | "press" | "up"; key: KeyInput }
    | { type: "group"; key: KeyInput[] }
    | KeyInput; // key默认type为Group
  /** 聚焦 css */
  focus: string;
  /** 输入 */
  input: { value: string; delay: number } | string;
  /** 点击 */
  click: { cls: string; button?: MouseButton; count?: number; delay?: number } | string;
  /**
   * 等待 class， 时间， 函数
   * 1. `"Fn::window.innerWidth > 700"`
   * > `Fn::`标志为字符串函数
   * 2. `100000`
   * 3. `() => window.innerWidth < 400`
   * 4. `#id` | `.class`
   * */
  wait: string | number | Function;
  /** 指定wait超时时间 */
  waitTimeout: number;

  /** 截图 */
  screenshot: ScreenshotOptions;
  /** 插入js */
  insertJavaScript: string | Function;
  /** 插入css */
  insertCSS: string;

  /** 设置Cookie */
  setCookie: string;
  /** 删除Cookie */
  delCookie: string[];

  /** 用户代理 (服务器能够识别客户使用的操作系统及版本、CPU 类型、浏览器及版本、浏览器渲染引擎) */
  userAgent: string;
  /** 模拟设备 会修改UserAgent, 但没有直接设置userAgent优先级高 */
  device: Device;

  /** 节点截图 */
  screenshotForSelector: {
    /** 节点class */
    cls: string;
    /** 保存地址 */
    path: string;
    /** 检测 节点cls 超时时间 */
    timeout?: number;
    /** 裁剪 外边偏移 */
    margin?: { left: number; top: number; bottom: number; right: number };
  };

  /** 滑动操作 */
  move: { cls?: string; start: Position; list: Position | Position[]; steps?: number };
}

export type AsyncElectronOption = {
  /** 是否显示窗口 */
  show: boolean;
  /** 代理 */
  proxy: Config;
  /** 过滤网页发送的URL */
  filterUrl: (RegExp | string)[];
  /** 操作 */
  controller: Partial<SimulateOption>[];
  /** 操作函数 */
  controllerFun: (autoSimulate: AutoSimulate) => Promise<any>;
  /** 是否开启开发者工具 */
  devTool: boolean;
  /** 变量 */
  vars: any;
  /** 是否加载图片 */
  images: boolean;
  /** 是否加载js */
  javascript: boolean;
  /** electron 插件加载 */
  extensions: string[];
  /** electron 窗口配置 */
  windowOption: BrowserWindowConstructorOptions;
};

// prettier-ignore
const deviceList =  ["Blackberry PlayBook","Blackberry PlayBook landscape","BlackBerry Z30","BlackBerry Z30 landscape","Galaxy Note 3","Galaxy Note 3 landscape","Galaxy Note II","Galaxy Note II landscape","Galaxy S III","Galaxy S III landscape","Galaxy S5","Galaxy S5 landscape","Galaxy S8","Galaxy S8 landscape","Galaxy S9+","Galaxy S9+ landscape","Galaxy Tab S4","Galaxy Tab S4 landscape","iPad","iPad landscape","iPad (gen 6)","iPad (gen 6) landscape","iPad (gen 7)","iPad (gen 7) landscape","iPad Mini","iPad Mini landscape","iPad Pro","iPad Pro landscape","iPad Pro 11","iPad Pro 11 landscape","iPhone 4","iPhone 4 landscape","iPhone 5","iPhone 5 landscape","iPhone 6","iPhone 6 landscape","iPhone 6 Plus","iPhone 6 Plus landscape","iPhone 7","iPhone 7 landscape","iPhone 7 Plus","iPhone 7 Plus landscape","iPhone 8","iPhone 8 landscape","iPhone 8 Plus","iPhone 8 Plus landscape","iPhone SE","iPhone SE landscape","iPhone X","iPhone X landscape","iPhone XR","iPhone XR landscape","iPhone 11","iPhone 11 landscape","iPhone 11 Pro","iPhone 11 Pro landscape","iPhone 11 Pro Max","iPhone 11 Pro Max landscape","iPhone 12","iPhone 12 landscape","iPhone 12 Pro","iPhone 12 Pro landscape","iPhone 12 Pro Max","iPhone 12 Pro Max landscape","iPhone 12 Mini","iPhone 12 Mini landscape","iPhone 13","iPhone 13 landscape","iPhone 13 Pro","iPhone 13 Pro landscape","iPhone 13 Pro Max","iPhone 13 Pro Max landscape","iPhone 13 Mini","iPhone 13 Mini landscape","JioPhone 2","JioPhone 2 landscape","Kindle Fire HDX","Kindle Fire HDX landscape","LG Optimus L70","LG Optimus L70 landscape","Microsoft Lumia 550","Microsoft Lumia 950","Microsoft Lumia 950 landscape","Nexus 10","Nexus 10 landscape","Nexus 4","Nexus 4 landscape","Nexus 5","Nexus 5 landscape","Nexus 5X","Nexus 5X landscape","Nexus 6","Nexus 6 landscape","Nexus 6P","Nexus 6P landscape","Nexus 7","Nexus 7 landscape","Nokia Lumia 520","Nokia Lumia 520 landscape","Nokia N9","Nokia N9 landscape","Pixel 2","Pixel 2 landscape","Pixel 2 XL","Pixel 2 XL landscape","Pixel 3","Pixel 3 landscape","Pixel 4","Pixel 4 landscape","Pixel 4a (5G)","Pixel 4a (5G) landscape","Pixel 5","Pixel 5 landscape","Moto G4","Moto G4 landscape"] as const

export type Device = typeof deviceList[number];
