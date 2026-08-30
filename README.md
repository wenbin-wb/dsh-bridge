# dsh-bridge

<p align="center">
  <img src="docs/banner.jpg" alt="dsh-bridge banner" width="100%" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@wenbin_wb/dsh-bridge"><img src="https://img.shields.io/npm/v/@wenbin_wb/dsh-bridge.svg?style=flat-square&color=38bdf8&logo=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@wenbin_wb/dsh-bridge"><img src="https://img.shields.io/npm/dt/@wenbin_wb/dsh-bridge.svg?style=flat-square&color=fbbf24&logo=npm" alt="npm downloads" /></a>
  <a href="https://github.com/wenbin-wb/dsh-bridge/releases"><img src="https://img.shields.io/github/v/release/wenbin-wb/dsh-bridge?style=flat-square&color=10b981&logo=github" alt="GitHub release" /></a>
  <a href="https://github.com/wenbin-wb/dsh-bridge/stargazers"><img src="https://img.shields.io/github/stars/wenbin-wb/dsh-bridge?style=flat-square&color=f43f5e&logo=github" alt="GitHub stars" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%E2%89%A522.19%20%7C%20%E2%89%A524-339933?style=flat-square&logo=node.js" alt="Node.js version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/@wenbin_wb/dsh-bridge?style=flat-square&color=a855f7" alt="license" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Security-Access%20Auth%20%2B%20PBKDF2-6366f1?style=flat-square&logo=security" alt="Security" />
  <img src="https://img.shields.io/badge/WeChat-ClawBot%20%7C%20iLink-07C160?style=flat-square&logo=wechat" alt="WeChat" />
  <img src="https://img.shields.io/badge/QQ%20Bot-OpenAPI%20v2-12B7F5?style=flat-square&logo=tencentqq" alt="QQ" />
  <img src="https://img.shields.io/badge/Feishu-WebSocket%202.0-00D6B9?style=flat-square&logo=lark" alt="Feishu" />
  <img src="https://img.shields.io/badge/Telegram-Bot%20API-24A1DE?style=flat-square&logo=telegram" alt="Telegram" />
  <img src="https://img.shields.io/badge/Cloudflare-Tunnel-F38020?style=flat-square&logo=cloudflare" alt="Cloudflare" />
</p>

<p align="center">
  <b>简体中文</b> | <a href="README.en.md">English</a>
</p>

> **DeepSeek Harness 多通道远程访问与全域安全门禁插件**
> 
> 手机扫个码，人不在电脑前也能继续用 DeepSeek Harness。无论躺在沙发上、出差通勤、还是跨网协作——都不用守着电脑，也不用自己搭服务器，扫码即可在手机、平板或任意设备上接着干。
> 
> 将您本地运行的 DeepSeek Harness 无缝延伸至手机网页、PWA 原生全屏应用、公网安全隧道、以及 **微信 / QQ / 飞书 / Telegram** 机器人矩阵。随时随地调度 AI 编写代码、执行任务、审批操作与管理工作区。

---

## 目录

- [✨ 核心特性](#-核心特性)
- [📦 安装与升级](#-安装与升级)
- [🚀 快速上手](#-快速上手)
  - [1. 🛜 局域网访问与多网卡智能切换](#1-🛜-局域网访问与多网卡智能切换)
  - [2. 🌐 公网安全隧道（Cloudflare / 自建隧道）](#2-🌐-公网安全隧道cloudflare--自建隧道)
  - [3. 🤖 全能 IM 机器人矩阵（微信 / QQ / 飞书 / Telegram）](#3-🤖-全能-im-机器人矩阵微信--qq--飞书--telegram)
  - [4. 🗂️ 远程工作区网页选择器](#4-🗂️-远程工作区网页选择器)
  - [5. 🔐 全域安全认证与防篡改门禁](#5-🔐-全域安全认证与防篡改门禁)
  - [6. 📊 运维监控看板与一键平滑重启](#6-📊-运维监控看板与一键平滑重启)
- [💬 常见问题 (FAQ)](#-常见问题-faq)
- [🛠️ 开发与贡献](#️-开发与贡献)
- [📄 开源协议](#-开源协议)

---

## ✨ 核心特性

| 领域 | 功能亮点 | 说明 |
| :--- | :--- | :--- |
| **🛜 局域网访问** | **多网卡智能识别 & 可视化切换** | 自动过滤虚拟网卡，优先推荐物理 Wi-Fi / 有线网卡；支持多网卡（WSL/VMware/Docker）下拉切换与记忆持久化 |
| **🌐 公网隧道** | **临时随机域名 + Token 固定域名** | 免登录一键生成 Cloudflare 临时隧道；支持 Cloudflare Token 固定域名随 DSH 自启；支持自建 WebSocket 隧道 |
| **🤖 IM 机器人** | **微信 / QQ / 飞书 / Telegram** | 4 大主流平台全覆盖；支持多工作区调度、跨重启会话持久化、Markdown 打字机流式输出、卡片一键审批与文件双向传输 |
| **📱 移动端体验** | **原生级交互 & PWA 独立全屏** | 动态居中标题、原生侧边栏抽屉与 `[|` 收起图标、防重叠自适应工具栏、支持添加到主屏幕作为原生 App 运行 |
| **🗂️ 远程工作区** | **网页端树形目录选择器** | 手机/远程设备点击添加工作区弹出响应式文件树浏览；电脑本机物理点击自动分流调用系统原生对话框 |
| **🔐 安全认证** | **全域门禁与两道防线** | 专属二维码免密 Token + 外部访问密码认证 + 独立管理控制台防篡改锁；内置宿主机最高特权与终端救急重置 |
| **📊 运维看板** | **系统看板 / 网络诊断 / 配置备份** | 实时掌握 CPU / 内存 / Uptime；一键测试端口与隧道网络连通性；全局配置一键 JSON 导出与恢复 |
| **🔄 平滑升级** | **高速检查 + 一键升级 + 平滑重启** | npmmirror 毫秒级双源检查；自动补齐 macOS / Linux 环境变量与 Node 兄弟二进制绑定；升级后支持一键重启 DSH |

---

## 📦 安装与升级

### 环境要求

1. **Node.js ≥ 22**（DSH 要求 `^22.19.0` 或 `≥ 24.0.0`）
2. **dsh CLI 可用**（能在终端执行 `dsh` 命令）

```bash
# 检查环境版本
node -v   # 应显示 v22.19+ 或 v24+
dsh --version
```

### 安装插件

```bash
# 方式一：从 npm 全局安装（推荐）
dsh plugin --profile web add @wenbin_wb/dsh-bridge

# 方式二：免全局权限的 npx 安装
npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge

# 方式三：从 GitHub 源码安装
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

### 升级至最新版本

```bash
# 推荐：在 Web 控制台「远程访问」底部直接点击「🚀 一键升级并重启」

# 或通过终端强制覆盖安装最新版：
dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest
```

> 💡 **提示（pnpm 11 用户）**：如果升级后仍显示旧版，是由于 pnpm 11 的 `minimumReleaseAge` 机制限制。在 Web 控制台点击「一键升级」即可自动跳过限制安装最新版。

---

## 🚀 快速上手

启动 DeepSeek Harness 后，在左侧设置面板找到 **「远程访问」** 即可开启全部功能：

<p align="center">
  <img src="docs/screenshots/lan-access.jpg" width="48%" alt="局域网访问控制台" />
  <img src="docs/screenshots/tunnel-access.jpg" width="48%" alt="公网隧道配置" />
</p>

---

### 1. 🛜 局域网访问与多网卡智能切换

插件启动后**自动随服务开启**局域网代理，无需手动敲命令。

* **零配置极速扫码**：手机与电脑连接同一 Wi-Fi，直接打开手机相机扫码即可直达移动端 Web 界面；
* **多网卡智能分流与切换**：
  * 当宿主机同时存在多张网卡（如物理 Wi-Fi、以太网、WSL 虚拟网卡、VMware、Docker 等）时，控制台自动显示 **「🛜 局域网网卡 / IP 选择」** 下拉框；
  * 自动智能评分并高亮推荐物理网卡；如需切换网卡，点选后二维码与访问 URL 秒级联动更新并**自动持久化保存**。

---

### 2. 🌐 公网安全隧道（Cloudflare / 自建隧道）

无需公网 IP 与路由器端口映射，随时随地从外网访问电脑上的 DeepSeek Harness：

* **Cloudflare 免登录临时隧道（默认）**：
  * 点击「开启」按钮，系统全自动下载并运行 `cloudflared`（macOS / Windows / Linux 全架构自动适配与权限自愈）；
  * 几秒内生成随机公网 `https://*.trycloudflare.com` 临时链接与二维码。
* **Cloudflare Token 固定域名（永久不变 · 免费）**：
  * 在 [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/) 免费创建 Tunnel 并绑定自己的域名；
  * 在高级配置中填入 Tunnel Token 与自定义域名并勾选 **「随 DSH 启动自动开启」**，重启后域名永久固定不变！
* **自建 WebSocket 隧道**：
  * 支持连接个人 VPS 自建中转服务器（[查看自建隧道部署教程](docs/custom-tunnel.md)），具备数据端到端 gzip 压缩与 SSE 响应优化。

---

### 3. 🤖 全能 IM 机器人矩阵（微信 / QQ / 飞书 / Telegram）

无需打开浏览器，直接在常用聊天软件中与本地 Agent 对话、下达任务、接收进度与审批操作：

<p align="center">
  <img src="docs/screenshots/wechat-chat.jpg" width="23%" alt="微信对话与审批" />
  <img src="docs/screenshots/qq-chat.jpg" width="23%" alt="QQ 机器人交互" />
  <img src="docs/screenshots/feishu-chat.jpg" width="23%" alt="飞书卡片流式打字机" />
  <img src="docs/screenshots/telegram-bot-config.jpg" width="23%" alt="Telegram 机器人配置" />
</p>

#### 各平台接入与亮点概览

| IM 平台 | 通信协议 | 公网要求 | 交互亮点 | 文档指引 |
| :--- | :--- | :--- | :--- | :--- |
| **微信 (WeChat)** | 腾讯官方 iLink Bot API | 100% 免公网 | 个人号扫码秒登；多工作区调度；媒体文件互传；跨重启会话持久化 | [微信配置文档](docs/wechat-usage.md) |
| **QQ 机器人** | 腾讯 QQ OpenAPI v2 | 100% 免公网 | 官方 AppID 接入；单聊 / 群聊 @交互；Markdown 排版；快捷消息按钮 | [QQ 配置文档](docs/qq-usage.md) |
| **飞书 (Feishu)** | 官方 WebSocket 2.0 长连接 | 100% 免公网 | 企业自建应用直连；Card 2.0 原生打字机流式更新；交互卡片一键点击审批 | [飞书配置文档](docs/feishu-usage.md) |
| **Telegram** | 官方 Bot API (Long Polling) | 100% 免公网 | 内置零依赖 HTTP/HTTPS 代理；`/ ` 快捷菜单；Inline 卡片审批；实时流式打字 | [Telegram 配置文档](docs/telegram-usage.md) |

#### 统一 IM 交互指令表

在任何已连接的 IM 聊天窗口中，均可使用以下标准化指令：

| 指令 | 说明 | 示例 |
| :--- | :--- | :--- |
| *(直接发文字)* | 驱动当前活动 Agent 进行思考与编码 | `帮我写一个快速排序算法` |
| `/sessions` 或 `/list` | 查看所有会话列表（按工作区分组排版） | `/sessions` |
| `/use N` 或 `/resume N` | 快速切换到指定编号的会话 | `/use 2` |
| `/rename <新标题>` | 重命名当前活动会话 | `/rename 重构认证模块` |
| `/workspaces` | 列出已在 DSH 注册的所有工作区目录 | `/workspaces` |
| `/addworkspace <路径>` | 远程向电脑注册添加新的项目文件夹 | `/addworkspace D:/Projects/app` |
| `/new <提示词>` | 在当前工作区创建并开始新会话 | `/new 编写单元测试` |
| `/new <提示词> @N` | 在指定工作区序号下直接新建会话 | `/new 修复登录 Bug @2` |
| `/stop` | 立即中断当前正在运行的任务 | `/stop` |
| `/end` | 结束并挂起当前会话上下文 | `/end` |
| `/yes` / `/no` (或 `1`/`2`) | 响应 Agent 的敏感操作权限审批 | `/yes` |
| `/status` | 查看 Agent 状态与系统摘要看板 | `/status` |
| `/help` | 查看完整的指令与快捷按键帮助 | `/help` |

---

### 4. 🗂️ 远程工作区网页选择器

针对手机端或远程浏览器无法唤起本地电脑文件选择窗的痛点，内置专为移动端打造的网页树形目录浏览器：

<p align="center">
  <img src="docs/screenshots/mobile-workspace-picker.jpg" width="360" alt="移动端远程工作区网页选择器" />
</p>

* **智能分流**：电脑本机访问（`127.0.0.1`）点击添加工作区直接呼出系统原生文件弹窗；手机或远程访问时自动弹出响应式底部目录抽屉；
* **极速直达**：支持 Windows 驱动器盘符（C盘、D盘）以及系统常用目录（桌面、文稿、下载、Projects）一键直达，支持层级深入浏览与手动输入校验。

---

### 5. 🔐 全域安全认证与防篡改门禁

打开控制台 **「安全认证」** Tab，为您的本地开发环境构筑银行级安全防线：

<p align="center">
  <img src="docs/screenshots/remote-auth-login.jpg" width="48%" alt="外部访问安全认证登录页" />
  <img src="docs/screenshots/admin-lock-screen.jpg" width="48%" alt="管理控制台防篡改锁定" />
</p>

* **第一道防线：外部访问门禁**
  * **扫码免密 + 密码认证**：控制台生成的二维码自带 256-bit 专属加密 Token，手机扫码一秒直入；手动输入 IP 或公网域名的设备强制输入访问密码；
  * **通道隔离分流**：支持「全部通道防护 / 仅公网隧道开启防护 (局域网免密) / 仅局域网防护」三种策略。
* **第二道防线：管理后台防篡改锁**
  * 独立管理员密码，远程访问设备默认全屏锁定网络与密钥设置，输入管理密码方可解锁；
  * 支持配置为「仅限电脑本机管理」，远程设备完全杜绝接触核心配置。
* **三大容灾保命体系（永不自锁）**：
  * 💻 **物理机免密直通**：宿主电脑本机（`127.0.0.1`）永久享有最高物理特权，永不锁死；
  * 🚑 **终端一秒救急重置**：极端忘记密码时，在宿主机终端执行 `touch ~/.dsh-bridge/reset-auth`（或 `~/.dsh/dsh-bridge/reset-auth`）即可毫秒级清空密码恢复免密；
  * ❓ **全局求助引导**：所有认证界面均内置交互式救助指引。

---

### 6. 📊 运维监控看板与一键平滑重启

<p align="center">
  <img src="docs/screenshots/mobile-remote-settings.jpg" width="360" alt="运维监控看板与系统状态" />
</p>

* **📊 宿主系统运行监控看板**：实时展示 CPU 核心型号、系统总内存与实时占用率、Node 进程堆内存与 DSH 服务连续运行时间（Uptime）；
* **🔍 网络连通性一键诊断**：一键排查反向代理本地端口、局域网 IPv4、Cloudflare Anycast 边缘网络及国内 npm 镜像源延迟；
* **🗄️ 全局配置一键备份与迁移**：支持导出/导入包含 Token、白名单与隧道参数的 `.json` 备份包，重装系统一键还原；
* **🔄 平滑优雅重启**：支持在界面点击一键重启 DSH 服务，自动断线重连并自动刷新前端。

---

## 💬 常见问题 (FAQ)

<details>
  <summary><b>Q1: 手机扫码后提示无法连接或打不开页面？</b></summary>
  <br/>

  1. **检查 Wi-Fi 连接**：确保手机和电脑连接在同一个局域网（Wi-Fi）下，且路由器未开启「AP 隔离」；
  2. **多网卡切换**：如果电脑安装了 WSL、VMware、Hyper-V 或开启了 VPN，默认 IP 可能会匹配到虚拟网段。在控制台的 **「🛜 局域网网卡 / IP 选择」** 下拉框中切换为物理 Wi-Fi / 以太网 IP 即可；
  3. **防火墙放行**：确认操作系统防火墙允许 Node.js 监听 `3082` 端口；
  4. **使用公网隧道**：若跨网段或在公司内网，建议直接开启「Cloudflare 隧道」进行外网扫码访问。
</details>

<details>
  <summary><b>Q2: 微信 / QQ / 飞书 / Telegram 机器人的消息安全如何保障？其他人发消息会被执行吗？</b></summary>
  <br/>

  1. **严格白名单机制（Allowlist）**：插件内置基于发件人 ID 的严格白名单。只有白名单内的授权用户消息才会驱动 Agent 执行；
  2. **初次自动授权**：扫码或配置完成后，管理员向 Bot 发送第一条消息即自动完成白名单绑定；
  3. **陌生消息静默阻断**：所有非白名单人员或群聊内非授权成员的消息均会被底层直接丢弃（Never fed to LLM），绝不消耗 Token 也不会触发任何本地指令。
</details>

<details>
  <summary><b>Q3: Cloudflare 隧道临时域名与固定域名（Token 模式）有什么区别？</b></summary>
  <br/>

  1. **临时免登录模式（默认）**：无需 Cloudflare 账号，一键开启即刻生成 `https://*.trycloudflare.com` 随机临时网址，适合外出时临时连接；
  2. **固定域名模式（Token 模式）**：在 Cloudflare Zero Trust 控制台创建 Named Tunnel 并填入 Token，可绑定您自己的专属固定域名（如 `dsh.yourdomain.com`）。开启「随 DSH 启动自动开启」后，重启电脑或服务域名永久固定不变。
</details>

<details>
  <summary><b>Q4: 插件升级或重启 DSH 服务后，已有配置和聊天会话会丢失吗？</b></summary>
  <br/>

  1. **配置永久持久化**：所有 IM 凭证、授权白名单、公网隧道选项与安全密码均保存在系统主目录（`~/.dsh-bridge/`），升级与重启完全无损；
  2. **会话无感恢复**：会话历史由 DSH 核心引擎持久化管理，重启后在聊天软件中发送消息或使用 `/resume` 命令即可自动恢复上下文；
  3. **一键备份迁移**：支持在「运维监控」Tab 内一键导出全局配置 `.json` 文件，方便跨设备迁移。
</details>

---

## 🛠️ 开发与贡献

欢迎提交 Issue 与 Pull Request 共同完善插件！

```bash
# 1. 克隆代码仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge

# 2. 安装依赖并启动构建
npm install
npm run build:client

# 3. 运行全量单元测试
npm test

# 4. 安装到本地 DSH Web Profile 进行联调
dsh plugin --profile web add .
```

---

## 📄 开源协议

本项目基于 [MIT 许可证](LICENSE) 开源发布。
