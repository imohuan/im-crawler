import { defaultsDeep, pick } from "lodash-es";
import { resolve } from "path";

import { SamplePool } from "../../helper/pool";
import { Store } from "../../helper/store";
import { UserPlugin } from "../../typings";
import { getName, getTableColumns, getTableValue } from "./helper";

type ListItem = {
  urlName: string;
  pageName: string;
  tableName: string;
  url: string;
  data: any;
};

export const StorePlugin: UserPlugin = (crawler, { onStartSpider, onPipeSpider, onEndSpider }) => {
  const pool = new SamplePool(2);
  const keyMap = new Map<string, string[]>();
  const storeMap = new Map<string, { store: Store<any>; list: ListItem[] }>();
  const uniqueMap = new Map<string, { store: Store<any>; tableName: string; list: string[] }>();

  /** 批量插入 */
  const batchInsert = async (name?: string): Promise<any> => {
    return new Promise((_resolve) => {
      pool.run(async () => {
        const storeNames = name ? [name] : Array.from(storeMap.keys());
        const result = await Promise.all(
          storeNames.map(async (storeName) => {
            if (!storeMap.has(storeName)) return true;
            const { list, store } = storeMap.get(storeName)!;
            /** 如果存在name,表示实在onPipeSpider中调用,可以让数量到了200之后在调用 */
            if (name && list.length < 200) return true;
            const { tableName } = list[0];
            const isOk = await store.batchInsert(
              tableName,
              list.map((m) => pick(m.data, keyMap.get(storeName) || [])),
              100
            );
            if (isOk) list.splice(0, 999999);
            return [];
          })
        );
        _resolve(result);
      });
    });
  };

  /** 去重 */
  const batchRemoveUnique = async () => {
    await Promise.all(
      Array.from(uniqueMap.values()).map(async ({ list, tableName, store }) => {
        await Promise.all(list.map((item) => store.removeRepetition(tableName, item)));
      })
    );
  };

  /** 创建 表 */
  onStartSpider(async ({ url, matchOption }) => {
    const { storeName, pageName, tableName, ok } = getName(url, matchOption);
    if (!ok) return;
    const tables = getTableColumns(matchOption);
    const uniques: string[] = [];

    tables.forEach((table) => {
      if (!table.unique!) return;
      table.unique = false;
      uniques.push(table.name);
    });

    const keys = tables.concat({ name: "id", type: "string", unique: false });
    const store = new Store(resolve(crawler.option.dirname, "store"), pageName);
    await store.initTable(tableName, keys);

    if (uniques.length > 0) uniqueMap.set(storeName, { store, tableName, list: uniques });
    storeMap.set(storeName, { store, list: [] });
    keyMap.set(
      storeName,
      keys.map((key) => key.name)
    );
  });

  /** 获取数据执行插入 */
  onPipeSpider(async ({ url, data, matchOption }) => {
    const { storeName, ok, urlName, tableName, pageName } = getName(url, matchOption);
    if (!ok || !storeMap.has(storeName)) return;
    const option = { url, urlName, tableName, pageName };
    const results = getTableValue(matchOption, data.result);
    results.forEach((result) => {
      storeMap.get(storeName)?.list.push({
        data: defaultsDeep({ id: urlName }, result),
        ...option
      });
    });
    await batchInsert(storeName);
  });

  /** 结束, 插入剩下输入, 去重, 关闭数据库 */
  onEndSpider(async ({ all }) => {
    await batchInsert();
    if (!all) return;
    await batchRemoveUnique();
    await Promise.all(Array.from(storeMap.values()).map(async (m) => await m.store.close()));
  });
};

/**
 * 问题
 * 1. 2张数据表还没有建立联系,如外键
 *    实现: A表 字段存在Target属性则创建表的时候额外创建一个字段 `__xxx`, 这样就可以查询对应的表 (需要根据option找到对应的配置获得其名称, `__{name}`)
 *
 */
