import instance from "axios";
import retry from "axios-retry";
import { defaultsDeep, get } from "lodash-es";
import { getRandom } from "random-useragent";

export const axios = instance.create({
  timeout: 120 * 1000,
  withCredentials: false
});

axios.interceptors.request.use(
  (config) => {
    const userAgents = get(config, "userAgents", "");
    config.headers = defaultsDeep(config.headers, {
      "User-Agent": userAgents || getRandom()
    });
    return config;
  },
  (error) => Promise.reject(error)
);

retry(axios, { retries: 3, retryDelay: retry.exponentialDelay });
export default axios;
