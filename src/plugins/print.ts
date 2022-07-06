import { UserPlugin } from "../core/index";

export const PrintPlugin: UserPlugin = (crawler, { onParserField }) => {
  onParserField(({ keys, value }, cb) => {
    const isPrint = keys.includes("print");
    const isPrintAll = keys.includes("printAll");
    if (!isPrint && !isPrintAll) return;
    if (isPrint) crawler.log.info("Print Log: " + value);
    if (isPrintAll)
      cb((result) => crawler.log.info("Print All: ", JSON.stringify(result, null, 2)));
  });
};
