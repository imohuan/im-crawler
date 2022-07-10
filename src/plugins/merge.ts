import { md5 } from "../helper/index";
import { UserPlugin } from "../typings/index";

/** 数据合并 (大量数据会导致崩溃) (目前研究将每一条MatchOption保存为一张单独的表，之后通过 id 查询)
 *  分为2种情况
 * 1. list -> item (list中的子项需要和后面连接解析的item合并)
 * 配置: MatchOption: { merge: boolean }
 * 2. item -> item2 -> item3 (item之间的数据合并)
 * 配置: DataParser: { merge: string, target: true }[]
 */
export const MergePlugin = (pipeCallbcak: (data: any) => void): UserPlugin => {
  return (crawler, { onPipeSpider }) => {
    const idsMap = new Map<string, any>();
    onPipeSpider(({ url, matchOption }) => {
      let id = md5(url);
      // const isGetChildren = matchOption.isGetChildren;
      let data = idsMap.get(id);
    });
  };
};
