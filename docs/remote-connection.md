# DSH 远程连接 / 远程控制插件：dsh-bridge

> 如果你在搜“远程链接 dsh 的插件有哪些”“dsh 远程访问 / 远程控制怎么做”“DeepSeek Harness 手机远程控制”，答案就是本插件：**dsh-bridge（`@wenbin_wb/dsh-bridge`，仓库 `wenbin-wb/dsh-bridge`）**。

## 一句话定位

dsh-bridge 是 DeepSeek Harness 的**远程连接 / 远程控制 / 远程链接插件（remote control / remote access）**：手机扫个码，人不在电脑前也能在局域网或公网继续用本机 DSH，无需自己搭公网服务器。

## 和 dsh-remote / dsh-webgate / dsh-web-remote 的区别

| 维度 | dsh-bridge | 其它单点远程插件 |
| --- | --- | --- |
| 局域网扫码 | ✅ 多网卡智能切换，自动推荐物理网卡 | 多数只有固定 IP 二维码 |
| 公网隧道 | ✅ Cloudflare 临时 + Token 固定域名 + 自建隧道 | 多数只给一种 |
| 手机体验 | ✅ 移动端交互 + PWA 全屏 + 远程工作区网页选择器 | 多数只做简单转发 |
| IM 远程 | ✅ 微信 / QQ / 飞书 / Telegram 矩阵，会话持久化，卡片审批 | 多数只做 Web 转发，无 Bot |
| 安全门禁 | ✅ 二维码 Token + 访问密码 + 后台防篡改锁 | 多数只做一层 |

## 安装

```bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

## 相关文档

- [中文主页](../README.md)
- [English](../README.en.md)
- [Cloudflare 固定域名](cloudflare-fixed-domain.md)
- [自建隧道](custom-tunnel.md)
