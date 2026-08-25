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
> 手机扫个码，人不在电脑前也能继续用 DeepSeek Harness。躺在沙发上、出差在外、跨网访问——都不用守着电脑，也不用自己搭公网服务器，扫码就能在手机/平板或任意设备上接着干。
> 
> 把你本地的 DeepSeek Harness 无缝延伸到手机、平板、公网、甚至微信 / QQ / 飞书 / Telegram。无论你在哪，都能通过扫码、网页或 IM 机器人，随时调用你的 AI 助手。

---

## 功能特性

- **🔐 全套访问安全认证与后台防篡改（v2.5.0 重磅）**：
  - **第一道防线（外部访问门禁）**：二维码自带专属 Token 扫码一秒免密直入；手动输入 IP 或公网域名强制验证密码；支持「全部防护 / 仅公网 / 仅局域网」精准通道分流；
  - **第二道防线（管理控制台防篡改）**：独立管理员密码，远程设备进入控制台全局锁定网络配置与 IM 机器人密钥，支持「需密码解锁 / 仅电脑本机管理 / 宽松直管」；
  - **三重容灾保命体系**：电脑本机（`127.0.0.1`）永久最高物理特权（永不自锁） + 终端 `touch ~/.dsh/dsh-bridge/reset-auth` 一秒救急重置 + 全界面忘记密码求助引导；
  - **金融级安全引擎**：PBKDF2 + SHA-256 加盐哈希安全存储、30 天 HttpOnly SameSite 会话、单 IP 连续 5 次错误封禁 60 秒防暴力破解。
- **📱 移动端与触控交互深度适配**：针对手机端排版与触控操作深度优化。极简轻量顶栏、快速新建、滑动手势抽屉，以及全自适应设置中心（彻底告别文字挤压折行）
- **局域网访问**：手机/平板扫码，同一 Wi-Fi 直接访问，躺着也能在手机上接着聊
- **Cloudflare 隧道**：一键暴露公网地址，随时随地连接，出差在外、不在家也能接着干，无需自建公网服务器
- **自建隧道**：连接自己的隧道服务器，获得固定域名（[搭建教程](docs/custom-tunnel.md)）
- **微信 Bot（ClawBot / iLink）**：扫码登录微信个人号后，直接在微信里对话、控制 DeepSeek Harness 的 agent。**支持多工作区选择、会话跨重启持久化、按工作区分组查看、媒体（图片/文件/语音）收发、权限审批**——走腾讯官方 iLink Bot API，无需公网（[使用说明](docs/wechat-usage.md)）
- **QQ Bot（OpenAPI v2）**：接入 QQ 机器人，私聊/群聊接收消息，发送 Markdown、按钮键盘和富媒体。**完整事件覆盖（C2C / GROUP_AT_MESSAGE_CREATE）、Token 自动刷新、断线重连、消息去重**——走腾讯官方 QQ Bot OpenAPI v2（[使用说明](docs/qq-usage.md)）
- **飞书 Bot（官方 WebSocket 长连接）**：接入飞书开放平台企业自建应用，私聊/群聊实时交互。**无需公网 IP / 无需 Webhook、支持飞书 Markdown 表格排版、原生交互卡片权限审批一键点击确认**——走飞书官方最新 WebSocket 长连接协议（[使用说明](docs/feishu-usage.md)）
- **Telegram Bot（官方 Bot API + 代理支持）**：接入官方 Telegram 机器人，单聊/群聊实时交互。**无需公网 IP（长轮询 getUpdates）、内置零依赖 HTTP/HTTPS 代理隧道、打字机平滑流式输出、原生快捷指令菜单（Menu 按钮）与 Inline 交互卡片审批**（[使用说明](docs/telegram-usage.md)）
- **IM 官方品牌矢量图标**：微信、QQ、飞书、Telegram 官方矢量图标与状态展示，直接在聊天软件里呼唤你的 Agent
- **极速版本检查与一键升级**：国内高速镜像（npmmirror）优先 + 官方源毫秒级双通道检查，检测到新版本支持**界面一键直接升级**，无需手动打开终端
- **深色模式深度适配**：完美适配 DeepSeek Harness 设计系统明暗主题切换，二维码自带白底安全垫，暗光下手机扫码 100% 极速识别

---

## 开发路线图

| 目标 | 说明 | 状态 |
|------|------|------|
| **访问安全认证** | 外部访问门禁拦截 + 管理后台防篡改锁 + 三重容灾保命体系 | ✅ **已完成**（v2.5.0） |
| **Telegram** | 适合自托管与海外的 IM 渠道（免公网长轮询 / 代理支持 / 原生菜单 / Inline 卡片 / 流式打字机） | ✅ **已完成**（v2.4.0） |
| **飞书** | 飞书开放平台长连接机器人，办公场景直接调用（免公网 WS / 卡片审批） | ✅ **已完成**（v2.3.0） |
| **QQ Bot** | 接入 QQ 机器人，群聊/私聊唤起 Agent（Markdown / 按钮 / 富媒体） | ✅ **已完成**（v2.1.0） |
| **微信** | 在微信里直接与你的 Agent 对话（多工作区 / 会话持久化 / 媒体 / 审批） | ✅ **已完成**（v1.0.0） |
| **平台抽象层** | 平台无关的核心（会话/审批/命令/digest）跨 IM 渠道复用 | ✅ **已完成**（v2.0.0） |

---

## 环境要求

安装插件前，请先确保：

1. **Node.js ≥ 22** (DSH 要求 `^22.19.0` 或 `≥ 24.0.0`)
2. **dsh CLI 可用** — 能在终端直接运行 `dsh` 命令

```bash
# 检查 Node 版本
node -v   # 应显示 v22.19+ 或 v24+

# 检查 dsh 是否可用
dsh --version
```

如果 `dsh` 命令提示"无法识别/找不到"，先安装 DSH：

```bash
npm install -g @deepseek-ai/dsh
```

> 若没有全局安装的权限，也可以用 `npx` 方式：
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

---

## 安装

### 从 npm 安装（推荐）

```bash
# 安装最新版
dsh plugin --profile web add @wenbin_wb/dsh-bridge

# 或指定版本（如 2.6.1）
dsh plugin --profile web add @wenbin_wb/dsh-bridge@2.6.1
```

> 💡 **没有全局安装权限？** 使用 `npx` 方式：
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

### 从源码安装

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

安装完成后重启 DSH，在设置页找到「远程访问」即可使用。

### 升级到最新版

```bash
# 方式一：在设置页「远程访问」中点击「🚀 一键升级到 vX.X.X」（推荐，全自动）

# 方式二：终端强制安装最新版
dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest
```

> **注意**：`update --latest` 可能因已安装依赖的版本约束而无法升级到最新版。用上面的 `add @latest` 命令即可强制安装最新版（无需知道具体版本号）。

#### 升级后仍是旧版本？（pnpm 11 新版本过滤）

如果你刚发布后立即升级，`add @latest` 可能仍然装到旧版本。这是 **pnpm 11 的供应链安全机制 `minimumReleaseAge`**（默认过滤发布不足 24 小时的新版本）导致的，不是插件问题。

**解决方法**（任选其一）：

1. **直接在 DSH Web 设置页的「远程访问」点击「一键升级」**（自动带具体版本号安装，即刻生效）
2. **在 profile 的 `pnpm-workspace.yaml` 添加 `minimumReleaseAge: 0`**，然后重新 `pnpm install`（一劳永逸）
3. **等待 24 小时**：发布满 1 天后保护自动解除

升级完成后重启 DSH，并在浏览器**硬刷新**（Windows: `Ctrl+Shift+R`，macOS: `Cmd+Shift+R`）清除缓存，然后确认设置页显示最新版本号。

---

## 使用

### 🔐 访问安全认证与后台防篡改（v2.5.0 重磅）

打开设置页「远程访问」→「**安全认证**」Tab 即可一键启用全方位安全守护。

#### 1. 🛡️ 第一道防线：外部访问门禁（保护谁能进 Web 界面）
- **多通道分流生效**：
  - `全部通道开启防护`：局域网与所有公网隧道均需认证；
  - `仅公网隧道开启防护 (推荐)`：局域网同一 Wi-Fi 内保持免密，暴露至公网的隧道强制开启认证门禁；
  - `仅局域网开启防护`：仅对局域网进行门禁拦截。
- **三种灵活验证模式**：
  - 🟢 **扫码免密 + 密码认证 (默认推荐)**：控制台生成的二维码已自动注入 256-bit 专属安全 Token，手机扫码即可免密秒进；直接在浏览器手动输入 IP 或公网域名的访客，需输入您设置的访客访问密码；
  - 🔑 **仅密码 / PIN 码**：所有外部设备一律要求输入访问密码；
  - 🎫 **仅专属 Token 免密**：仅允许通过控制台生成的二维码或带 Token 的专属链接进入。
- **一键轮换凭据**：点击「🔄 重置安全 Token」即可使之前分享的旧二维码和链接立即全部失效。

<details>
  <summary>📱 点击展开外部访问安全认证登录页截图</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/remote-auth-login.jpg" width="600" alt="外部访问安全认证登录页" />
  </p>
</details>

#### 2. 🔒 第二道防线：管理后台防篡改（保护谁能改插件设置）
- **独立管理员密码**：访客访问密码与管理控制密码彻底分离，即使将访问密码告诉外部朋友，对方也无法查看或篡改您的插件设置；
- **三种后台权限策略**：
  - 🔑 **需密码解锁 (默认推荐)**：远程设备进入控制台时全屏锁定，输入管理密码后解锁临时会话；
  - 🛡️ **仅限电脑本机管理 (最高安全)**：远程设备一律禁止查看与修改任何网络、机器人配置与 Token，仅允许在电脑本机（`127.0.0.1`）操作；
  - 🌐 **宽松模式**：允许通过访客认证的远程设备直接管理。

<details>
  <summary>🖥️ 点击展开远程设备管理控制台防篡改锁定截图</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/admin-lock-screen.jpg" width="600" alt="管理控制台防篡改锁定" />
  </p>
</details>

#### 3. 🛟 三重容灾保命体系（永不自锁）
- **物理机免密直通**：运行 DSH 的宿主电脑（`127.0.0.1` / `localhost`）享有全局最高物理特权，**永不要求输入访问密码，设置面板永不会被锁定**；
- **服务器一键救急指令**：无头 Linux 服务器或极端忘记密码时，在宿主电脑终端执行单行命令：
  ```bash
  touch ~/.dsh/dsh-bridge/reset-auth
  ```
  插件将在毫秒级自动清空密码与策略并删除标记，瞬间恢复初始免密状态；
- **全界面忘记密码指引**：访客登录页与锁屏页均提供 `❓ 忘记密码？` 救助展开卡片。

![安全认证配置](docs/screenshots/security-auth-config.jpg)

---

### 📱 移动端与触控交互深度适配

针对手机端屏幕与触控操作进行深度优化，手机扫码或公网访问时，无需额外配置即可获得流畅自然的交互体验：

- **极简顶栏布局**：保留左侧菜单抽屉与右侧快速新建会话，顶部无冗余元素干扰，视野开阔通透；
- **原生侧边栏抽屉**：完整复用 DSH 原生历史记录与工作区分类，支持搜索、视图选项切换及会话管理，点击会话即刻平滑切换；
- **流式自适应设置面板**：重构手机端设置排版，选项与下拉框自适应纵向流式展开，药丸徽标与二维码自适应缩放，彻底解决文字挤压折行；
- **手势与触屏友好**：支持屏幕左侧边缘向右滑动唤出抽屉、向左滑动收起，支持**长按任意会话项呼出操作菜单**（重命名/分叉/归档），大圆角输入区完美贴合移动端虚拟键盘。

#### 对话与会话管理体验

<p align="center">
  <img src="docs/screenshots/remote-web-mobile.jpg" width="29%" alt="移动端新会话主页" />
  &nbsp;&nbsp;&nbsp;
  <img src="docs/screenshots/mobile-chat.jpg" width="29%" alt="移动端已有对话交互" />
  &nbsp;&nbsp;&nbsp;
  <img src="docs/screenshots/mobile-drawer.jpg" width="29%" alt="移动端原生抽屉侧边栏" />
</p>

#### 远程访问与插件设置中心

<p align="center">
  <img src="docs/screenshots/mobile-settings-lan.jpg" width="22%" alt="局域网访问控制台" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-settings-tunnel.jpg" width="22%" alt="公网隧道配置" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-settings-im.jpg" width="22%" alt="IM 机器人矩阵" />
  &nbsp;&nbsp;
  <img src="docs/screenshots/mobile-settings-security.jpg" width="22%" alt="全局访问安全认证" />
</p>

---

### 局域网访问

插件启动后自动开启，无需任何配置。打开设置页「远程访问」，用手机扫描二维码即可访问。

![局域网扫码访问](docs/screenshots/lan-access.jpg)

### Cloudflare 隧道

支持**免登录临时隧道**与**专属 Token 固定域名隧道**双模式，支持随 DSH 启动自动开启：

- **模式 1：极速免登录临时隧道（默认）**
  1. 直接点击「Cloudflare 隧道」卡片中的「开启」按钮；
  2. 首次使用会自动从 GitHub 下载 cloudflared（约 30MB）；
  3. 几秒内自动生成公网 URL 和二维码，点「重置链接」可随时换新。

- **模式 2：Cloudflare Token 固定域名（永久不变，完全免费）**
  1. 在 [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/) 免费创建 Tunnel 并绑定域名（如 `dsh.yourdomain.com`）；
  2. 展开卡片底部的 **「⚙️ 高级配置：固定域名 (Cloudflare Token)」**，填入自定义域名与 Tunnel Token 并保存；
  3. 勾选 **「随 DSH 启动自动开启」**，每次 DSH 重启即可自动恢复隧道，**URL 永久固定不变**！

![公网隧道配置](docs/screenshots/tunnel-access.jpg)

### 自建隧道

需要一台有公网 IP 的服务器（服务端环境要求 Node.js >= 18，推荐 Node.js 22 LTS）。详细搭建步骤见 [自建隧道教程](docs/custom-tunnel.md)。

1. 按教程在服务器上部署隧道服务端
2. 在「自建隧道」卡片中填写 WebSocket 地址（`wss://...`）和访问令牌
3. 点「保存配置」后点「开启」

配置自动持久化，重启后无需重新填写。

### 微信 Bot（ClawBot / iLink）

基于腾讯官方开放的微信 ClawBot 插件功能（底层 iLink Bot API），扫码登录微信个人号后，即可在微信里直接与你的 DeepSeek Harness agent 对话、控制和审批，全程走腾讯官方服务器，无需公网与隧道。

![微信 Bot 配置](docs/screenshots/wechat-bot-config.jpg)

<details>
  <summary>📱 点击展开手机微信对话与交互截图</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/wechat-chat.jpg" width="380" alt="微信对话示例" />
  </p>
</details>

**功能亮点**

- 🗂️ **多工作区**：`/workspaces` 查看工作区，`@N` 或 `@路径` 指定项目目录新建会话
- 💾 **会话持久化**：重启 DSH 后会话不丢失，直接续聊
- 🏷️ **会话标题**：`/sessions` 按工作区分组、显示每个会话的标题，一眼可辨
- 🖼️ **媒体收发**：支持图片/文件/语音（自动转文字）双向传输
- 📝 **审批问答**：敏感操作在微信里审批，超时自动拒绝
- 🔔 **状态推送**：任务进行中心跳进度 + "正在输入"指示，长回复自动分条

**使用步骤**

1. 打开设置页「远程访问」→「IM 机器人」→ 选中「微信」
2. 点「扫码登录」，用微信扫二维码并按提示确认
3. 登录成功后，**向该微信 Bot 发送第一条消息即自动完成白名单授权**（一步到位）
4. 之后就可以在微信里下命令了

**微信里的命令**（完整说明见 [微信 Bot 使用说明](docs/wechat-usage.md)）

| 命令 | 说明 |
|------|------|
| *(普通文本)* | 发给当前活动 agent |
| `/sessions`（或 `/list`） | 列出会话（按工作区分组，带标题） |
| `/use N`（或 `/resume N`） | 切换到会话 N |
| `/workspaces` | 列出可用工作区 |
| `/new <提示词>` | 新建会话并开始（当前工作区） |
| `/new <提示词> @N`（或 `@路径`） | 在指定工作区新建会话 |
| `/stop` | 停止当前任务 |
| `/end` | 结束当前会话 |
| `/status` | 查看 agent 状态与会话摘要 |
| `/yes` `/no`（或 `1`/`2`） | 回应权限审批请求 |
| `/start` | 首次扫码后自动开始一个会话 |
| `/help` | 查看全部命令 |

**安全说明**

- 强制白名单：仅白名单内的微信用户能驱动 agent，其他人发的消息会被忽略、绝不喂给模型
- 审批默认拒绝：权限请求在规定时间（默认 10 分钟）内未回复 `/yes` 则自动拒绝
- 凭证存于 DSH 凭证服务，不落配置明文
- 同一微信账号同一时间只允许一个 Bot 轮询（iLink 独占锁）；若同时使用 hermes-agent / OpenClaw 会互相 403。**请使用专用微信账号**承载 Bot

> 声明：iLink 为腾讯官方开放通道，仍需遵守《微信 ClawBot 功能使用条款》，腾讯保留内容过滤和限速的权利。不建议用于核心业务。

---

### QQ Bot（OpenAPI v2）

接入 QQ 官方机器人，支持单聊/群聊（群聊需 @机器人）、流式输出、Markdown 渲染、消息按钮、富媒体消息（图片/文件）。走腾讯官方 QQ Bot OpenAPI v2，WebSocket 实时推送，Token 自动刷新，断线自动重连。

![QQ Bot 配置](docs/screenshots/qq-bot-config.jpg)

<details>
  <summary>📱 点击展开手机 QQ 单聊与群聊对话截图</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/qq-chat.jpg" width="48%" alt="QQ 单聊对话" />
    <img src="docs/screenshots/qq-group.jpg" width="48%" alt="QQ 群聊对话" />
  </p>
</details>

**功能亮点**

- 💬 **单聊 + 群聊**：私聊直接对话，群聊 @机器人 触发（首次 @自动授权该群）
- 📝 **流式 Markdown**：实时流式输出，代码高亮、表格、列表完整渲染
- 🎯 **消息按钮**：/end 等命令触发快捷按钮（新建会话/列表/帮助），需最新版 QQ 客户端
- 🖼️ **富媒体**：图片/文件双向传输
- 🔄 **会话管理**：多会话切换、持久化、按工作区分组
- ✅ **自动授权**：单聊首次发消息、群聊首次 @机器人 自动加白名单

**使用步骤**

1. 前往 [QQ 开放平台](https://q.qq.com) 创建机器人应用，获取 AppID 和 ClientSecret
2. 打开设置页「远程访问」→「IM 机器人」→ 选中「QQ」
3. 填入 AppID 和 ClientSecret，点「保存配置」后自动连接
4. **单聊**：添加机器人好友，发送第一条消息自动完成授权
5. **群聊**：将机器人拉入群，@机器人 发送消息（首次 @自动授权该群）

**QQ 里的命令**（完整说明见 [QQ Bot 使用说明](docs/qq-usage.md)）

| 命令 | 说明 |
|------|------|
| *(普通文本)* | 发给当前活动 agent |
| `/new <提示词>` | 新建会话并开始 |
| `/sessions`（或 `/list`） | 列出会话（按工作区分组） |
| `/use N`（或 `/resume N`） | 切换到/恢复会话 N |
| `/end` | 结束当前会话（触发快捷按钮） |
| `/stop` | 停止当前任务 |
| `/status` | 查看 agent 状态 |
| `/workspaces` | 列出可用工作区 |
| `/help` | 查看全部命令 |

**重要提示**

- **自定义菜单 / 指令面板 / 消息按钮需要最新版 QQ 客户端**（2026-08-12 新功能，手机版优先支持）
- API 配置成功但客户端不显示是正常现象——更新 QQ 到最新版再试，或等官方灰度全量开放
- 纯文字命令（如 `/new` `/sessions` `/help`）在任何版本都完全可用

---

### 飞书 Bot（官方 WebSocket 长连接）

接入飞书开放平台企业自建应用，支持单聊与群聊（群聊需 @机器人）。走飞书官方最新 WebSocket 长连接协议，无需公网 IP、无需域名、免配置 Webhook。

![飞书 Bot 配置](docs/screenshots/feishu-bot-config.jpg)

<details>
  <summary>📱 点击展开手机飞书对话与卡片审批截图</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/feishu-chat.jpg" width="380" alt="飞书对话与卡片审批示例" />
  </p>
</details>

**功能亮点**

- ⚡ **100% 免公网 IP**：官方 WebSocket 全双工长连接，本地电脑即可直连飞书开放平台
- 📜 **Card JSON 2.0 原生流式打字机**：单条卡片原地增量打字机更新，彻底告别气泡拆分碎片化
- 🛡️ **Card 2.0 交互卡片审批**：敏感操作触发审批时下发橙色告警卡片，手机/电脑端点击 `[✓ 批准执行]` / `[✕ 拒绝执行]` 按钮一键处理
- 📝 **全量 Markdown 渲染**：支持多级标题、表格、代码高亮、引用块与列表
- 🔄 **会话与工作区管理**：支持 `/sessions` 表格化查看、`/use N` 切换、`/workspaces` 查看工作区

**使用步骤**

1. 前往 [飞书开放平台](https://open.feishu.cn/app) 创建企业自建应用，开启「机器人」能力并发布版本（详见 [飞书接入指南](docs/feishu-usage.md)）
2. 在「事件与回调」中开启「使用长连接接收事件」，添加 `im.message.receive_v1` 和 `card.action.trigger` 事件
3. 打开 DSH 设置页「远程访问」→「IM 机器人」→ 选中「飞书」
4. 填入 App ID 和 App Secret，点击「保存并连接」即可

**飞书里的命令**（完整说明见 [飞书 Bot 使用说明](docs/feishu-usage.md)）

| 命令 | 说明 |
|------|------|
| *(普通文本)* | 发给当前活动 agent |
| `/new <提示词>` | 在当前工作区新建会话并开始 |
| `/new <提示词> @N` | 在指定工作区新建会话 |
| `/sessions`（或 `/list`） | 查看所有历史会话（结构化表格排版） |
| `/use N`（或 `/resume N`） | 切换到会话 N |
| `/workspaces` | 列出可用工作区 |
| `/end` | 结束当前会话 |
| `/stop` | 停止当前任务 |
| `/status` | 查看 agent 状态看板 |
| `/yes` `/no`（或 `1`/`2`） | 响应权限审批请求（或直接点击卡片按钮） |
| `/help` | 查看全部命令 |

---

### Telegram Bot（官方 Bot API + 代理支持）

接入 Telegram 官方 Bot API，单聊与群聊实时交互。采用官方 Long Polling（长轮询）机制，**无需公网 IP / 免 Webhook**，内置**零依赖 HTTP/HTTPS CONNECT 代理隧道**，国内网络即开即连。

![Telegram Bot 配置](docs/screenshots/telegram-bot-config.jpg)

**功能亮点**

- ⚡ **100% 免公网 IP**：官方 Long Polling 长轮询，本地电脑或内网服务器即可直连通信
- 🌐 **内置 HTTP/HTTPS 代理支持**：支持填写本地 Clash / v2ray 代理（如 `http://127.0.0.1:7890`），零外部依赖
- 📜 **实时打字机流式输出**：接入轮次生命周期，单条气泡原地 `editMessageText` 增量刷新，告别频繁发碎消息
- 🎯 **原生快捷指令菜单（Menu 按钮）**：自动注册全范围指令，输入 `/` 或点击左下角 `[Menu]` 按钮一键直达常用命令
- 🛡️ **Inline Keyboard 交互卡片**：权限审批下发 `[✓ 批准执行]` / `[✕ 拒绝执行]` 按键，一秒点击即时放行
- 🖼️ **多模态与文件传输**：支持入站图片/文档自动转存交付 Agent，出站产物文件自动推回 Telegram
- 🔄 **会话与工作区管理**：支持 `/sessions` 列出历史会话、`/use N` 切换、`/workspaces` 调度工作区

**使用步骤**

1. 在 Telegram 中向 [@BotFather](https://t.me/BotFather) 发送 `/newbot` 创建机器人并获取 **Bot Token**
2. 打开 DSH 设置页「远程访问」→「IM 机器人」→ 选中「**Telegram**」
3. 填入 **Bot Token**（国内网络可按需填入代理地址如 `http://127.0.0.1:7890`），点击「保存并连接」
4. 手机 Telegram 扫码打开机器人，发送第一条消息（如 `/help`）即**自动完成白名单授权**

**Telegram 里的命令**（完整说明见 [Telegram Bot 使用说明](docs/telegram-usage.md)）

| 命令 | 说明 | 交互卡片 |
|------|------|------|
| *(普通文本)* | 发给当前活动 agent | 实时打字机流式输出 |
| `/new <提示词>` | 在当前工作区新建会话并开始 | 立即启动新轮次 |
| `/new <提示词> @N` | 在指定工作区新建会话 | 多工作区调度 |
| `/sessions`（或 `/list`） | 查看所有会话列表 | 挂载一键切换按键 |
| `/use N`（或 `/resume N`） | 切换到会话 N | 快速切换上下文 |
| `/workspaces` | 列出可用工作区 | 查看工作区路径 |
| `/status` | 查看 agent 状态看板 | 挂载刷新/停止/结束按键 |
| `/stop` | 停止当前正在运行的任务 | 即刻中断执行 |
| `/end` | 结束当前活动会话 | 挂载快捷开始按键 |
| `/yes` `/no`（或 `1`/`2`） | 响应权限审批请求 | 支持直接点击卡片按钮 |
| `/help` | 显示快捷按键与完整帮助 | 挂载全套功能导航按键 |

---

## 可选配置

插件开箱即用，无需配置。如需修改代理端口，在 cordis.yml 中添加：

```yaml
- name: '@wenbin_wb/dsh-bridge'
  config:
    port: 3082  # 默认 3082
```

---

## 开发

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
# 修改 client/index.js 后重新构建
npm run build:client

# 安装到 web profile 并重启 DSH
dsh plugin --profile web add .
```

---

## 常见问题 (FAQ)

<details>
  <summary><b>Q1: 远程或局域网访问时提示「加载提供方目录失败: settings are unavailable in this browser」？</b></summary>
  <br/>

  - **原因**：这是 DeepSeek Harness (DSH) 官方底层的安全机制。为了防止网络上的恶意设备窃取用户的 API Key 与模型凭据，DSH 将模型 Provider/Credentials 配置接口严格限制为仅限本地回环（`127.0.0.1`）调用。
  - **建议**：
    1. **推荐使用方式**：在电脑本机（`127.0.0.1:3080`）一次性配置好模型与 API Key，之后在手机端/远程设备可以 100% 正常创建会话、聊天与指挥 Agent 干活；
    2. **公网隧道访问**：使用插件自带的 Cloudflare 隧道（`https://*.trycloudflare.com`，自带 HTTPS 安全上下文）可获得最好的兼容性；
    3. **SSH 端口转发**：如需在手机端修改 API 配置，可通过 SSH 隧道（`ssh -L 3082:127.0.0.1:3082 user@ip`）映射为本地 localhost 访问。
</details>

<details>
  <summary><b>Q2: 远程访问时修改配置提示「需要管理员权限」或被锁定？</b></summary>
  <br/>

  - **原因**：插件内置了「管理后台防篡改」安全保护，防止外部访客窥探或篡改您的公网隧道和机器人 Token。
  - **解决方法**：
    1. 在弹出的「🔒 解锁后台管理权限」对话框中输入您设置的后台管理密码即可解锁（若未单独设置管理密码，请输入初始访问密码）；
    2. **电脑本机（127.0.0.1）访问享有物理免锁特权**，自动免密直通；
    3. 若极端情况下忘记密码，在服务器/宿主电脑终端执行单行救急指令：
       ```bash
       touch ~/.dsh/dsh-bridge/reset-auth
       ```
       插件将在毫秒级自动清空密码恢复初始免密状态。
</details>

---

## 许可证

MIT © [wenbin-wb](https://github.com/wenbin-wb)

