import { ensureFileSync, existsSync, readFileSync, writeFileSync } from "fs-extra";
import IoRedis from "ioredis";
import { isString } from "lodash-es";
import { resolve } from "path";

import { md5, urlName } from "../helper";
import { SamplePool } from "../helper/pool";
import { UserPlugin } from "../typings";

function checkContent(content: any): boolean {
  if (!content || content === "false" || content.trim().length <= 10) return false;
  return true;
}

export const CacheRedisPlugin: UserPlugin = (_, { onBeforeRequest, onAfterRequest, onDestroy }) => {
  const redis = new IoRedis();
  const day = 60 * 60 * 24;
  const getKey = (data: any) => md5(data, 10);

  onBeforeRequest(async (request) => {
    if (!request.cache) return request;
    const data = await redis.get(getKey(request.url));
    if (data) request.html = data;
    return request;
  });

  onAfterRequest(async (request) => {
    if (!request.cache) return;
    // 默认过期天数为 1 天
    const content = request.content;
    const isOk = checkContent(content);
    isOk && (await redis.set(getKey(request.url), content!, "EX", day));
  });

  onDestroy(async () => {
    await redis.quit();
  });
};

export const CacheFsPlugin: UserPlugin = (
  crawler,
  { onBeforeRequest, onAfterRequest, onDestroy }
) => {
  const pool = new SamplePool(30);
  const resolveFilePath = (url: any) =>
    resolve(crawler.option.dirname, "html", urlName(url, ".html"));

  onBeforeRequest(async (request) => {
    if (!request?.cache) return;
    const filepath = resolveFilePath(request.url);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath).toString();
      if (content.length > 10) request.content = content;
    }
  });

  onAfterRequest(async (request) => {
    if (!request?.cache) return;
    const filepath = resolveFilePath(request.url);
    pool.run(async () => {
      ensureFileSync(filepath);
      let content: any = request.content;
      try {
        if (!isString(request.content)) content = JSON.stringify(request.content);
      } catch {}
      const isOk = checkContent(content);
      isOk && writeFileSync(filepath, content);
    });
  });

  onDestroy(async () => {
    await pool.clear();
  });
};
