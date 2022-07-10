import { ensureDirSync, removeSync } from "fs-extra";
import { knex, Knex } from "knex";
import { defaultsDeep, isObject } from "lodash-es";
import { resolve } from "path";

export type ColumnType =
  | "string"
  | "integer"
  | "tinyint"
  | "smallint"
  | "mediumint"
  | "bigint"
  | "bigInteger"
  | "float"
  | "double"
  | "decimal"
  | "date"
  | "dateTime"
  | "time"
  | "timestamp"
  | "boolean"
  | "text";

export interface TableColumn {
  /** 名称 */
  name: string;
  /** 属性 */
  type?: ColumnType;
  /** 是否唯一 */
  unique?: boolean;
  /** 数字自增 */
  increments?: boolean;
}

export interface PageOption {
  name: string;
  page: number;
  size: number;
  where: any;
  whereRaw: string;
  order: string;
}

export class Store<T> {
  public sql: Knex;
  public filePath: string;
  private tableColumns: TableColumn[];

  constructor(dirPath: string, name: string) {
    ensureDirSync(dirPath);
    this.filePath = resolve(dirPath, `${name}.db`);

    this.sql = knex({
      client: "sqlite3",
      useNullAsDefault: true,
      connection: { filename: this.filePath }
    });

    this.tableColumns = [];
  }

  public async initTable(name: string, tableColumns: TableColumn[]) {
    this.tableColumns = tableColumns;
    if (!(await this.sql.schema.hasTable(name))) {
      await this.sql.schema.createTable(name, (table: any) => {
        tableColumns.forEach((item) => {
          const { type, name, unique, increments } = item;
          if (increments) table.increments(name);
          else table[type || "string"](name);
          if (unique) table.unique([name]);
        });
      });
    }
  }

  public async hasTable(name: string) {
    return await this.sql.schema.hasTable(name);
  }

  public async insert(name: string, data: Partial<T>) {
    try {
      return await this.sql(name).insert(data);
    } catch (err) {
      return null;
    }
  }

  /**
   * 批量插入数据
   * @param name 表名称
   * @param dataList 插入数据列表
   * @param chunkSize 分段插入的分段值
   */
  public async batchInsert(name: string, dataList: Partial<T>[], chunkSize = 100): Promise<any> {
    return new Promise((resolve) => {
      this.sql
        .batchInsert(name, dataList as any, chunkSize)
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          console.log("BatchInsert Error: ", err);
          resolve(false);
        });
    });
  }

  public async select(name: string, select: Partial<T>, show: string[] = []) {
    if (show.length === 0) show = this.tableColumns.map((item) => item.name);
    return await this.sql(name)
      .where(select)
      .select(...show);
  }

  public async count(name: string) {
    return (await this.sql(name).count("*"))[0]["count(*)"];
  }

  public async page(option: PageOption) {
    const { name, page, size, where, order } = option;
    const start = size * (page - 1);
    const sql = await this.sql(name)
      .where(where)
      .select()
      .orderByRaw(order)
      .limit(size)
      .offset(start)
      .toQuery();
    const count = (await this.sql(name).count("*"))[0]["count(*)"];
    const result = await this.sql.raw(sql);
    return { page, size, count, sql, result };
  }

  public async remove(name: string, select: Partial<T>) {
    return await this.sql(name).where(select).del();
  }

  public async removeId(name: string, id: any) {
    return await this.sql(name).where({ id }).del();
  }

  public async update(name: string, select: Partial<T>, data: Partial<T>) {
    return await this.sql(name).where(select).update(data);
  }

  public async updateId(name: string, id: any, data: Partial<T>) {
    return await this.sql(name).where({ id }).update(data);
  }

  /**
   * 根据unique字段去除数据库中重复数据
   * @param name 表名
   * @param unique 判断是否重复的字段
   * @returns true
   */
  public async removeRepetition(name: string, unique: string = "name") {
    const sql = `DELETE FROM \`${name}\` WHERE \`${name}\`.rowid NOT IN ( SELECT MAX(\`${name}\`.rowid) FROM \`${name}\` GROUP BY \`${unique}\`)`;
    return await this.sql.raw(sql);
  }

  public async raw(sql: string) {
    return await this.sql.raw(sql);
  }

  /** 关闭连接 */
  public close(): Promise<boolean> {
    return new Promise((res) => {
      setTimeout(async () => {
        await this.sql.destroy();
        res(true);
      }, 1000);
    });
  }

  /** 销毁当前文件（注意：销毁后数据将丢失） */
  public async destroy() {
    await this.close();
    removeSync(this.filePath);
  }
}

interface SqlSettingOption {
  /** 保存地址 */
  dirname: string;
  /** 文件名称 */
  name: string;
  /** 创建表名称 */
  table: string;
}

/** Sqlite Setting */
export class Setting {
  private store: Store<{ [key: string]: any }>;
  private option: SqlSettingOption;
  constructor(_option: Partial<SqlSettingOption> = {}) {
    this.option = defaultsDeep(_option, {
      dirname: resolve(process.cwd(), "store"),
      name: "config",
      table: "base"
    });
    this.store = new Store(this.option.dirname, this.option.name);
  }

  /** 初始化需要执行 */
  async create() {
    await this.store.initTable(this.option.table, [
      { name: "key", type: "string", unique: true },
      { name: "value", type: "string" }
    ]);
  }

  /** 异步 设置值 */
  async set(key: string, value: any) {
    const result = await this.get(key, false);
    try {
      value = isObject(value) ? JSON.stringify(value) : value;
    } catch {}
    if (!result) return await this.store.insert(this.option.table, { key, value });
    return await this.store.update(this.option.table, { key }, { value });
  }

  /** 异步 获取值 */
  async get(key: string, defaults: any = null) {
    const results = await this.store.select(this.option.table, { key });
    if (results.length === 0) return defaults;
    const value = results[0]?.value;
    try {
      return JSON.parse(value);
    } catch {
      return value ?? defaults;
    }
  }

  /** 异步 删除值 */
  async del(key: string) {
    await this.store.remove(this.option.table, { key });
  }
}
