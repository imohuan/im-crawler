import { createPool, Pool } from "generic-pool";
import iconv from "iconv-lite";
import { getSelector } from "im-selector";
import {
  defaultsDeep,
  get,
  isArray,
  isEmpty,
  isFunction,
  isString,
  omit,
  pick,
  set
} from "lodash-es";
import mitt from "mitt";
import { resolve } from "path";

import { Logger } from "@imohuan/log";

import axios from "../helper/axios";
import {
  CrawlerOption,
  Emitter,
  GetResultError,
  GetResultSuccess,
  Global,
  HttpRequest,
  MatchOption,
  Page,
  PluginFunction,
  PluginOption,
  SpiderCache
} from "../typings";

export class Crawler<T> {
  /** 日志 */
  log: Logger;
  /** Crawler配置 */
  option: CrawlerOption;
  /** 函数池 */
  private pool: Pool<any>;
  /** 是否进行了init */
  private isInit: boolean;

  /** 安装的插件 */
  private plugins: PluginOption[];
  private emitter: Emitter<PluginOption>;
  private global: T;

  /** 缓存Spider的当前状态 */
  private spiderCache: SpiderCache;

  constructor(
    option: Partial<CrawlerOption> & Pick<CrawlerOption, "pages">,
    global: T = {} as any
  ) {
    this.plugins = [];
    this.isInit = false;
    this.emitter = mitt<PluginOption>();
    this.global = global;
    this.spiderCache = {};
    const cwd = option?.dirname ?? process.cwd();
    const defaultOption: Partial<CrawlerOption> = {
      max: 0,
      pool: { min: 1, max: 20 },
      spider: { max: 0 },
      asyncUrl: "http://localhost:4445/",
      dirname: cwd,
      log: { label: "Crawler", dirname: resolve(cwd, "logs") },
      request: { encode: true, cache: true }
    };
    this.option = defaultsDeep(option, defaultOption);
    this.log = new Logger(this.option.log);
    this.pool = createPool({ create: async () => [], destroy: async () => {} }, this.option.pool);
  }

  /** 初始化 */
  async init() {
    if (this.isInit) return;
    this.isInit = true;
    await this.emit("onInit", this.option);
  }

  /**
   * 配置插件
   * @param plugin 插件配置
   */
  use(plugin: Partial<PluginOption> | PluginFunction<PluginOption>) {
    if (isFunction(plugin)) {
      const result: any = {};
      const _get = (_: any, prop: any) => (fn: Function) => set(result, prop, fn);
      const option: any = new Proxy({}, { get: _get });
      plugin(this, option);
      this.plugins.push(result);
    } else this.plugins.push(plugin as PluginOption);
  }

  /** 监听插件中的事件 */
  on<K extends keyof PluginOption>(
    name: K,
    callback: (...args: Parameters<PluginOption[K]>) => void
  ) {
    this.emitter.on(name, (args: any) => {
      if (isArray(args)) callback(...(args as any));
    });
  }

  /**
   * 执行所有插件匹配的方法
   * @param name 声明周期名称
   * @param args 所需参数
   * @returns
   */
  protected async emit<K extends keyof PluginOption>(
    name: K,
    ...args: Parameters<PluginOption[K]>
  ): Promise<any> {
    this.emitter.emit(name, args as any);
    const funcList: Function[] = this.plugins
      .map((plugin) => get(plugin, name, false))
      .filter((f) => f) as any;
    let result: any = null;
    const call = async (func: Function | undefined) => {
      if (!func) return;
      try {
        result = await func(...args);
      } catch (e: any) {
        console.error(`插件报错: ${e.message}`);
      }
      await call(funcList.shift());
    };
    funcList.length > 0 && (await call(funcList.shift()));
    return result;
  }

  /** 使用 Axios 请求 */
  private async getUrlForAxios(request: HttpRequest): Promise<any> {
    return new Promise((_resolve) => {
      axios(request)
        .then((rep) => _resolve(rep.data))
        .catch((error) => {
          this.log.error(`Axios Error: ${error.message}`);
          _resolve(false);
        });
    });
  }

  /** 使用 后台服务（Electron）的接口服务 */
  private async getUrlForAsync(request: HttpRequest): Promise<any> {
    return new Promise((_resolve) => {
      axios({
        url: this.option.asyncUrl,
        method: "post",
        data: { url: request.url, option: request.async }
      })
        .then((rep) => _resolve(rep.data?.content || ""))
        .catch((error) => {
          this.log.error(`ElectronAxios Error: ${error.message}`);
          _resolve(false);
        });
    });
  }

  /** 获取 URL 对应的数据（HTML，JSON） */
  protected async getUrlData(request: HttpRequest): Promise<string> {
    await this.emit("onBeforeRequest", request);
    let content: any = get(request, "content", "");
    if (!(content && isString(content) && content.length > 0)) {
      if (request.async) content = await this.getUrlForAsync(request);
      else content = await this.getUrlForAxios(request);
    }
    if (request?.resultEncode) content = iconv.encode(content, request.resultEncode).toString();
    request.content = content;
    await this.emit("onAfterRequest", request);
    return content;
  }

  /** 查询 匹配当前URL的配置 */
  protected getUrlMatchList = (url: string): MatchOption[] => {
    return this.option.pages
      .map((m) => {
        const result = m.matches.map((m1) => {
          m1.request = defaultsDeep({}, m1.request, m.request);
          return defaultsDeep({ __parent: m, __page: m }, m1);
        });
        return result;
      })
      .flat()
      .filter((f) => {
        const regexps: RegExp[] = isArray(f.regexp) ? f.regexp : ([f.regexp] as RegExp[]);
        return regexps.some((regexp) => regexp && regexp.test(url));
      });
  };

  protected getUrlMatchFirst(url: string, matchOption: any = null) {
    if (!matchOption || matchOption?.parsers.length === 0) {
      const matchOptions = this.getUrlMatchList(url);
      if (matchOptions.length > 1) {
        this.log.warn(
          `你的 Regexp 或者 Origin 匹配到多个配置\n${JSON.stringify(matchOptions, null, 2)}`
        );
      }
      if (matchOptions.length === 0) return null;
      return matchOptions[0];
    }
    return matchOption;
  }

  /**
   * 获取URL源码
   * @param url URL地址
   * @param matchOption 可选: 指定url使用的配置, 如果没有则在matches中寻找(通过regexp属性)
   * @returns Promise<GetResult>
   */
  public get(
    url: string,
    matchOption: MatchOption = { parsers: [] }
  ): Promise<GetResultError | GetResultSuccess> {
    return new Promise((resolve) => {
      this.pool.acquire().then(async (client) => {
        const startTime = new Date().getTime();
        this.log.info(`开始获取: ${url}`);
        // 1. 获取match's中匹配url的otion
        const urlOption = new URL(url);
        /** 初始化 MatchOption 数据 */

        matchOption = this.getUrlMatchFirst(url, matchOption);
        if (!matchOption) return resolve({ status: false, message: "获取页面对应爬虫配置失败！" });

        // 2. 获取网页源码
        const request: HttpRequest = defaultsDeep(
          { url },
          get(matchOption, "request", {}),
          this.option.request
        );

        if (request?.encode && request?.url) request.url = encodeURI(request.url);
        const content = await this.getUrlData(request);

        if (!content || isEmpty(content)) {
          this.log.warn(`获取页面数据失败！`);
          resolve({ status: false, message: "获取页面数据失败！" });
        }

        // 3. 解析数据
        const targets: string[] = [];
        const selector = getSelector<Global<T>>(content, {
          request,
          matchOption,
          ...urlOption,
          ...this.global
        });

        /** 存储回调函数 */
        const callbacks: any[] = [];
        // 用于 onParserField 中获取 解析后的数据
        selector.on("files", (option) => {
          const { keys, value, option: itemOption } = option;
          // key value keys filterKeys data
          if (keys.indexOf("target") && get(itemOption, "target", false)) {
            let values = isArray(value) ? value : [value];
            values = values
              .filter((f) => f && isString(f))
              .map((m) => (m.startsWith("/") ? `${urlOption.origin}${m}` : m));
            targets.push(...values);
          }
          this.emit("onParserField", option, (callback: any) => callbacks.push(callback));
        });

        this.emit("onBeforeParser", { selector, matchOption });
        const result = selector.queryData(matchOption?.parsers || []);
        if (callbacks.length > 0) {
          callbacks.forEach((callback) => {
            try {
              isFunction(callback) && callback(result);
            } catch (e: any) {
              this.log.error("onParserField Error: ", e.message, "function: ", callback.toString());
            }
          });
        }
        const resultData = { content, selector, matchOption, result, targets };
        this.emit("onAfterParser", resultData);
        const endTimer = new Date().getTime() - startTime;
        this.log.info(`解析结束: ${endTimer} ms | length: ${String(content).length} | ${url}`);
        this.pool.release(client);
        resolve({ status: true, ...resultData });
      });
    });
  }

  protected async _start(url: string, id: string = "") {
    /** 没有id表示是 start 进入的方法（而不是_start嵌套调用） */
    const root = !id;
    const matchOption: MatchOption = this.getUrlMatchFirst(url, null);

    if (root) {
      id = Math.random().toString(36).slice(3, 13);
      this.spiderCache[id] = { current: 0, count: 1, targets: new Set(), running: [] };
      this.spiderCache[id].targets.add(url);
      if (matchOption) await this.emit("onInitSpider", { url, matchOption });
    }

    const currentData = this.spiderCache[id];
    const result = await this.get(url, matchOption);
    if (!result.status) return this.log.error(result.message);
    await this.emit("onStartSpider", { url, matchOption });
    const targets = result.targets;
    await this.emit("onBeforeTarget", targets);
    const selector = result.selector;

    /** 1. 配置Targets----------------------------------------- */
    // 匹配自定义区域的链接
    if (result.matchOption?.areas && isArray(result.matchOption.areas)) {
      const areaObj = selector.queryData(
        result.matchOption.areas.map((m, i) => ({
          name: `areas-${i}`,
          ...(isString(m) ? { cls: m } : m)
        }))
      );
      const _targets: any[] = Object.values(areaObj).flat();
      await this.emit("onAreaTarget", _targets);
      targets.push(..._targets);
    }

    // 匹配所有a标签中的链接
    if (result.matchOption?.targets) {
      const _targets = selector.query({ cls: "@a::attr(href)" });
      await this.emit("onParserTarget", _targets);
      targets.push(..._targets);
    }

    /** 2. 过滤Targets----------------------------------------- */
    const _filterTargets = targets
      .map((url) => {
        if (!url || url.startsWith("javascript:void")) return false;
        if (url.startsWith("//")) url = `https:${url}`;
        if (url.startsWith("/")) url = `${result.matchOption?.origin}${url}`;
        return url;
      })
      .filter((url) => {
        if (!url) return false;
        if (!/https?:\/\/(.+)/.test(url)) return false;
        if (currentData.targets.has(url)) return false;
        return !!this.getUrlMatchFirst(url);
      }) as string[];

    const filterTargets = Array.from(new Set(_filterTargets));
    await this.emit("onAfterTarget", filterTargets);
    await this.emit("onPipeSpider", {
      url,
      matchOption,
      data: omit(result, ["status"]),
      targets,
      filterTargets,
      status: currentData
    });

    /** 3. 进行下一步----------------------------------------- */
    // 对当前页面的数据清除(这里控制当前spider正在执行的数量， 用于判断结束)
    if (!root) {
      const index = currentData.running.indexOf(url);
      if (index !== -1) {
        currentData.running.splice(index, 1);
        currentData.current++;
      }
    }

    const max = this.option.spider.max;
    for (let nextUrl of filterTargets) {
      if (max > 0 && currentData.count >= max) {
        currentData.targets = new Set();
        break;
      }
      currentData.targets.add(nextUrl);
      this._start(nextUrl, id);
      currentData.running.push(nextUrl);
      currentData.count++;
    }

    if (currentData.running.length === 0) {
      if (currentData.count >= max && max !== 0) this.log.warn("限制访问次数！");
      const all = Object.keys(this.spiderCache).every(
        (_id) => this.spiderCache[_id].running.length === 0
      );
      await this.emit("onEndSpider", { id, all, matchOption });
    }
    return true;
  }

  start(url: string) {
    this._start(url);
  }

  /** 结束 */
  protected async destroy() {
    await this.emit("onDestroy");
  }
}
