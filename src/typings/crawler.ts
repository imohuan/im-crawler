import { EmitterEvent, getSelector } from "im-selector";

import { Crawler } from "../core";
import { ParseURL } from "../typings";
import { CrawlerOption, HttpRequest, MatchOption } from "./index";

export type Event = { [key: string]: (...args: any[]) => any };
export type PluginOptionArgs<T extends Event> = {
  [K in keyof T]: (fn: (...args: Parameters<T[K]>) => ReturnType<T[K]>) => void;
};
export type PluginFunction<T extends Event> = (_this: Crawler<any>, cb: PluginOptionArgs<T>) => any;

/** 爬虫解析全局数据 */
export type GlobalData<T> = {
  request: HttpRequest;
  matchOption: MatchOption;
} & ParseURL &
  T;

/** Get 错误返回 */
export type GetResultError = { status: false; message: string };
/** Get 成功返回 */
export type GetResultSuccess<T = any> = {
  /** 状态 */
  status: true;
  /** 请求内容 */
  content: string;
  /** Selector选择器实例 */
  selector: ReturnType<typeof getSelector<GlobalData<T>>>;
  /** 匹配下一步URL列表 */
  targets: string[];
  /** 当前的爬出配置 */
  matchOption: MatchOption | undefined;
  /** URL配置 */
  urlOption: ParseURL;
  /** 返回内容 */
  result: any;
  /** 是否缓存 */
  isCache: boolean;
};

export type SpiderStatus = {
  /** 当前进度 */
  current: number;
  /** 最大执行数 */
  count: number;
  /** 失败次数 */
  error: number;
  /** 爬取地址 */
  targets: Set<string>;
  /** 正在执行 */
  running: string[];
  /** 其他 */
  [keys: string]: any;
};

/** 插件配置 */
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
    data: Omit<GetResultSuccess<any>, "status">;
    targets: string[];
    filterTargets: string[];
    status: SpiderStatus;
  }) => any;
  /** 爬虫结束后调用,只执行一次 isAll表示如果开始了多个Spider的话, 全部结束为True */
  onEndSpider: (data: { id: string; all: boolean; matchOption: MatchOption }) => any;

  onInitSearch: (data: {
    value: string;
    page: number;
    names: string[];
    filterMatchOptions: MatchOption[];
  }) => Promise<any>;
  onPipeSearch: (data: { url: string; matchOption: MatchOption; data: any; total: number }) => any;
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

  onDestroy: () => void;
};

/** 用户配置 */
export type UserPlugin = PluginFunction<PluginOption>;

/** Spider缓存 */
export interface SpiderCache {
  [key: string]: SpiderStatus;
}
