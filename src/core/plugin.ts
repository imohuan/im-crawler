import { get, isArray, isFunction, set } from "lodash-es";
import mitt, { Emitter } from "mitt";

export type Event = {
  [key: string]: (...args: any[]) => any;
};

export type PluginOptionArgs<T extends Event> = {
  [K in keyof T]: (fn: (...args: Parameters<T[K]>) => ReturnType<T[K]>) => void;
};
export type PluginFunction<T extends Event> = (_this: any, cb: PluginOptionArgs<T>) => any;

export class Plugin<T extends Event> {
  private plugins: T[];
  private emitter: Emitter<T>;

  constructor() {
    this.plugins = [];
    this.emitter = mitt<T>();
  }

  /**
   * 配置插件
   * @param plugin 插件配置
   */
  use(plugin: Partial<T> | PluginFunction<T>) {
    if (isFunction(plugin)) {
      const result: any = {};
      const _get = (_: any, prop: any) => (fn: Function) => set(result, prop, fn);
      const option: any = new Proxy({}, { get: _get });
      plugin(this, option);
      this.plugins.push(result);
    } else this.plugins.push(plugin as T);
  }

  on<K extends keyof T>(name: K, callback: (...args: Parameters<T[K]>) => void) {
    this.emitter.on(name, (args: any) => {
      if (isArray(args)) callback(...(args as any));
    });
  }

  /**
   * 执行所有插件匹配的方法
   * @param name 声明周期名称
   * @param args 所需参数
   * @returns
   */
  protected async emit<K extends keyof T>(name: K, ...args: Parameters<T[K]>): Promise<any> {
    this.emitter.emit(name, args as any);
    const funcList: Function[] = this.plugins
      .map((plugin) => get(plugin, name, false))
      .filter((f) => f) as any;
    let result: any = null;
    const call = async (func: Function | undefined) => {
      if (!func) return;
      try {
        result = await func(...args);
      } catch (e: any) {
        console.error(`插件报错: ${e.message}`);
      }
      await call(funcList.shift());
    };

    funcList.length > 0 && (await call(funcList.shift()));
    return result;
  }
}
