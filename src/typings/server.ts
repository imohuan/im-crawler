export interface ServerOption {
  /** 最大同时开启多少个Electron窗口 */
  max: number;
  /** 端口 */
  port: number;
  /** 静态资源地址 */
  static: string;
}
