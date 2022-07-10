import { get, isArray, isObject, isString } from "lodash-es";

import { md5 } from "../../helper";
import { TableColumn } from "../../helper/store";
import { DataParser, MatchOption } from "../../typings";

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
  const urlName = md5(url, 10);
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
export function getTableColumns(option: MatchOption): TableColumn[] {
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
  const targetNames: string[] = [];
  const result = parsers
    .filter((parser) => parser?.name && !parser?.hidden)
    .map((parser) => {
      if (parser.target) targetNames.push(parser.name!);
      return {
        name: parser.name,
        type: get(parser, "type", "string"),
        unique: get(parser, "unique", false),
        increments: get(parser, "increments", false)
      } as TableColumn;
    });
  result.push(...targetNames.map((name) => ({ name: `__${name}` })));
  return result;
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
