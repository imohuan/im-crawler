import { Store } from "../../helper/store";

export type ListItem = {
  urlName: string;
  url: string;
  data: any;
};

export type StoreCache = {
  /** 对应pageName的Store */
  store: Store<any>;
  /** 文件名称 */
  pageName: string;
  /** 表名称 */
  tableName: string;
  /** 表唯一键 */
  uniques: string[];
  /** 表的键名称列表 */
  keys: string[];
  /** 下一步 Keys */
  nextKeys: string[];
  /** 数据保存 */
  list: ListItem[];
};

export interface StorePluginOption {
  /** 操作数据库的最大线程池 默认: `1`*/
  poolMax: number;
  /** 一次批量插入最大插入数据条数 默认：`100` */
  batchInsertMax: number;
  /** 全部spider结束后是否启用销毁事件 */
  spiderDestroy: boolean;
  /** 定时保存 默认： `10 * 1000` */
  timeSave: number;
}
