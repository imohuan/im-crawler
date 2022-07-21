import { defaultsDeep, get, isArray, isObject, isString } from "lodash-es";

import { md5 } from "../../helper";
import { TableColumn } from "../../helper/store";
import { DataParser, MatchOption } from "../../typings";

/** 获取URL的md5名称 */
export function getUrlName(url: string) {
  return md5(url);
}

export function getColumnNextName(name: string) {
  return `__${name}_id`;
}

/** 获取不同的名称 */
export function getName(
  url: string,
  matchOption: MatchOption
):
  | { ok: true; urlName: string; pageName: string; tableName: string; storeName: string }
  | {
      ok: false;
      urlName: undefined;
      pageName: undefined;
      tableName: undefined;
      storeName: string;
    } {
  const urlName = getUrlName(url);
  const pageName = matchOption?.["__parent"]?.name;
  const tableName = matchOption?.name;
  const storeName = `${pageName}-${tableName}`;
  const merger = get(matchOption, "merger", true);
  const ok = urlName && pageName && tableName && merger;
  return { urlName, pageName, tableName, storeName, ok } as any;
}

/**
 * 获取配置文件生成表的字段
 * @param option 配置
 */
export function getTableColumns(option: MatchOption) {
  // 获取option中 merger 属性 { merger: "list" }
  const merger = get(option, "merger", true);
  /**
   *
   * @example
   * ```
   * const parsers =  [
      {
        name: "list-1",
        parent: "",
        children: [
          {
            name: "list-2",
            parent: "",
            children: [
              {
                name: "list-3",
                parent: "",
                children: [{ name: "title", cls: "title::text" }]
              }
            ]
          }
        ]
      }
    ]
    getItemChildren(parsers);
   * ```
   */
  const getItemChildren = (option: DataParser[]): any => {
    return option.reduce((pre, cur) => {
      const { name, children, ...option } = cur;
      if (!name) return pre;
      const result: any = { option, children };
      if (children && children.length > 0) result.next = getItemChildren(children);
      pre[name] = result;
      return pre;
    }, {});
  };

  let parsers: DataParser[] = option.parsers;
  if (isString(merger)) {
    const obj = getItemChildren(option.parsers);
    const targetObj = merger.split(".").reduce((pre, key) => pre[key]?.next, obj);
    parsers = Object.keys(targetObj).map((key) => ({
      name: key,
      children: targetObj[key]?.children,
      ...targetObj[key]?.option
    }));
  }
  parsers = parsers.filter((parser) => parser?.name && !parser?.hidden);

  const uniques: string[] = [];
  const nextKeys: string[] = [];

  const columns = parsers.map((parser) => {
    const { name, type, unique, increments } = defaultsDeep(parser, {
      type: "string",
      unique: false,
      increments: false
    });
    if (parser.target) nextKeys.push(name);
    if (unique) uniques.push(name);
    return { name, unique: false, type, increments } as TableColumn;
  });
  columns.push(...nextKeys.map((name) => ({ name: getColumnNextName(name) })));
  columns.push({ name: "id", type: "string", unique: false });
  const keys: string[] = columns.map((item) => item.name);
  return { keys, nextKeys, uniques, columns };
}

/** 获取配置文件对应表的值 */
export function getTableValue(option: MatchOption, data: any): any[] {
  const merger = get(option, "merger", true);
  let result: any[] = [];
  if (isString(merger)) {
    const arr = merger.split(".").reduce(
      (pres, cur) => {
        return pres
          .map((pre) => {
            const item = get(pre, cur, false);
            if (!item) return [];
            if (isObject(item)) return isArray(item) ? item : [item];
            return [];
          })
          .flat(1);
      },
      [data]
    );
    result = result.concat(arr);
  } else result.push(data);
  return result;
}
