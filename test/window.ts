import { resolve } from "path";

import { asyncHtml, getChromeExtension, initElectronContent } from "../src";

async function init() {
  const browser = await initElectronContent();

  /** 不加载图片 */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   images: false
  // });

  /** 不加载图片和脚本 */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   images: false,
  //   javascript: false
  // });

  /** 过滤掉某一张图片（测试成功，后期测试可能图片会该改变需要替换成其他的） */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   devTool: true,
  //   filterUrl: [
  //     // /https:\/\/i0\.hdslb\.com\/bfs\/bangumi\/image\/0a1b2c2f3443ad1fcef6f98fd35c4ddaa1abdc83\.png/,
  //     "https://i0.hdslb.com/bfs/bangumi/image/0a1b2c2f3443ad1fcef6f98fd35c4ddaa1abdc83.png"
  //   ]
  // });

  /** 添加插件，因electron不支持很多插件功能，所以全是插件报错 */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   devTool: true,
  //   extensions: [getChromeExtension("ijllcpnolfcooahcekpamkbidhejabll")]
  // });

  /** 基础自动化 */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   // devTool: true,
  //   controller: [
  //     // 自动滚动 并且等待1s
  //     { autoScroll: {}, wait: 1000 },
  //     // 聚焦
  //     { focus: ".nav-search-input" },
  //     // 输入
  //     { input: "hello" },
  //     // 输入延迟
  //     { input: { value: "Fuck you mother!", delay: 100 } },
  //     // 键盘按钮 (!! 输入abc，然后全选删除)
  //     { keyboard: "a" },
  //     { keyboard: "b" },
  //     { keyboard: { key: "c", type: "press" } },
  //     { keyboard: { key: ["ControlLeft", "a"], type: "group" } },
  //     { wait: 500 },
  //     { keyboard: { key: "Delete", type: "press" } },
  //     { wait: 500 },
  //     // 点击 class
  //     { click: ".nav-search-btn" }, // { cls: "",  button: "", count: 1, delay: 10}
  //     {
  //       screenshot: {
  //         fullPage: true,
  //         path: resolve(__dirname, "___1.png")
  //       }
  //     }
  //   ]
  // });

  asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
    show: true,
    async controllerFun(auto) {
      await auto.autoScroll({});
      await auto.wait(1000);
      await auto.focus(".nav-search-input");
      await auto.input("hello");
      await auto.input({ value: "Fuck you mother!", delay: 100 });
      await auto.keyboard("a");
      await auto.keyboard("b");
      await auto.keyboard({ key: "c", type: "press" });
      await auto.keyboard({ key: ["ControlLeft", "a"], type: "group" });
      await auto.wait(500);
      await auto.keyboard({ key: "Delete", type: "press" });
      await auto.wait(500);
      await auto.click(".nav-search-btn");
      await auto.screenshot({ fullPage: true, path: resolve(__dirname, "___1.png") });
    }
  });

  /** 插入JS, Css */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   devTool: true,
  //   controller: [
  //     { insertCSS: "body { background: red!important }" },
  //     { insertJavaScript: "console.log(123)" },
  //     { wait: 1000000 }
  //   ]
  // });

  /** 插入JS, Css */
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   devTool: true,
  //   controller: [
  //     { insertCSS: "body { background: red!important }" },
  //     { insertJavaScript: "console.log(123)" },
  //     { wait: 1000000 }
  //   ]
  // });

  // Wait class
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   devTool: true,
  //   controller: [
  //     // 当前操作为同步
  //     {
  //       insertJavaScript: `
  //         console.log("进入");
  //         setTimeout(() => {
  //           console.log("开始执行");
  //           const oDiv = document.createElement("div");
  //           oDiv.classList.add("hello-world");
  //           document.body.appendChild(oDiv);
  //         }, 3000);
  //         `,
  //       async: false
  //     },
  //     // 等待class
  //     { wait: ".hello-world" }
  //   ]
  // });

  // wait 函数 (拉动窗口宽度查看效果|日志)
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   devTool: true,
  //   controller: [{ wait: () => window.innerWidth < 400 }, { wait: "Fn::window.innerWidth > 700" }]
  // });

  // Move
  // asyncHtml(browser, "https://element-plus.gitee.io/zh-CN/component/slider.html", {
  //   show: true,
  //   controller: [
  //     { wait: ".el-slider" },
  //     {
  //       move: {
  //         cls: ".el-slider",
  //         start: { x: 0, y: 10 },
  //         list: [
  //           { x: -10, y: 10 },
  //           { x: 10, y: 10 },
  //           { x: -10, y: 10 },
  //           { x: 10, y: 10 },
  //           { x: -10, y: 10 },
  //           { x: 10, y: 10 },
  //           { x: -10, y: 10 },
  //           { x: 10, y: 10 }
  //         ],
  //         steps: 30
  //       }
  //     }
  //   ]
  // });

  // Cookie 用户代理 设备
  // asyncHtml(browser, "https://www.bilibili.com/", {
  //   show: true,
  //   devTool: true,
  //   controller: [
  //     {
  //       // device: "iPhone 13 Pro",
  //       setCookie: "imohuan=hello;"
  //     },
  //     {
  //       userAgent:
  //         "Opera/9.25 (Windows NT 5.1; U; en), Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9"
  //     },
  //     {
  //       insertJavaScript: `console.log("UserAgent: ", navigator.userAgent);\nconsole.log("Cookie", document.cookie)`
  //     },
  //     { wait: 1000000 }
  //   ]
  // });

  // 节点截图
  // asyncHtml(browser, "https://www.bilibili.com/anime/?spm_id_from=333.1007.0.0", {
  //   show: true,
  //   controller: [
  //     {
  //       screenshotForSelector: { cls: ".bili-header__banner", path: resolve(__dirname, "___1.jpg") }
  //     },
  //     { wait: 1000000 }
  //   ]
  // });
}

init();
