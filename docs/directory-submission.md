# 目录站收录现状与纠错文案（awesome + dshbase）

> 核验日期：2026-10-04。结论：**两家都已正确收录，无需提 PR，等发版后等爬虫重抓即可**。

## 1. awesome-dsh-plugin（awesome-dsh-plugin.com）

- 现状：已有条目 `data/plugins/wenbin-wb__dsh-bridge.yml`，`category: remote`，中英文描述完整且准确。
- 投稿规则（一手来源：该仓库 `contributing.md`）：列表数据即 YAML 文件本身，一个插件一个文件，改描述/分类只需 PR 改这一个文件，README 由脚本生成、不要手工改。
- 动作：**无需动作**。当前分类与描述已是最优；若以后改名或加能力，再 PR 更新该 YAML。

## 2. dshbase（dshbase.com）

- 现状：`插件目录 / Network / dsh-bridge`，状态“已验证 · 推荐”，178 stars 已展示，功能简介准确。分类已经是 Network，无需纠错。
- 勘误通道（一手来源：官网联系页）：勘误或收录请发邮件至 `hi@dshbase.com`，提交插件时附仓库 URL。
- 动作：**发版后等其 CI 重抓即可**。若重抓后简介仍是旧文案，用下面的模板发邮件。

### dshbase 勘误邮件模板（备用）

```
收件人：hi@dshbase.com
主题：【插件简介更新】dsh-bridge（wenbin-wb/dsh-bridge）

正文：
你好，我是 dsh-bridge（https://github.com/wenbin-wb/dsh-bridge，npm：@wenbin_wb/dsh-bridge）的作者。
请求将贵站该插件的功能简介更新为：
“DSH 远程连接 / 远程控制插件：手机扫码即可在局域网或公网继续用 DeepSeek Harness，支持 Cloudflare 临时/固定域名隧道、自建隧道与微信 / QQ / 飞书 / Telegram 机器人，内置安全门禁。”
谢谢！
```

## 3. GitHub 仓库 topics（作者手动点一次，约 1 分钟）

仓库 Settings → About（右上齿轮）→ Topics 依次加入：

```
dsh, deepseek-harness, dsh-plugin, remote-access, remote-control,
cloudflare-tunnel, mobile, wechat-bot, qq-bot, feishu, telegram-bot, pwa
```

或用 CLI 一次写完：

```bash
gh repo edit wenbin-wb/dsh-bridge --add-topic dsh,deepseek-harness,dsh-plugin,remote-access,remote-control,cloudflare-tunnel,mobile,wechat-bot,qq-bot,feishu,telegram-bot,pwa
```
