import { cloneDeep, debounce, defaultsDeep, get, omit, pick, set } from "lodash-es";
import { resolve } from "path";

import { completionUrl, delay } from "../../helper";
import { SamplePool } from "../../helper/pool";
import { Store } from "../../helper/store";
import { UserPlugin } from "../../typings";
import { getColumnNextName, getName, getTableColumns, getTableValue, getUrlName } from "./helper";
import { ListItem, StoreCache, StorePluginOption } from "./typings";

export const StorePlugin = (_option: Partial<StorePluginOption> = {}): UserPlugin => {
  const option: StorePluginOption = defaultsDeep(_option, {
    poolMax: 1,
    batchInsertMax: 100,
    spiderDestroy: true,
    timeSave: 10 * 1000
  } as StorePluginOption);

  return (crawler, { onStartSpider, onPipeSpider, onEndSpider, onDestroy }) => {
    const cache = new Map<string, StoreCache>();
    const pool = new SamplePool(option.poolMax);

    /** 批量插入 */
    const batchInsert = async (name?: string): Promise<any> => {
      return new Promise((_resolve) => {
        pool.run(async () => {
          const cacheNames = name ? [name] : Array.from(cache.keys());
          const result = await Promise.all(
            cacheNames.map(async (storeName) => {
              if (!cache.has(storeName)) return true;
              const cacheValue = cache.get(storeName)!;
              if (name && cacheValue.list.length < 200) return true;
              const isOk = await cacheValue.store.batchInsert(
                cacheValue.tableName,
                cacheValue.list.map((m) => pick(m.data, cacheValue.keys || [])),
                option.batchInsertMax
              );
              if (isOk) cacheValue.list.splice(0, 999999);
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
        Array.from(cache.values()).map(async ({ uniques, tableName, store }) => {
          await Promise.all(uniques.map((item) => store.removeRepetition(tableName, item)));
        })
      );
    };

    const timer = setInterval(async () => {
      await batchInsert();
      crawler.log.info("StorePlugin 定时保存成功!");
    }, option.timeSave);

    /** 创建 表 */
    onStartSpider(async ({ url, matchOption }): Promise<any> => {
      return new Promise((_resolve) => {
        pool.run(async () => {
          const { storeName, pageName, tableName, ok } = getName(url, matchOption);
          if (!ok || cache.has(storeName)) return _resolve(false);
          const { keys, nextKeys, uniques, columns: tables } = getTableColumns(matchOption);
          const store = new Store(resolve(crawler.option.dirname, "store"), pageName);
          await store.initTable(tableName, tables);
          cache.set(storeName, { store, pageName, tableName, keys, nextKeys, uniques, list: [] });
          _resolve(true);
        });
      });
    });

    /** 获取数据执行插入 */
    onPipeSpider(async ({ url, data, matchOption }) => {
      const { storeName, urlName, ok } = getName(url, matchOption);
      if (!ok || !cache.has(storeName)) return;
      const cacheValue = cache.get(storeName)!;
      const results = getTableValue(matchOption, cloneDeep(data.result));
      results.forEach((result, index) => {
        cacheValue.nextKeys.forEach((key) => {
          const value = get(result, key, false);
          if (value) {
            const cUrl = completionUrl(value, new URL(url)) || "";
            set(result, getColumnNextName(key), getUrlName(cUrl));
          }
        });
        result.id = urlName + (index > 0 ? `-${index}` : "");
        const item: ListItem = { url, urlName, data: result };
        cacheValue.list.push(item);
      });
      await batchInsert(storeName);
    });

    /** 结束, 插入剩下输入, 去重, 关闭数据库 */
    onEndSpider(async ({ all }) => {
      await batchInsert();
      if (all && option.spiderDestroy) {
        await delay(1000);
        await crawler.destroy();
      }
    });

    onDestroy(async () => {
      await pool.clear(async () => {
        clearInterval(timer);
        await batchRemoveUnique();
        await Promise.all(Array.from(cache.values()).map(async (m) => await m.store.close()));
      });
    });
  };
};
