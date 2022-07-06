import { isArray, isString } from "lodash-es";
import { resolve } from "path";

import { Setting } from "../helper/store";
import { CrawlerOption, MatchOption } from "../typings";
import { BaseCrawler } from "./crawler";

interface SpiderStatus {
  current: number;
  count: number;
}

export class Spider extends BaseCrawler {
  private status: SpiderStatus;
  private cache: { [key: string]: string[] };
  private targets: Set<string>;
  private setting: Setting;
  private isInit: boolean;

  constructor(option: Partial<CrawlerOption> & Pick<CrawlerOption, "pages">) {
    super(option);
    this.status = { current: 0, count: 0 };
    this.cache = {};
    this.targets = new Set();
    this.setting = new Setting({
      dirname: resolve(this.option.dirname, "tables")
    });
    this.isInit = false;
  }

  private randomId() {
    return Math.random().toString(36).slice(3, 13);
  }

  private async _start(url: string, id = "") {
    if (!this.isInit) {
      await this.setting.create();
      this.isInit = true;
    }
    /** 没有id表示是 start 进入的方法（而不是_start嵌套调用） */
    const matchOption: MatchOption = this.getUrlMatchFirst(url, null);

    if (!id) {
      this.status = { current: 0, count: 1 };
      this.targets = new Set();
      this.targets.add(url);
      if (matchOption) await this.emit("onInitSpider", { url, matchOption });
    }

    const result = await this.get(url, matchOption);
    if (!result.status) return this.log.error(result.message);
    await this.emit("onStartSpider", { url, matchOption });
    const targets = result.targets;
    await this.emit("onBeforeTarget", targets);
    const selector = result.selector;

    /** 1. 配置Targets----------------------------------------- */
    // 匹配自定义区域的链接
    if (result.option?.areas && isArray(result.option.areas)) {
      const areaObj = selector.queryData(
        result.option.areas.map((m, i) => ({
          name: `areas-${i}`,
          ...(isString(m) ? { cls: m } : m)
        }))
      );
      const _targets: any[] = Object.values(areaObj).flat();
      await this.emit("onAreaTarget", _targets);
      targets.push(..._targets);
    }

    // 匹配所有a标签中的链接
    if (result.option?.targets) {
      const _targets = selector.query({ cls: "@a::attr(href)" });
      await this.emit("onParserTarget", _targets);
      targets.push(..._targets);
    }

    /** 2. 过滤Targets----------------------------------------- */
    const _filterTargets = targets
      .map((url) => {
        if (!url || url.startsWith("javascript:void")) return false;
        if (url.startsWith("//")) url = `https:${url}`;
        if (url.startsWith("/")) url = `${result.option?.origin}${url}`;
        return url;
      })
      .filter((url) => {
        if (!url) return false;
        if (!/https?:\/\/(.+)/.test(url)) return false;
        if (this.targets.has(url)) return false;
        return !!this.getUrlMatchFirst(url);
      }) as string[];

    const filterTargets = Array.from(new Set(_filterTargets));
    await this.emit("onAfterTarget", filterTargets);
    await this.emit("onPipeSpider", { url, matchOption, data: result, targets, filterTargets });

    /** 3. 进行下一步----------------------------------------- */
    // 对当前页面的数据清除(这里控制当前spider正在执行的数量， 用于判断结束)
    if (id) {
      const index = this.cache[id].indexOf(url);
      if (index !== -1) {
        this.cache[id].splice(index, 1);
        this.status.current++;
      }
    } else {
      id = this.randomId();
      if (!this.cache[id]) this.cache[id] = [];
    }

    const max = this.option.spider.max;
    for (let nextUrl of filterTargets) {
      if (max > 0 && this.status.count >= max) {
        this.targets = new Set();
        break;
      }
      this.targets.add(nextUrl);
      this._start(nextUrl, id);
      this.cache[id].push(nextUrl);
      this.status.count++;
    }

    if (this.cache[id] && this.cache[id].length === 0) {
      if (this.status.count >= max && max !== 0) this.log.warn("限制访问次数！");
      const isAll = Object.keys(this.cache).every((_id) => this.cache[_id].length === 0);
      await this.emit("onEndSpider", { id, isAll, matchOption });
    }

    await this.setting.set("status", this.status);
    return true;
  }

  /** 开启服务 */
  start(url: string) {
    this._start(url);
  }

  /** 清除状态 */
  clear() {
    this.status = { current: 0, count: 0 };
    this.targets = new Set();
    this.cache = {};
  }
}
