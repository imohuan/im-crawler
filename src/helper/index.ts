import { createHash } from "crypto";
import { get, isArray, isFunction, isObject, isString, set } from "lodash-es";
import { extname, resolve } from "path";
import { getSuffixForDir } from "@imohuan/aria2c";
import { Global, ParseURL } from "../typings";

/**
 * md5 加密
 * @param content 需要加密的内容
 * @param len 加密的保留长度
 */
export function md5(content: string, len?: number): string {
  const result = createHash("md5").update(content).digest("hex");
  return result.substring(0, len || result.length);
}

/**
 * 解析数据 Data, 将字符串解析为对象
 * @param data 修改解析的数据
 * @param vars 变量
 * @returns
 */
export function varParseData(data: any, vars: any = {}) {
  const result: any = isArray(data) ? [] : {};
  const regexp: RegExp = /\${([_a-zA-Z0-9]+)}/g;
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (isFunction(value)) {
        result[key] = value;
        continue;
      }
      if (isObject(value)) {
        result[key] = varParseData(data[key], vars);
      } else {
        if (isString(value) && regexp.test(value)) {
          result[key] = value.replace(regexp, (_: any, key: any) => {
            return get(vars, key, value);
          });
        } else result[key] = value;
      }
    }
  }
  return result;
}

/**
 * 解析字符串为Async配置
 * @param query wait:1000,click:.btn
 * @returns
 */
export function queryParser(query: string): any[] {
  return query.split(",").reduce((pre, cur) => {
    const [name, value] = cur.split(":");
    return pre.concat([{ [name]: isString(value) ? parseInt(value) || value : value }]);
  }, [] as any);
}

/** 获取URL名称 */
export function urlName(url: string, ext: string = ".cache") {
  return md5(String(url), 10) + ext;
}

interface URLParser {
  /** URL 地址 */
  url: string;
  /** 输出路径 */
  dirname?: string;
  /** 后缀 */
  ext?: string;
}

/** URL 解析，获取后最和输出地址 */
export function urlParser(option: URLParser) {
  const { url, dirname, ext: _ext } = option;
  const urlOption = new URL(url);
  const ext = _ext ?? extname(urlOption.pathname);
  const name = urlName(url, ext);
  const category = getSuffixForDir(url, ext.startsWith(".") ? ext.slice(1) : ext);
  const outFile = dirname ? resolve(dirname, name) : null;
  const categoryOutFile = dirname ? resolve(dirname, category, name) : null;
  return { ...urlOption, ext, category, outFile, name, categoryOutFile };
}

/** 延迟 */
export function delay(timeout: number) {
  return new Promise((_resolve) => setTimeout(() => _resolve(true), timeout));
}

/** 补全URL */
export function completionUrl(url: string, option: any = {}) {
  if (!url || url.startsWith("javascript:void")) return false;
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("/")) url = `${option?.origin}${url}`;
  return url;
}

/** 解析URL对象 */
export function parseURL(_url: string): ParseURL {
  const url = new URL(_url);
  return {
    host: url.host,
    port: url.port,
    href: url.href,
    origin: url.origin,
    search: url.search,
    protocol: url.protocol,
    username: url.username,
    hash: url.hash,
    password: url.password,
    pathname: url.pathname,
    hostname: url.hostname,
    searchParams: url.searchParams
  };
}

export function getGlobal(): Global;
export function getGlobal<K extends keyof Global>(name?: K): Global[K];
export function getGlobal<K extends keyof Global>(name?: K): Global | Global[K] {
  if (name) return get(global, name, null) as Global[K];
  return global as any as Global;
}

export function setGlobal<K extends keyof Global>(name: K, value: Global[K]): void {
  set(global, name, value);
}
