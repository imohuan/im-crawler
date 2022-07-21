#!/usr/bin/env node

const { resolve } = require("path");
const { existsSync } = require("fs-extra");
const { Logger, setOption } = require("@imohuan/log");
const { Crawler } = require("../dist/lib-cjs");
const { isFunction } = require("lodash");
const argv = require("minimist")(process.argv.slice(2));

setOption({ label: "Crawler" });
async function start() {
  let path = resolve(__dirname, argv?.c || argv?.config || "crawler.config.js");
  if (!path || !existsSync(path)) {
    Logger.error("找不到爬虫配置文件！");
    return;
  }

  let option = require(path);
  if (!option) {
    Logger.error("爬虫配置文件有误！");
    return;
  }

  if (isFunction(option)) option = option();

  const crawler = new Crawler(option, {});
  option?.plugins?.forEach((f) => crawler.use(f));

  if (argv?.start) crawler.start(argv.start);
}

start();
