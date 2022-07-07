import { AxiosRequestConfig } from "axios";
import { Options as PoolOption } from "generic-pool";
import { HTMLSelectorOption, JSONSelectorOption } from "im-selector";

import { setOption } from "@imohuan/log";

import { AsyncElectronOption } from "./async";

export * from "./async";
export * from "./crawler";
export { Emitter } from "mitt";

export type DataParser<T = any> = HTMLSelectorOption<T> &
  JSONSelectorOption<T> & {
    /** Spider 解析NextURL */
    target?: boolean;
  };

export type HttpRequest = {
  /** 是否缓存 (插件使用) */
  cache?: boolean;
  /** 请求的数据 */
  content?: string;
  /** 是否对URL进行encode  */
  encode?: boolean;
  /** 用户设备 头部 */
  userAgents?: string | boolean;
  /** 编码 */
  resultEncode?: string;
  /** 异步 Electron */
  async?: Partial<AsyncElectronOption>;
  /** ... */
  [key: string]: any;
} & AxiosRequestConfig;

type SampleDataParser = Pick<DataParser, "cls" | "processing"> | string;

export type PagingSort = {
  name: string;
  description: string;
} & Pick<DataParser, "cls" | "processing">;

export interface Paging {
  /** 当前页码 */
  page: SampleDataParser | number;
  /** 显示条数 */
  size: SampleDataParser | number;
  /** 总页数 */
  maxPage: SampleDataParser | number;
  /** 排序 */
  sort?: PagingSort[];
}

export type MatchOption = {
  /** 匹配 URL 正则*/
  regexp?: RegExp | RegExp[];
  /** http请求配置 */
  request?: HttpRequest;
  /** 分页 配置 */
  paging?: Paging;
  /** Spider Target 区域 */
  areas?: (string | Pick<DataParser, "cls" | "processing">)[];
  /** 是否开启扫描所有a标签中的链接 */
  targets?: boolean;
  /** 解析数据Parser配置项 */
  parsers: DataParser[];
  /** ... */
  [key: string]: any;
};

export interface SpiderOption {
  /** 爬虫最大爬取数量（可以进行爬虫限制） */
  max: number;
}

export interface SearchOption {}

export interface Category {
  /** 分类名称 */
  name: string;
  /** 介绍 */
  description?: string;
  /** 分类地址 */
  url: string;
}

export interface Page {
  /** Logo头像地址 */
  logo?: string;
  /** 爬虫名称 */
  name: string;
  /** 介绍 */
  description: string;
  /** 类别 URL */
  category?: Category[];
  /** 搜索 URL */
  searchUrl?: string;
  /** http请求配置 */
  request?: HttpRequest;
  /** 需要匹配的爬虫配置 */
  matches: MatchOption[];
}

export interface CrawlerOption {
  /** 项目保存地址 */
  dirname: string;
  /** 异步网页源码地址 */
  asyncUrl: string;
  /** 日志配置 */
  log: Parameters<typeof setOption>[0];
  /** 通用http请求配置 */
  request: HttpRequest;
  /** 线程池配置 */
  pool: PoolOption;
  /** Spider配置 */
  spider: SpiderOption;
  /** 搜素配置 */
  search: SearchOption;
  /** 用户Page页，配置 */
  pages: Page[];
  /** ... */
  [key: string]: any;
}
