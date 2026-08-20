# dsh-bridge

English | [简体中文](README.md)

![dsh-bridge banner](docs/banner.jpg)

> Multi-channel remote access plugin for DeepSeek Harness

Keep using your DeepSeek Harness on the go. Scan a QR code with your phone and keep working from your sofa, another room, or across the world — no need to sit at your desk, no need to be on the same network, and no need to set up your own public server.

Seamlessly extend your local DeepSeek Harness to mobile phones, tablets, public networks, and even WeChat. Access your AI assistant anytime, anywhere via QR code scanning, web browsers, or the WeChat Bot.

---

## Features

- **LAN Access**: Scan QR code with your smartphone/tablet, direct access on the same Wi-Fi — keep the conversation going from your phone
- **Cloudflare Tunnel**: One-click public internet exposure, connect from anywhere without a public server of your own — keep working even when you're away from home
- **Custom Tunnel**: Connect to your own tunnel server with a fixed domain ([Setup Guide](docs/custom-tunnel.md))
- **WeChat Bot (ClawBot / iLink)**: Scan a QR code to log in a WeChat personal account, then chat with, control, and approve your DeepSeek Harness agents right inside WeChat. **Multi-workspace selection, restart-persistent sessions, grouped session listing with titles, media (image/file/voice) transfer, and permission approvals** — over Tencent's official iLink Bot API, no public server or tunnel required ([Usage Guide](docs/wechat-usage.md))
- **QQ Bot (OpenAPI v2)**: Connect your QQ Bot to receive private/group messages, send Markdown, button keyboards, and rich media. **Full event coverage (C2C / GROUP_AT_MESSAGE_CREATE), auto token refresh, reconnection with backoff, message deduplication** — over Tencent's official QQ Bot OpenAPI v2 ([Usage Guide](docs/qq-usage.md))
- **IM Integration (More Planned)**: WeChat / QQ / Feishu / OpenClaw direct chat integration
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
| **Platform Abstraction** | Platform-agnostic core (sessions / approvals / commands / digest) shared across IM channels | ✅ **Completed** (v2.0.0) |
| **WeChat** | Chat with your Agent directly in WeChat | ✅ Supported (workspaces / persisted sessions / media / approvals) |
| **QQ Bot** | QQ bot integration for group/private chat | ✅ **Completed** (v2.1.0) — Markdown / buttons / rich media |
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

### Upgrade to latest

```bash
dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest
```

> **Note**: `update --latest` may fail to reach the newest major version due to version constraints from already-installed dependencies. Use the `add @latest` command above to force-install the latest version (no need to know the exact version number).

#### Still on an old version after upgrading? (pnpm 11 new-version filtering)

If you upgrade right after a release, `add @latest` may still install an older version. This is caused by **pnpm 11's supply-chain safety mechanism `minimumReleaseAge`** (default: filters versions published less than 24 hours ago) — not a plugin issue.

**Solutions** (pick one):

1. **Add `minimumReleaseAge: 0` to your profile's `pnpm-workspace.yaml`**, then run `pnpm install` (recommended, permanent)
2. **Specify the exact version**: `dsh plugin --profile web add @wenbin_wb/dsh-bridge@2.0.2` (works immediately, no waiting)
3. **Wait 24 hours**: the protection lifts automatically after 1 day

After upgrading, restart DSH and **hard-refresh** the browser (Windows: `Ctrl+Shift+R`, macOS: `Cmd+Shift+R`) to clear the cache, then confirm the latest version is shown in settings.

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

### WeChat Bot (ClawBot / iLink)

Built on Tencent's official WeChat ClawBot feature (iLink Bot API). Scan a QR code to log in a WeChat personal account, then chat with, control, and approve your DeepSeek Harness agents directly in WeChat — all through Tencent's official servers, no public server or tunnel required.

**Highlights**

- 🗂️ **Multi-workspace**: `/workspaces` to list workspaces; `@N` or `@path` to create sessions in a specific project directory
- 💾 **Persistent sessions**: sessions survive DSH restarts — just keep chatting
- 🏷️ **Session titles**: `/sessions` shows sessions grouped by workspace, each with an auto-generated title
- 🖼️ **Media**: send/receive images, files, and voice (auto-transcribed)
- 📝 **Approvals**: sensitive operations approved in WeChat, auto-denied on timeout
- 🔔 **Live status**: heartbeat progress + "typing" indicator, long replies auto-chunked

**Usage**

1. Open Settings → "Remote Access" → "IM Bots" tab → select "WeChat"
2. Click "Scan Login" and scan the QR code with WeChat, then confirm
3. After login, **send the bot your first message to auto-complete allowlist authorization** (one step)
4. Start issuing commands in WeChat

**Commands in WeChat** (full details in [WeChat Bot Guide](docs/wechat-usage.md))

| Command | What it does |
|---------|--------------|
| *(plain text)* | Routes to the active agent |
| `/sessions` | List sessions (grouped by workspace, with titles) |
| `/use N` | Switch to session N |
| `/workspaces` | List available workspaces |
| `/new <prompt>` | Create a fresh session and start (current workspace) |
| `/new <prompt> @N` (or `@path`) | Create a session in a specific workspace |
| `/stop` | Cancel the active turn |
| `/status` | Agent status + session summary |
| `/yes` `/no` (or `1`/`2`) | Answer a permission request |
| `/start` | Auto-start a session after first scan |
| `/help` | Command list |

**Security**

- Hard allowlist: only allowlisted WeChat users can drive the agent; everyone else is ignored and never fed to the model
- Approvals default to deny: a permission request not answered with `/yes` within the timeout (default 10 min) is auto-rejected
- Credentials are stored via the DSH credential service, never in plain config
- iLink allows exactly **one poller per account** (exclusive lock); coexisting with hermes-agent / OpenClaw causes HTTP 403 drops. **Use a dedicated WeChat account** for the bot

> Disclaimer: iLink is Tencent's official open channel but still subject to the WeChat ClawBot Terms of Use, including content filtering and rate limits. Not recommended for mission-critical use.

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
