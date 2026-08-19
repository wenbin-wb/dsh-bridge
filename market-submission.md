# dsh-bridge 插件市场收录总览

> 本文记录 dsh-bridge 在所有 DeepSeek Harness 插件市场的收录提交情况。
> 当前版本：`@wenbin_wb/dsh-bridge@1.0.9`

---

## 已通过 API 自动提交的渠道

### 1. libukai/awesome-deepseek-harness（社区精选列表）
- **仓库**: https://github.com/libukai/awesome-deepseek-harness
- **状态**: ✅ **PR 已提交**
- **PR 链接**: https://github.com/libukai/awesome-deepseek-harness/pull/46
- **位置**: README「浏览器、视觉与界面」分类下
- **收录方式**: 通过 GitHub API fork + 推送分支 + 创建 PR

### 2. linxiecoder/deepseek-harness-plugins（第三方插件集合）
- **仓库**: https://github.com/linxiecoder/deepseek-harness-plugins
- **状态**: ✅ **PR 已提交**
- **PR 链接**: https://github.com/linxiecoder/deepseek-harness-plugins/pull/1
- **位置**: README 插件表格新增一行
- **收录方式**: 通过 GitHub API fork + 推送分支 + 创建 PR

### 3. cccakeee/awesome-dsh-plugins（deepseekharnessplugins.com 数据源）
- **仓库**: https://github.com/cccakeee/awesome-dsh-plugins
- **状态**: ⏳ **Issue 已提交（需官方核验）**
- **Issue 链接**: https://github.com/cccakeee/awesome-dsh-plugins/issues/12
- **说明**: 该仓库是 **deepseekharnessplugins.com** 的唯一数据源，issue 合并后最长约 6 小时自动同步到网站
- **收录方式**: 需官方审核（要求公开源码、精确安装方法、DSH 原生证据、许可和风险说明）

### 4. tjsdyy/dshplugin（dshplugin.io 市场）
- **仓库**: https://github.com/tjsdyy/dshplugin
- **状态**: ⏳ **Issue 已提交**
- **Issue 链接**: https://github.com/tjsdyy/dshplugin/issues/8
- **收录方式**: 通过 GitHub API 创建 issue（README 指定的 plugin-submission 标签需特殊权限，已用普通 issue 提交）

### 5. cordis.run（DeepSeek Harness 插件市场）
- **网站**: https://cordis.run
- **状态**: 📝 **用户已手动提交**
- **说明**: 交给用户操作完成的提交

### 6. GitHub 仓库 topics（自动抓取收录）
- **状态**: ✅ **已完成**
- 已添加 topics: `dsh-plugin`, `deepseek-harness`, `deepseek-harness-plugin`, `dsh`, `remote-access`, `tunnel`, `cloudflare`, `websocket`, `mobile`, `smartphone`, `tablet`, `qr-code`, `deepseek`
- 说明: 多个自动同步市场（2BingLing/dsh-market 等）靠 GitHub topic `dsh-plugin` 自动抓取

---

## 统一提交内容模板

以下内容用于上述各渠道（PR 描述 / issue 正文）：

### 插件信息

- **名称**: dsh-bridge
- **仓库**: https://github.com/wenbin-wb/dsh-bridge
- **npm**: `@wenbin_wb/dsh-bridge`（最新 1.0.9）
- **许可证**: MIT
- **GitHub topics**: `dsh-plugin`, `deepseek-harness`, `remote-access`, `tunnel`, `mobile`

### 功能简介（突出移动端 / 免服务器价值）

**英文**
Multi-channel remote access for DeepSeek Harness: scan a QR code with your phone and keep working anytime, anywhere — from your sofa, another room, or across the world, without sitting at your desk or setting up your own public server.

**中文**
DSH 多通道远程访问插件：手机扫个码，人不在电脑前也能继续用 DSH。躺在沙发上、出差在外、跨网访问都能接着干，不用自建公网服务器。

### 特性 / Features

- **局域网访问**: 手机/平板扫码，同一 Wi-Fi 直接访问，躺着也能在手机上接着聊
- **Cloudflare 隧道**: 一键暴露公网地址，随时随地连接，无需自建公网服务器
- **自建隧道**: 连接自己的隧道服务器，获得固定域名
- **IM 集成（规划中）**: 微信 / QQ / 飞书 / OpenClaw

### 安装 / Install

``````bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge
``````

### DSH 原生加载证据

- `package.json` 声明 `dsh.bundle.patch`（指向 `cordis.patch.yml`）与 `dsh.client.platform: web`
- 已加 GitHub topic: `dsh-plugin`, `deepseek-harness`, `remote-access`, `tunnel`, `mobile`
- 在真实 DSH 环境验证可用（局域网 QR、Cloudflare、自建隧道三条通道）

### 文档 / Docs

- 英文: https://github.com/wenbin-wb/dsh-bridge/blob/main/README.md
- 中文: https://github.com/wenbin-wb/dsh-bridge/blob/main/README.zh-CN.md
- 自建隧道教程: https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/custom-tunnel.md

---

## 待办 / 后续操作

### 需要人工确认的
- [ ] **cccakeee/awesome-dsh-plugins #12**: 等待维护者核验合并
- [ ] **tjsdyy/dshplugin #8**: 等待维护者处理（可能需要重新带 plugin-submission 标签）
- [ ] 之前的 PR #46 和 #1: 等待合并

### 可主动补充的渠道（未提交）
- **2BingLing/dsh-market**: https://github.com/2BingLing/dsh-market/issues（中文搜索 + 五维评分，可提交 issue 加快收录）
- **bradeGithub/DSH-Plugins-Marketplace**: https://github.com/bradeGithub/DSH-Plugins-Marketplace/issues
- **deepseek-ai/awesome-deepseek-integration**: 官方集成列表

---

## 敏感信息说明

- npm/GitHub token 保存在 `C:\Users\Administrator\IdeaProjects\dsh-remote\.credentials`（已被 .gitignore 排除，不会提交到仓库）
- 所有收录提交均通过 GitHub REST API 自动完成，无需人工复制粘贴
