import { resolve } from "path";

import { Setting } from "../helper/store";
import { UserPlugin } from "../typings";

export const StatusPlugin: UserPlugin = (crawler, { onInit, onPipeSpider }) => {
  const list: any[] = [];
  const setting = new Setting({
    dirname: resolve(crawler.option.dirname, "tables")
  });

  onInit(async () => {
    await setting.create();
  });

  onPipeSpider(({ url, data, status }) => {
    list.push({ url, data: data.result });
  });
};
