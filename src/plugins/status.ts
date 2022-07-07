import { resolve } from "path";

import { Spider, UserPlugin } from "../core/index";
import { Setting } from "../helper/store";

export const StatusPlugin: UserPlugin = (crawler: Spider, { onInit, onPipeSpider }) => {
  const setting = new Setting({
    dirname: resolve(crawler.option.dirname, "tables")
  });

  onInit(async () => {
    await setting.create();
  });

  onPipeSpider(({ url, data }) => {
    //
  });
};
