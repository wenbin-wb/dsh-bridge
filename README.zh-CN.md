# dsh-bridge

[English](README.md)

![dsh-bridge banner](docs/banner.jpg)

> DeepSeek Harness 多通道远程访问插件

手机扫个码，人不在电脑前也能继续用 DeepSeek Harness。躺在沙发上、出差在外、跨网访问——都不用守着电脑，也不用自己搭公网服务器，扫码就能在手机/平板或任意设备上接着干。

把你本地的 DeepSeek Harness 无缝延伸到手机、平板、公网、甚至微信。无论你在哪，都能通过扫码、网页或微信 Bot，随时调用你的 AI 助手。

---

## 功能特性

- **局域网访问**：手机/平板扫码，同一 Wi-Fi 直接访问，躺着也能在手机上接着聊
- **Cloudflare 隧道**：一键暴露公网地址，随时随地连接，出差在外、不在家也能接着干，无需自建公网服务器
- **自建隧道**：连接自己的隧道服务器，获得固定域名（[搭建教程](docs/custom-tunnel.md)）
- **微信 Bot（ClawBot / iLink）**：扫码登录微信个人号后，直接在微信里对话、控制 DeepSeek Harness 的 agent。**支持多工作区选择、会话跨重启持久化、按工作区分组查看、媒体（图片/文件/语音）收发、权限审批**——走腾讯官方 iLink Bot API，无需公网（[使用说明](docs/wechat-usage.md)）
- **IM 集成（更多平台规划中）**：QQ / 飞书 / OpenClaw，直接在聊天软件里呼唤你的 Agent
- **安全提示**：URL 和二维码带访问警告，防止误分享
- **版本检查**：进入面板自动检测是否有新版本

![npm](https://img.shields.io/npm/v/@wenbin_wb/dsh-bridge?label=npm)
![npm downloads](https://img.shields.io/npm/dt/@wenbin_wb/dsh-bridge?label=downloads)
![npm license](https://img.shields.io/npm/l/@wenbin_wb/dsh-bridge?label=license)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

---

## 开发路线图

| 目标 | 说明 | 状态 |
|------|------|------|
| **平台抽象层** | 平台无关的核心（会话/审批/命令/digest）跨 IM 渠道复用 | **进行中**（v2.0.0，`lib/platform/`） |
| **微信** | 在微信里直接与你的 Agent 对话 | 已支持（多工作区 / 会话持久化 / 媒体 / 审批） |
| **QQ Bot** | 接入 QQ 机器人，群聊/私聊唤起 Agent | 规划中（下一个平台适配器） |
| **飞书** | 飞书消息/机器人集成，办公场景直接调用 | 规划中 |
| **OpenClaw** | 与 OpenClaw 生态打通 | 规划中 |
| **Telegram** | 适合自托管的 IM 渠道 | 规划中 |

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

### 从 npm 安装

```bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

### 从源码安装

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

安装完成后重启 DSH，在设置页找到「远程访问」即可使用。

---

## 使用

### 局域网访问

插件启动后自动开启，无需任何配置。打开设置页「远程访问」，用手机扫描二维码即可访问。

### Cloudflare 隧道

1. 点击「Cloudflare 隧道」卡片中的「开启」按钮
2. 首次使用会自动从 GitHub 下载 cloudflared（约 30MB）
3. 下载完成后自动启动，几秒内显示公网 URL 和二维码
4. 每次重启后 URL 会变化；点「重置链接」可主动获取新 URL

### 自建隧道

需要一台有公网 IP 的服务器。详细搭建步骤见 [自建隧道教程](docs/custom-tunnel.md)。

1. 按教程在服务器上部署隧道服务端
2. 在「自建隧道」卡片中填写 WebSocket 地址（`wss://...`）和访问令牌
3. 点「保存配置」后点「开启」

配置自动持久化，重启后无需重新填写。

### 微信 Bot（ClawBot / iLink）

基于腾讯官方开放的微信 ClawBot 插件功能（底层 iLink Bot API），扫码登录微信个人号后，即可在微信里直接与你的 DeepSeek Harness agent 对话、控制和审批，全程走腾讯官方服务器，无需公网与隧道。

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
| `/sessions` | 列出会话（按工作区分组，带标题） |
| `/use N` | 切换到会话 N |
| `/workspaces` | 列出可用工作区 |
| `/new <提示词>` | 新建会话并开始（当前工作区） |
| `/new <提示词> @N`（或 `@路径`） | 在指定工作区新建会话 |
| `/stop` | 停止当前任务 |
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

## 可选配置

插件开箱即用，无需配置。如需修改代理端口，在 cordis.yml 中添加：

```yaml
- name: dsh-bridge
  config:
    port: 3082  # 默认 3082
```

---

## 开发

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
npm install

# 修改 client/index.js 后重新构建
npm run build:client

# 安装到 web profile 并重启 DSH
dsh plugin --profile web add .
```

---

## 许可证

MIT © [wenbin-wb](https://github.com/wenbin-wb)
