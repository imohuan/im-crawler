import download from "download";
import { ensureDirSync, writeFileSync } from "fs-extra";
import { delay, urlParser } from "../helper/index";
import { get, isArray, isFunction, isString } from "lodash-es";
import { basename, dirname, extname, resolve } from "path";

import { Aria2Tool } from "@imohuan/aria2c";

import { SamplePool } from "../helper/pool";
import { UserPlugin } from "../typings";

interface DownloadDataParser {
  download: boolean;
  ext: string;
  category: boolean;
  filename: (...args: any[]) => string;
}

type DownloadFn = (url: string, filepath: string) => void;

export const DownloadPlugin = (
  callbackOrPrefab: (url: string, filepath: string) => void | "default" | "aria2c"
): UserPlugin => {
  const pool = new SamplePool(20);
  const aria2c = new Aria2Tool();
  return (crawler, { onParserField }) => {
    const aria2cDownload: DownloadFn = async (url, filepath) => {
      aria2c.addUri(url, { dir: dirname(filepath), out: basename(filepath) });
      await delay(1000);
    };

    const defaultDownload: DownloadFn = async (url, filepath) => {
      try {
        writeFileSync(filepath, await download(url));
        crawler.log.info(`下载成功: ${url}`);
      } catch (e: any) {
        crawler.log.error(`下载失败: ${e.message}, 下载地址：${url}`);
      }
    };

    let downloadFn: Function;
    if (isString(callbackOrPrefab)) {
      downloadFn = callbackOrPrefab === "aria2c" ? aria2cDownload : defaultDownload;
    } else if (isFunction(callbackOrPrefab)) {
      downloadFn = callbackOrPrefab;
    } else {
      downloadFn = defaultDownload;
    }

    const downloadDir = resolve(crawler.option.dirname, "download");
    onParserField(({ keys, value, data }) => {
      const { download, ext, category, filename } = data;
      if (keys.includes("download") && download) {
        const urls = (isArray(value) ? value : [value]).filter((url) => /http?s:\/\/.+/.test(url));
        urls.forEach((url) => {
          pool.run(async () => {
            const urlOption = urlParser({ url, ext, dirname: downloadDir });
            let filepath: string = (category ? urlOption.outFile : urlOption.categoryOutFile) || "";
            // 处理自定义的名称
            if (filename && isFunction(filename)) {
              filepath = filepath.replace(urlOption.name, filename(urlOption));
            }
            ensureDirSync(dirname(filepath));
            await downloadFn(url, filepath);
          });
        });
      }
    });
  };
};
