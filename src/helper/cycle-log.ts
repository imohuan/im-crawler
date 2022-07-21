import { Chalk } from "chalk";
import { isObject } from "lodash-es";
import chalk from "chalk";

export interface ProgressOption {
  /** 当前数量 */
  current: number;
  /** 总数 */
  total: number;
  /** 进度条宽度 默认: 30*/
  width?: number;
  /** 完成字符 */
  complete?: string;
  /** 没有完成字符 */
  incomplete?: string;
}

export class CycleLog {
  private stream: NodeJS.WriteStream;
  private rows: number;
  private columns: number;

  constructor() {
    this.stream = process.stderr;
    this.rows = this.stream.rows;
    this.columns = this.stream.columns;
    this.stream.on("resize", this.setStatus);
  }

  private setStatus() {
    this.rows = this.stream.rows;
    this.columns = this.stream.columns;
  }

  print(...args: any[]) {
    const data = args.map((m) => (isObject(m) ? JSON.stringify(m) : m)).join("\n");
    this.stream.cursorTo(0, 1);
    this.stream.clearScreenDown();
    this.stream.write(data);
  }

  progress(option: ProgressOption) {
    const width = option?.width || 30;
    const complete = option?.complete || chalk.red.bold("—");
    const incomplete = option?.incomplete || chalk.green.bold("—");
    const progress = Math.floor((option.current / option.total) * 100 * (width / 100));
    return (
      Array.from({ length: progress }).fill(complete).join("") +
      Array.from({ length: width - progress })
        .fill(incomplete)
        .join("")
    );
  }
}
