import { createPool, Pool } from "generic-pool";
import iconv from "iconv-lite";
import { EmitterEvent, getSelector } from "im-selector";
import { defaultsDeep, get, isArray, isEmpty, isFunction, isString } from "lodash-es";
import { resolve } from "path";

import { Logger } from "@imohuan/log";

import { axios } from "../helper/axios";
import { CrawlerOption, HttpRequest, MatchOption } from "../typings";
import { Plugin, PluginFunction } from "./plugin";

export type UserPlugin = PluginFunction<PluginOption>;

export type PluginOption = {
  /** 创建后初始化 */
  onInit: (option: CrawlerOption) => any;
  /** 请求之前, 提供请求参数, 可以进行修改 */
  onBeforeRequest: (request: HttpRequest) => any;
  /** 请求之后, 可以查看`request.content`获取请求返回内容 */
  onAfterRequest: (request: HttpRequest) => any;

  /** 解析内容之前 */
  onBeforeParser: (data: {
    selector: ReturnType<typeof getSelector>;
    matchOption: MatchOption;
  }) => any;
  /** 解析字段 */
  onParserField: (data: EmitterEvent["files"], callback: (cb: (result: any) => void) => any) => any;
  /** 解析内容之后 */
  onAfterParser: (data: Omit<GetResultSuccess, "status">) => any;

  /** Spider --------------------------------------------- */
  /** Spider: 解后完所有字段后获取到标记有target属性的链接 */
  onBeforeTarget: (targets: string[]) => any;
  /** Spider: 解析自定义的area字段后的url列表 */
  onAreaTarget: (targets: string[]) => any;
  /** Spider: 解析HTML中所有a标签的url列表 */
  onParserTarget: (targets: string[]) => any;
  /** Spider: 过滤,去重,补全URL 后的列表 */
  onAfterTarget: (targets: string[]) => any;
  /** 执行Start后只执行一次 */
  onInitSpider: (data: { url: string; matchOption: MatchOption }) => any;
  /** 每一次爬虫开始爬取的时候调用 */
  onStartSpider: (data: { url: string; matchOption: MatchOption }) => any;
  /** 爬虫数据返回后调用 */
  onPipeSpider: (data: {
    url: string;
    matchOption: MatchOption;
    data: any;
    targets: string[];
    filterTargets: string[];
  }) => any;
  /** 爬虫结束后调用,只执行一次 isAll表示如果开始了多个Spider的话, 全部结束为True */
  onEndSpider: (data: { id: string; isAll: boolean; matchOption: MatchOption }) => any;

  onInitSearch: (data: {
    value: string;
    page: number;
    names: string[];
    filterMatchs: MatchOption[];
  }) => Promise<any>;
  onEndSearch: (data: {
    value: string;
    page: number;
    total: number;
    hasNext: boolean;
    nextNames: string[];
    next: Function;
    data: any[];
    mergeList: any[];
  }) => any;

  onPipeSearch: (data: { url: string; matchOption: MatchOption; data: any; total: number }) => any;

  onDestroy: () => void;
};

export type GetResultError = { status: false; message: string };
export type GetResultSuccess = {
  /** 状态 */
  status: true;
  /** 请求内容 */
  content: string;
  /** Selector选择器实例 */
  selector: ReturnType<typeof getSelector<Global>>;
  /** 匹配下一步URL列表 */
  targets: string[];
  /** 当前的爬出配置 */
  option: MatchOption | undefined;
  /** 返回内容 */
  result: any;
};

export type Global = {
  request: HttpRequest;
  matchOption: MatchOption;
} & URL;

export class BaseCrawler extends Plugin<PluginOption> {
  log: Logger;
  private pool: Pool<any>;
  option: CrawlerOption;

  constructor(option: Partial<CrawlerOption> & Pick<CrawlerOption, "pages">) {
    super();
    const cwd = process.cwd();
    const defaultOption: Partial<CrawlerOption> = {
      max: 0,
      pool: { min: 1, max: 20 },
      spider: { max: 0 },
      asyncUrl: "http://localhost:4445/",
      dirname: cwd,
      log: { label: "Crawler", dirname: "" },
      request: { encode: true, cache: true }
    };
    this.option = defaultsDeep(option, defaultOption);
    this.option.log.dirname = resolve(this.option.dirname, "logs");

    this.log = new Logger(this.option.log);
    this.pool = createPool({ create: async () => [], destroy: async () => {} }, this.option.pool);
    setTimeout(() => this.emit("onInit", this.option), 100);
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
      .map((m) =>
        m.matches.map((m1) => {
          m1.request = defaultsDeep({}, m1.request, m.request);
          return m1;
        })
      )
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
        const selector = getSelector<Global>(content, {
          request,
          matchOption,
          ...urlOption
        });

        /** 存储回调函数 */
        const callbacks: any[] = [];
        // 用于 onParserField 中获取 解析后的数据
        selector.on("files", (option) => {
          const { keys, value, data } = option;
          // key value keys filterKeys data
          if (keys.indexOf("target") && get(data, "target", false)) {
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
        const resultData = { content, selector, option: matchOption, result, targets };
        this.emit("onAfterParser", resultData);
        const endTimer = new Date().getTime() - startTime;
        this.log.info(`解析结束: ${endTimer} ms | length: ${String(content).length} | ${url}`);
        this.pool.release(client);
        resolve({ status: true, ...resultData });
      });
    });
  }

  /** 结束 */
  protected async destroy() {
    this.emit("onDestroy");
  }
}
