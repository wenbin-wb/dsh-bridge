# dsh-bridge

[English](README.md)

![dsh-bridge banner](docs/banner.jpg)

> DeepSeek Harness 多通道远程访问插件

把你本地的 DeepSeek Harness 无缝延伸到手机、平板、公网、甚至 IM 聊天软件。无论你在哪，都能通过扫码、网页或未来的微信/QQ/飞书，随时调用你的 AI 助手。

---

## 功能特性

- **局域网访问**：手机/平板扫码，同一 Wi-Fi 直接访问
- **Cloudflare 隧道**：一键暴露公网地址，随时随地连接
- **自建隧道**：连接自己的隧道服务器，获得固定域名（[搭建教程](docs/custom-tunnel.md)）
- **IM 集成（规划中）**：微信 / QQ / 飞书 / OpenClaw，直接在聊天软件里呼唤你的 Agent
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
| **微信** | 在微信里直接与你的 Agent 对话 | 规划中 |
| **QQ Bot** | 接入 QQ 机器人，群聊/私聊唤起 Agent | 规划中 |
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
