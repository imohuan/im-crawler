import instance from "axios";
import { cloneDeep, defaultsDeep, get, set } from "lodash-es";
import { getRandom } from "random-useragent";

import { getGlobal } from "./index";
import { Logger } from "@imohuan/log";
import chalk from "chalk";

export const axios = instance.create({
  timeout: 30 * 1000,
  withCredentials: false
});

axios.interceptors.request.use(
  (config) => {
    set(config, "retry", get(config, "retry", 5));
    set(config, "retryDelay", get(config, "retryDelay", 5000));
    config.headers = defaultsDeep({}, config.headers, {
      "User-Agent": get(config, "userAgents", "") || getRandom()
    });
    return cloneDeep(config);
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const config: any = error.config;
    const logger: Logger = getGlobal("log") || Logger;
    config.retryCount = config.retryCount || 0;
    if (config.retryCount >= config.retry) {
      logger.error("重试次数到达上限: ", config.url);
      return Promise.reject(error);
    }
    config.retryCount++;
    logger.warn(config.url, "自动重试第", chalk.red.bold(config.retryCount), "次");
    const backref = new Promise(function (resolve) {
      setTimeout(() => resolve(true), config.retryDelay);
    });

    if (config.retryCount >= 2) config.headers["User-Agent"] = getRandom();
    // 重新获取数据
    return backref.then(() => axios(config));
  }
);

export default axios;
