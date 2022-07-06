import { createHash } from "crypto";
import { get, isArray, isFunction, isObject, isString } from "lodash-es";

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
