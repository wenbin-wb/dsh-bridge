# dsh-bridge

[简体中文](README.md) | English

![dsh-bridge banner](docs/banner.jpg)

> Multi-channel remote access plugin for DeepSeek Harness

Keep using your DeepSeek Harness on the go. Scan a QR code with your phone and keep working from your sofa, another room, or across the world — no need to sit at your desk, no need to be on the same network, and no need to set up your own public server.

Seamlessly extend your local DeepSeek Harness to mobile phones, tablets, public networks, and WeChat / QQ. Access your AI assistant anytime, anywhere via QR code scanning, web browsers, or IM bots.

---

## Features

- **LAN Access**: Scan QR code with your smartphone/tablet, direct access on the same Wi-Fi — keep the conversation going from your phone
- **Cloudflare Tunnel**: One-click public internet exposure, connect from anywhere without a public server of your own — keep working even when you're away from home
- **Custom Tunnel**: Connect to your own tunnel server with a fixed domain ([Setup Guide](docs/custom-tunnel.md))
- **WeChat Bot (ClawBot / iLink)**: Scan a QR code to log in a WeChat personal account, then chat with, control, and approve your DeepSeek Harness agents right inside WeChat. **Multi-workspace selection, restart-persistent sessions, grouped session listing with titles, media (image/file/voice) transfer, and permission approvals** — over Tencent's official iLink Bot API, no public server or tunnel required ([Usage Guide](docs/wechat-usage.md))
- **QQ Bot (OpenAPI v2)**: Connect your QQ Bot to receive private/group messages, send Markdown, button keyboards, and rich media. **Full event coverage (C2C / GROUP_AT_MESSAGE_CREATE), auto token refresh, reconnection with backoff, message deduplication** — over Tencent's official QQ Bot OpenAPI v2 ([Usage Guide](docs/qq-usage.md))
- **Feishu / Lark Bot (Official WebSocket)**: Connect enterprise self-built apps via Feishu's official WebSocket protocol. **No public IP / no Webhook required, Markdown table formatting, native interactive card permission approvals with 1-click button actions** ([Usage Guide](docs/feishu-usage.md))
- **Official Brand SVG Icons**: Authentic vector brand icons for WeChat, QQ, Feishu, Telegram with real-time status indicators
- **Fast Version Check & 1-Click Upgrade**: Dual-channel registry check (npmmirror + npmjs fallback in ~200ms) with seamless **1-click in-app upgrade**, no terminal copying required
- **Dark Mode Support**: Deep integration with DeepSeek Harness Design Tokens (`--dsw-alias-*`), QR code background protection for safe dark mode scanning
- **Security Alerts**: URLs and QR codes with access warnings to prevent accidental sharing

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
| **Feishu** | Feishu / Lark official persistent WebSocket bot | ✅ **Completed** (v2.3.0) — No-public-IP WS / Card Approvals |
| **Telegram** | IM channel suited for self-hosting and overseas | Planned |
| **OpenClaw** | Connect with the OpenClaw ecosystem | Planned |

---

## Prerequisites

Before installing the plugin, make sure:

1. **Node.js ≥ 22** (DSH requires `^22.19.0` or `≥ 24.0.0`)
2. **dsh CLI available** — you can run the `dsh` command in your terminal

```bash
# Check Node version
node -v   # should show v22.19+ or v24+

# Check if dsh is available
dsh --version
```

If `dsh` is not found, install DSH first:

```bash
npm install -g @deepseek-ai/dsh
```

> If you do not have permission for global installation, you can use `npx`:
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

---

## Installation

### From npm (Recommended)

```bash
# Install the latest version
dsh plugin --profile web add @wenbin_wb/dsh-bridge

# Or specify a version (e.g. 2.2.6)
dsh plugin --profile web add @wenbin_wb/dsh-bridge@2.2.6
```

> 💡 **No global install permission?** Use `npx`:
> ```bash
> npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge
> ```

### From Source

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

After installation, restart DSH and find "Remote Access" in the Settings page.

### Upgrading to the Latest Version

```bash
# Method 1: Click "🚀 Upgrade to vX.X.X" directly in Settings -> Remote Access (Recommended, 1-Click)

# Method 2: Force install via terminal
dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest
```

> **Note**: `update --latest` may fail to upgrade to the latest version due to version constraints in installed dependencies. Use the `add @latest` command above to force installing the latest version.

#### Still seeing the old version after upgrading? (pnpm 11 minimumReleaseAge)

If you upgrade immediately after a new version is released, `add @latest` might still install the old version. This is caused by **pnpm 11's supply chain security mechanism `minimumReleaseAge`** (which filters releases less than 24 hours old by default), not a bug in the plugin.

**Solutions** (choose any):

1. **Click "1-Click Upgrade" in the DSH Web Settings page** (installs with explicit version tag, takes effect immediately)
2. **Add `minimumReleaseAge: 0` to your profile's `pnpm-workspace.yaml`**, then run `pnpm install`
3. **Wait 24 hours**: Protection lifts automatically after 1 day

After upgrading, restart DSH, perform a **hard refresh** in your browser (Windows: `Ctrl+Shift+R`, macOS: `Cmd+Shift+R`) to clear cache, and verify the latest version is displayed.

---

## Usage

### LAN Access

Automatically active when the plugin starts, zero configuration needed. Open Settings -> "Remote Access", and scan the QR code with your phone.

![QR Scan Access](docs/screenshots/qr-scan.jpg)

### Cloudflare Tunnel

1. Click the "Start" button in the "Cloudflare Tunnel" card
2. On first use, cloudflared (~30MB) will be automatically downloaded from GitHub
3. Once downloaded, it starts automatically and displays a public URL and QR code within seconds
4. The URL changes on each restart; click "Reset URL" to request a new URL

### Custom Tunnel

Requires a server with a public IP. See the [Custom Tunnel Setup Guide](docs/custom-tunnel.md) for detailed steps.

1. Deploy the tunnel server on your server following the guide
2. Enter the WebSocket URL (`wss://...`) and access token in the "Custom Tunnel" card
3. Click "Save Config", then click "Start"

Configurations persist across restarts.

### WeChat Bot (ClawBot / iLink)

Powered by Tencent's official WeChat ClawBot feature (iLink Bot API). Log in with your personal WeChat account by scanning a QR code, then chat with, control, and approve your DeepSeek Harness agents directly in WeChat — fully routed through Tencent's official servers, no public server or tunnel needed.

![WeChat Chat Example](docs/screenshots/wechat-chat.jpg)

**Key Highlights**

- 🗂️ **Multi-Workspace**: `/workspaces` to list workspaces, `@N` or `@path` to start sessions in specific directories
- 💾 **Session Persistence**: Sessions survive DSH restarts — keep chatting seamlessly
- 🏷️ **Session Titles**: `/sessions` groups by workspace and displays clean session titles
- 🖼️ **Media Transfer**: Two-way transfer for images, files, and voice (auto-transcribed to text)
- 📝 **Approval Prompts**: Approve sensitive operations directly in WeChat; auto-rejects on timeout
- 🔔 **Real-Time Status**: Heartbeat progress + "typing..." indicators, auto-chunked long replies

**Quick Start**

1. Open Settings -> "Remote Access" -> "IM Bot" -> Select "WeChat"
2. Click "Scan QR to Login", scan with WeChat and confirm
3. Once logged in, **send the first message to the bot to automatically grant allowlist access**
4. You can now send commands directly in WeChat

**WeChat Commands** (Full documentation in [WeChat Bot Usage Guide](docs/wechat-usage.md))

| Command | Description |
|---------|-------------|
| *(Plain text)* | Send to the currently active agent |
| `/sessions` (or `/list`) | List sessions (grouped by workspace with titles) |
| `/use N` (or `/resume N`) | Switch to / resume session N |
| `/workspaces` | List available workspaces |
| `/new <prompt>` | Start a new session in the current workspace |
| `/new <prompt> @N` (or `@path`) | Start a new session in the specified workspace |
| `/stop` | Stop the current task |
| `/end` | End the current session |
| `/status` | View agent status and session summary |
| `/yes` `/no` (or `1`/`2`) | Respond to permission approval requests |
| `/start` | Automatically initialize a session after first login |
| `/help` | Display all available commands |

**Security Notes**

- Strict Allowlist: Only approved WeChat users can interact with the agent; unauthorized messages are dropped and never fed to the model
- Default Deny on Approval: Requests auto-reject if `/yes` is not sent within the timeout period (default 10 mins)
- Credentials stored in DSH Credentials service, never in plaintext configuration
- Only one bot polling instance per WeChat account at a time. **Please use a dedicated WeChat account** for the bot

> Notice: iLink is Tencent's official channel; usage must comply with WeChat terms of service. Tencent reserves content filtering and rate limiting rights. Not recommended for critical production workloads.

---

### QQ Bot (OpenAPI v2)

Integrates Tencent's official QQ Bot platform. Supports private chat, group chat (@bot trigger), streaming output, Markdown rendering, message buttons, and rich media (images/files). Driven by Tencent's official QQ Bot OpenAPI v2 with real-time WebSocket push, automatic token refresh, and auto-reconnection.

![QQ Private Chat](docs/screenshots/qq-chat.jpg)

![QQ Group Chat](docs/screenshots/qq-group.jpg)

**Key Highlights**

- 💬 **Private + Group Chat**: Direct private messaging, @bot in groups (first @ auto-approves group)
- 📝 **Streaming Markdown**: Real-time streaming output with full syntax highlighting, tables, and lists
- 🎯 **Message Buttons**: Commands like `/end` trigger inline quick-action buttons (New Session, List, Help)
- 🖼️ **Rich Media**: Bi-directional image and file sending
- 🔄 **Session Management**: Multi-session switching, persistence across restarts, workspace grouping
- ✅ **Auto Authorization**: First private message or first group @bot automatically adds to allowlist

**Quick Start**

1. Go to [QQ Open Platform](https://q.qq.com), create a bot application, and obtain `AppID` and `ClientSecret`
2. Open Settings -> "Remote Access" -> "IM Bot" -> Select "QQ"
3. Enter AppID and ClientSecret, click "Save Config" to automatically connect
4. **Private Chat**: Add the bot as a friend and send the first message to authorize
5. **Group Chat**: Add the bot to a group and send a message with `@bot` to authorize the group

**QQ Commands** (Full documentation in [QQ Bot Usage Guide](docs/qq-usage.md))

| Command | Description |
|---------|-------------|
| *(Plain text)* | Send to the currently active agent |
| `/new <prompt>` | Start a new session |
| `/sessions` (or `/list`) | List sessions (grouped by workspace) |
| `/use N` (or `/resume N`) | Switch to / resume session N |
| `/end` | End current session (triggers quick-action buttons) |
| `/stop` | Stop the current task |
| `/status` | View agent status |
| `/workspaces` | List available workspaces |
| `/help` | Display all available commands |

**Important Notice**

- **Custom menus, command panels, and interactive buttons require the latest QQ client**
- If API configuration succeeds but buttons don't appear, update your QQ client to the latest version
- Plain text commands (e.g. `/new`, `/sessions`, `/help`) work on all client versions

---

### Feishu / Lark Bot (Official WebSocket)

Connect your enterprise self-built app via Feishu's official WebSocket protocol. Supports private chat and group mentions without public IP, domain name, or webhook configuration.

**Key Highlights**

- ⚡ **100% No Public IP Required**: Direct duplex WebSocket connection to Feishu Open Platform
- 📜 **Card JSON 2.0 Streaming**: In-place single-card incremental streaming updates, eliminating message bubble fragmentation
- 🛡️ **Card 2.0 Interactive Approvals**: Native orange approval card with `[✓ Approve]` / `[✕ Reject]` action buttons for 1-click execution
- 📝 **Full Markdown Rendering**: Native support for headings, tables, syntax highlighting, blockquotes, and lists
- 🔄 **Workspace & Session Management**: Table-formatted `/sessions`, `/use N` switching, and `/workspaces` listing

**Setup Steps**

1. Go to [Feishu Open Platform](https://open.feishu.cn/app) to create a self-built app, enable "Bot" capability, and publish a version ([Detailed Guide](docs/feishu-usage.md))
2. Under "Events & Callbacks", select "Use WebSocket to receive events", and add `im.message.receive_v1` & `card.action.trigger`
3. Open DSH Settings → "Remote Access" → "IM Bots" → select "Feishu"
4. Fill in App ID and App Secret, then click "Save & Connect"

**Feishu Bot Commands** (Full guide in [Feishu Bot Usage Guide](docs/feishu-usage.md))

| Command | Description |
|---------|-------------|
| *(plain text)* | Send to current active agent |
| `/new <prompt>` | Create and start a new session in current workspace |
| `/new <prompt> @N` | Create a new session in workspace N |
| `/sessions` (or `/list`) | List all sessions in a structured Markdown table |
| `/use N` (or `/resume N`) | Switch to/resume session N |
| `/workspaces` | List all available workspaces |
| `/end` | End current session |
| `/stop` | Stop currently executing task |
| `/status` | View agent status dashboard |
| `/yes` `/no` (or `1`/`2`) | Respond to permission approval requests (or click card buttons) |
| `/help` | Display full command help |

---

## Optional Configuration

The plugin is ready to use out of the box. To customize the proxy port, add to `cordis.yml`:

```yaml
- name: '@wenbin_wb/dsh-bridge'
  config:
    port: 3082  # default 3082
```

---

## Development

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
npm install

# Rebuild client bundle after editing client/index.js
npm run build:client

# Install to web profile and restart DSH
dsh plugin --profile web add .
```

---

## License

MIT © [wenbin-wb](https://github.com/wenbin-wb)
