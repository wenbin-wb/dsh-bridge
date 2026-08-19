# dsh-bridge

![dsh-bridge banner](docs/banner.jpg)

> Multi-channel remote access plugin for DeepSeek Harness  
> DeepSeek Harness 多通道远程访问插件

Seamlessly extend your local DeepSeek Harness to mobile phones, tablets, public networks, and even IM chat apps. Access your AI assistant anytime, anywhere via QR code scanning, web browsers, or future integrations with WeChat/QQ/Feishu.

把你本地的 DeepSeek Harness 无缝延伸到手机、平板、公网、甚至 IM 聊天软件。无论你在哪，都能通过扫码、网页或未来的微信/QQ/飞书，随时调用你的 AI 助手。

---

## Features / 功能特性

### English

- **LAN Access**: Scan QR code with your smartphone/tablet, direct access on the same Wi-Fi
- **Cloudflare Tunnel**: One-click public internet exposure, connect from anywhere
- **Custom Tunnel**: Connect to your own tunnel server with a fixed domain ([Setup Guide](docs/custom-tunnel.md))
- **IM Integration (Planned)**: WeChat / QQ / Feishu / OpenClaw direct chat integration
- **Security Alerts**: URLs and QR codes with access warnings to prevent accidental sharing
- **Auto Version Check**: Automatic update detection when entering the panel

### 中文

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

## Roadmap

| Target / 目标 | Description / 说明 | Status / 状态 |
|---------------|-------------------|--------------|
| **WeChat / 微信** | Chat with your Agent directly in WeChat / 在微信里直接与你的 Agent 对话 | Planned / 规划中 |
| **QQ Bot** | QQ bot integration for group/private chat / 接入 QQ 机器人，群聊/私聊唤起 Agent | Planned / 规划中 |
| **Feishu / 飞书** | Feishu message/bot integration for workplace scenarios / 飞书消息/机器人集成，办公场景直接调用 | Planned / 规划中 |
| **OpenClaw** | Integration with OpenClaw ecosystem / 与 OpenClaw 生态打通 | Planned / 规划中 |
| **Telegram** | Self-hosted IM channel / 适合自托管的 IM 渠道 | Planned / 规划中 |

---

## Requirements / 环境要求

Before installing the plugin, ensure:  
安装插件前，请先确保：

1. **Node.js ≥ 22** (DSH requires `^22.19.0` or `≥ 24.0.0` / DSH 要求)
2. **dsh CLI available** — you can run `dsh` command in terminal / 能在终端直接运行 `dsh` 命令

```bash
# Check Node version / 检查 Node 版本
node -v   # Should show v22.19+ or v24+ / 应显示

# Check dsh availability / 检查 dsh 是否可用
dsh --version
```

If `dsh` command is not found, install DSH globally:  
如果 `dsh` 命令提示"无法识别/找不到"，先安装 DSH：

```bash
npm install -g @deepseek-ai/dsh
```

> Alternative without global install (use `npx`):  
> 若没有全局安装的权限，也可以用 `npx` 方式：
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

---

## Installation / 安装

### From npm / 从 npm 安装

```bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

### From source / 从源码安装

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

After installation, restart DSH and find "Remote Access" in settings.  
安装完成后重启 DSH，在设置页找到「远程访问」即可使用。

---

## Usage / 使用

### LAN Access / 局域网访问

**English**: Automatically enabled after plugin starts, no configuration needed. Open Settings → "Remote Access", scan the QR code with your mobile device.

**中文**：插件启动后自动开启，无需任何配置。打开设置页「远程访问」，用手机扫描二维码即可访问。

### Cloudflare Tunnel

**English**: 
1. Click "Enable" in the Cloudflare Tunnel card
2. First use will auto-download cloudflared (~30MB) from GitHub
3. Public URL and QR code appear within seconds
4. URL changes after each restart; click "Reset Link" to get a new one

**中文**：
1. 点击「Cloudflare 隧道」卡片中的「开启」按钮
2. 首次使用会自动从 GitHub 下载 cloudflared（约 30MB）
3. 下载完成后自动启动，几秒内显示公网 URL 和二维码
4. 每次重启后 URL 会变化；点「重置链接」可主动获取新 URL

### Custom Tunnel / 自建隧道

**English**: Requires a server with public IP. See [Custom Tunnel Guide](docs/custom-tunnel.md) for detailed setup.

1. Deploy tunnel server following the guide
2. Fill in WebSocket address (`wss://...`) and access token in the "Custom Tunnel" card
3. Click "Save Config" then "Enable"

Config is auto-persisted to `~/.dsh/dsh-bridge/config.json`, no need to re-enter after restart.

**中文**：需要一台有公网 IP 的服务器。详细搭建步骤见 [自建隧道教程](docs/custom-tunnel.md)。

1. 按教程在服务器上部署隧道服务端
2. 在「自建隧道」卡片中填写 WebSocket 地址（`wss://...`）和访问令牌
3. 点「保存配置」后点「开启」

配置自动持久化，重启后无需重新填写。

---

## Optional Configuration / 可选配置

Plugin works out-of-the-box, no configuration needed. To change proxy port, add to cordis.yml:  
插件开箱即用，无需配置。如需修改代理端口，在 cordis.yml 中添加：

```yaml
- name: dsh-bridge
  config:
    port: 3082  # Default / 默认 3082
```

---

## Development / 开发

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
npm install

# Rebuild after modifying client/index.js
# 修改 client/index.js 后重新构建
npm run build:client

# Install to web profile and restart DSH
# 安装到 web profile 并重启 DSH
dsh plugin --profile web add .
```

---

## License

MIT © [wenbin-wb](https://github.com/wenbin-wb)
