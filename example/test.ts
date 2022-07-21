import axios from "axios";

/** 关闭雷神时间 */
async function stop() {
  const result = await axios.post("https://webapi.leigod.com/wap/login/bind", {
    code: "",
    country_code: 86,
    lang: "zh_CN",
    src_channel: "guanwang",
    user_type: "0",
    /** 用户名称 */
    username: "18328585637",
    /** 秘密经过特殊加密 */
    password: "b3069994a94093b1847b36c2b212792c"
  });

  if (result.data?.msg !== "成功") {
    throw new Error(`登录失败: ${result.data?.msg}`);
  }

  const token = result.data.data.login_info.account_token;

  const { data } = await axios.post("https://webapi.leigod.com/api/user/pause", {
    account_token: token,
    lang: "zh_CN"
  });

  console.log(data.msg);
}

// 0 0 0,6,12,18 * * * *
// 0 0 10,14,16 * * * *
stop();
