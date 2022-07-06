import { resolve } from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { Store, Setting } from "../src/helper/store";

const delay = (timeout: number) =>
  new Promise((_resolve) => setTimeout(() => _resolve(true), timeout));

describe("Sqlite3", () => {
  it("测试", async () => {
    interface Config {
      id: string;
      name: string;
      value: string;
    }
    const store = new Store<Config>(resolve(process.cwd(), "store"), "imohuan");
    await store.initTable("table1", [
      { name: "name", type: "string", unique: true },
      { name: "value", type: "string" }
    ]);
    await store.insert("table1", { name: "ddd", value: "asdfadsf" });
    // await store.update("table1", { name: "ddd" }, { value: "1223" });
    await delay(100);
  });

  it("Setting 配置（Sql表）", async () => {
    const setting = new Setting();
    await setting.create();
    await setting.set("hello", { hello: 123 });
    expect(await setting.get("hello")).toEqual({ hello: 123 });
    await setting.del("hello");
    expect(await setting.get("hello")).toEqual(null);
  });
});
