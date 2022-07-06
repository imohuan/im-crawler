import { ensureFileSync, existsSync, readFileSync, writeFileSync } from "fs-extra";
import { createPool } from "generic-pool";
import IoRedis from "ioredis";
import { resolve } from "path";

import { UserPlugin } from "../core/index";
import { md5 } from "../helper";

export const FileRedisPlugin: UserPlugin = (_, { onBeforeRequest, onAfterRequest, onDestroy }) => {
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
    await redis.set(getKey(request.url), content!, "EX", day);
  });

  onDestroy(async () => {
    await redis.quit();
  });
};

export const FileFsPlugin: UserPlugin = (crawler, { onBeforeRequest, onAfterRequest }) => {
  const pool = createPool({ create: async () => [], destroy: async () => {} }, { max: 30 });
  const resolveFilePath = (url: any) =>
    resolve(crawler.option.dirname, "html", `${md5(String(url), 10)}.html`);

  onBeforeRequest(async (request) => {
    if (!request?.cache) return;
    const filepath = resolveFilePath(request.url);
    if (existsSync(filepath)) {
      const content = readFileSync(filepath).toString();
      if (content.length > 0) request.content = content;
    }
  });

  onAfterRequest(async (request) => {
    if (!request?.cache) return;
    const filepath = resolveFilePath(request.url);
    pool.acquire().then(async (client) => {
      ensureFileSync(filepath);
      writeFileSync(filepath, request.content!);
      pool.release(client);
    });
  });
};
