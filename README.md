# dsh-bridge

[中文文档](README.zh-CN.md)

![dsh-bridge banner](docs/banner.jpg)

> Multi-channel remote access plugin for DeepSeek Harness

Keep using your DeepSeek Harness on the go. Scan a QR code with your phone and keep working from your sofa, another room, or across the world — no need to sit at your desk, no need to be on the same network, and no need to set up your own public server.

Seamlessly extend your local DeepSeek Harness to mobile phones, tablets, public networks, and even IM chat apps. Access your AI assistant anytime, anywhere via QR code scanning, web browsers, or future integrations with WeChat/QQ/Feishu.

---

## Features

- **LAN Access**: Scan QR code with your smartphone/tablet, direct access on the same Wi-Fi — keep the conversation going from your phone
- **Cloudflare Tunnel**: One-click public internet exposure, connect from anywhere without a public server of your own — keep working even when you're away from home
- **Custom Tunnel**: Connect to your own tunnel server with a fixed domain ([Setup Guide](docs/custom-tunnel.md))
- **IM Integration (Planned)**: WeChat / QQ / Feishu / OpenClaw direct chat integration
- **Security Alerts**: URLs and QR codes with access warnings to prevent accidental sharing
- **Auto Version Check**: Automatic update detection when entering the panel

![npm](https://img.shields.io/npm/v/@wenbin_wb/dsh-bridge?label=npm)
![npm downloads](https://img.shields.io/npm/dt/@wenbin_wb/dsh-bridge?label=downloads)
![npm license](https://img.shields.io/npm/l/@wenbin_wb/dsh-bridge?label=license)
![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)

---

## Roadmap

| Target | Description | Status |
|--------|-------------|--------|
| **WeChat** | Chat with your Agent directly in WeChat | Planned |
| **QQ Bot** | QQ bot integration for group/private chat | Planned |
| **Feishu** | Feishu message/bot integration for workplace scenarios | Planned |
| **OpenClaw** | Integration with OpenClaw ecosystem | Planned |
| **Telegram** | Self-hosted IM channel | Planned |

---

## Requirements

Before installing the plugin, ensure:

1. **Node.js ≥ 22** (DSH requires `^22.19.0` or `≥ 24.0.0`)
2. **dsh CLI available** — you can run `dsh` command in terminal

```bash
# Check Node version
node -v   # Should show v22.19+ or v24+

# Check dsh availability
dsh --version
```

If `dsh` command is not found, install DSH globally:

```bash
npm install -g @deepseek-ai/dsh
```

> Alternative without global install (use `npx`):
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

---

## Installation

### From npm

```bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge
```

### From source

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

After installation, restart DSH and find "Remote Access" in settings.

---

## Usage

### LAN Access

Automatically enabled after plugin starts, no configuration needed. Open Settings → "Remote Access", scan the QR code with your mobile device.

### Cloudflare Tunnel

1. Click "Enable" in the Cloudflare Tunnel card
2. First use will auto-download cloudflared (~30MB) from GitHub
3. Public URL and QR code appear within seconds
4. URL changes after each restart; click "Reset Link" to get a new one

### Custom Tunnel

Requires a server with public IP. See [Custom Tunnel Guide](docs/custom-tunnel.md) for detailed setup.

1. Deploy tunnel server following the guide
2. Fill in WebSocket address (`wss://...`) and access token in the "Custom Tunnel" card
3. Click "Save Config" then "Enable"

Config is auto-persisted to `~/.dsh/dsh-bridge/config.json`, no need to re-enter after restart.

---

## Optional Configuration

Plugin works out-of-the-box, no configuration needed. To change proxy port, add to cordis.yml:

```yaml
- name: dsh-bridge
  config:
    port: 3082  # Default 3082
```

---

## Development

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
npm install

# Rebuild after modifying client/index.js
npm run build:client

# Install to web profile and restart DSH
dsh plugin --profile web add .
```

---

## License

MIT © [wenbin-wb](https://github.com/wenbin-wb)
