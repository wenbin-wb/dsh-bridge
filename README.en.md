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
  <a href="README.md">简体中文</a> | <b>English</b>
</p>

> **Multi-channel remote access & enterprise security guard plugin for DeepSeek Harness**
> 
> Keep using your DeepSeek Harness on the go. Scan a QR code with your phone and keep working from your sofa, another room, or across the world — no need to sit at your desk, no need to be on the same network, and no need to set up your own public server.
> 
> Seamlessly extend your local DeepSeek Harness to mobile phones, tablets, public networks, and WeChat / QQ / Feishu / Telegram. Access your AI assistant anytime, anywhere via QR code scanning, web browsers, or IM bots.

---

## Features

- **🔐 Enterprise Access Security & Admin Guard (v2.5.0 Major Release)**:
  - **1st Line of Defense (Visitor Access Guard)**: Auto-injected 256-bit security Token in QR codes for 1-click passwordless login; manual IP/domain visits enforce password verification; granular channel scoping (All / Public Tunnels Only / LAN Only);
  - **2nd Line of Defense (Admin Console Guard)**: Separated administrator password and visitor password; global console lockout for remote devices to prevent unauthorized configuration changes (Password Unlock / Local Host Only / Open);
  - **Fail-safe Recovery System (Triple Protection)**: Host machine (`127.0.0.1`) enjoys permanent physical privileges (never locked out) + terminal command `touch ~/.dsh/dsh-bridge/reset-auth` for instant emergency recovery + built-in "Forgot Password" guides;
  - **Financial-grade Security Engine**: PBKDF2 + SHA-256 salted password hashing, 30-day HttpOnly SameSite session protection, IP brute-force rate limiter (5 failed attempts trigger 60s cooldown).
- **LAN Access**: Scan QR code with your smartphone/tablet, direct access on the same Wi-Fi — keep the conversation going from your phone
- **Cloudflare Tunnel**: One-click public internet exposure, connect from anywhere without a public server of your own — keep working even when you're away from home
- **Custom Tunnel**: Connect to your own tunnel server with a fixed domain ([Setup Guide](docs/custom-tunnel.md))
- **WeChat Bot (ClawBot / iLink)**: Scan a QR code to log in a WeChat personal account, then chat with, control, and approve your DeepSeek Harness agents right inside WeChat. **Multi-workspace selection, restart-persistent sessions, grouped session listing with titles, media (image/file/voice) transfer, and permission approvals** — over Tencent's official iLink Bot API, no public server or tunnel required ([Usage Guide](docs/wechat-usage.md))
- **QQ Bot (OpenAPI v2)**: Connect your QQ Bot to receive private/group messages, send Markdown, button keyboards, and rich media. **Full event coverage (C2C / GROUP_AT_MESSAGE_CREATE), auto token refresh, reconnection with backoff, message deduplication** — over Tencent's official QQ Bot OpenAPI v2 ([Usage Guide](docs/qq-usage.md))
- **Feishu / Lark Bot (Official WebSocket)**: Connect enterprise self-built apps via Feishu's official WebSocket protocol. **No public IP / no Webhook required, Markdown table formatting, native interactive card permission approvals with 1-click button actions** ([Usage Guide](docs/feishu-usage.md))
- **Telegram Bot (Official Bot API + Proxy Support)**: Connect official Telegram bots for private and group interactions. **No public IP required (Long Polling getUpdates), built-in zero-dependency HTTP/HTTPS proxy tunnel, smooth typewriter streaming output, native command menu (Menu button), and Inline Keyboard interactive approval cards** ([Usage Guide](docs/telegram-usage.md))
- **Official Brand SVG Icons**: Authentic vector brand icons for WeChat, QQ, Feishu, Telegram with real-time status indicators
- **Fast Version Check & 1-Click Upgrade**: Dual-channel registry check (npmmirror + npmjs fallback in ~200ms) with seamless **1-click in-app upgrade**, no terminal copying required
- **Dark Mode Support**: Deep integration with DeepSeek Harness Design Tokens (`--dsw-alias-*`), QR code background protection for safe dark mode scanning

---

## Roadmap

| Target | Description | Status |
|--------|-------------|--------|
| **Access Security** | Visitor Access Auth Guard + Admin Console Anti-Tamper + Fail-safe Recovery | ✅ **Completed** (v2.5.0) |
| **Telegram** | IM channel suited for self-hosting and overseas (Long Polling / Proxy / Native Menu / Inline Cards / Streaming) | ✅ **Completed** (v2.4.0) |
| **Feishu** | Feishu / Lark official persistent WebSocket bot (No-public-IP WS / Card Approvals) | ✅ **Completed** (v2.3.0) |
| **QQ Bot** | QQ bot integration for group/private chat (Markdown / buttons / rich media) | ✅ **Completed** (v2.1.0) |
| **WeChat** | Chat with your Agent directly in WeChat (workspaces / persisted sessions / media / approvals) | ✅ **Completed** (v1.0.0) |
| **Platform Abstraction** | Platform-agnostic core (sessions / approvals / commands / digest) shared across IM channels | ✅ **Completed** (v2.0.0) |

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

# Or install a specific version (e.g. 2.5.5)
dsh plugin --profile web add @wenbin_wb/dsh-bridge@2.5.5
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

### 🔐 Access Security & Admin Guard (v2.5.0 Major Release)

Go to Settings -> "Remote Access" -> "**Security**" tab to enable enterprise-grade protection with a single click.

#### 1. 🛡️ 1st Line of Defense: Visitor Access Guard (Protects Web UI Entry)
- **Flexible Scope Control**:
  - `Protect All Channels`: LAN and all public tunnels require authentication;
  - `Protect Public Tunnels Only (Recommended)`: LAN keeps zero-friction passwordless access, while public internet exposure requires authentication;
  - `Protect LAN Only`: Enforces guard exclusively on local network.
- **Three Verification Modes**:
  - 🟢 **Scan QR Code Passwordless + Password Verification (Recommended)**: Console-generated QR codes automatically inject a 256-bit secure Token for instant 1-second passwordless access. Visitors manually typing IP/domain must enter the visitor access password;
  - 🔑 **Password / PIN Only**: All external devices must manually enter the password;
  - 🎫 **Secure Token Only**: Only devices with valid QR codes or Token links can enter.
- **1-Click Token Rotation**: Click "🔄 Reset Security Token" to immediately invalidate all previously shared QR codes and URLs.

<details>
  <summary>📱 Click to expand visitor access login page screenshot</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/remote-auth-login.jpg" width="600" alt="Visitor Access Login Page" />
  </p>
</details>

#### 2. 🔒 2nd Line of Defense: Admin Console Anti-Tamper Guard (Protects Plugin Settings)
- **Separated Admin Password**: Independent administrator password decoupled from visitor password; guests with access passwords cannot tamper with tunnels, bots, or tokens;
- **Three Admin Policies**:
  - 🔑 **Password Unlock (Recommended)**: Remote devices see a full-screen lock until the admin password is entered for a temporary session;
  - 🛡️ **Host Computer Only (Highest Security)**: Remote devices are strictly blocked from viewing or changing network/bot/security settings — management is only allowed from the physical host (`127.0.0.1`);
  - 🌐 **Open Mode**: Remote authenticated users can directly manage settings.

<details>
  <summary>🖥️ Click to expand remote admin console anti-tamper lock screenshot</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/admin-lock-screen.jpg" width="600" alt="Admin Console Anti-Tamper Lock" />
  </p>
</details>

#### 3. 🛟 Fail-safe Recovery System (Never Locked Out)
- **Physical Host Privileges**: Host computer running DSH (`127.0.0.1` / `localhost`) has permanent physical privileges — **never requires access password, settings panel is never locked**;
- **Emergency Terminal Command**: On headless Linux servers or in case of forgotten passwords, run a single command in your terminal:
  ```bash
  touch ~/.dsh/dsh-bridge/reset-auth
  ```
  The plugin instantly detects the marker, wipes all passwords and locks, deletes the marker, and restores default passwordless access;
- **Built-in Recovery Guides**: Both visitor login pages and admin lock screens provide expandable `❓ Forgot Password?` help cards.

![Access Auth Security Settings](docs/screenshots/security-auth-config.jpg)

---

### LAN Access

Automatically active when the plugin starts, zero configuration needed. Open Settings -> "Remote Access", and scan the QR code with your phone.

![LAN Access QR Scan](docs/screenshots/lan-access.jpg)

### Cloudflare Tunnel

1. Click the "Start" button in the "Cloudflare Tunnel" card
2. On first use, cloudflared (~30MB) will be automatically downloaded from GitHub
3. Once downloaded, it starts automatically and displays a public URL and QR code within seconds
4. The URL changes on each restart; click "Reset URL" to request a new URL

![Public Tunnel Settings](docs/screenshots/tunnel-access.jpg)

<details>
  <summary>📱 Click to expand mobile browser public access screenshot</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/remote-web-mobile.jpg" width="340" alt="Mobile Public Access Demo" />
  </p>
</details>

### Custom Tunnel

Requires a server with a public IP (server environment requires Node.js >= 18, recommended Node.js 22 LTS). See the [Custom Tunnel Setup Guide](docs/custom-tunnel.md) for detailed steps.

1. Deploy the tunnel server on your server following the guide
2. Enter the WebSocket URL (`wss://...`) and access token in the "Custom Tunnel" card
3. Click "Save Config", then click "Start"

Configurations persist across restarts.

### WeChat Bot (ClawBot / iLink)

Powered by Tencent's official WeChat ClawBot feature (iLink Bot API). Log in with your personal WeChat account by scanning a QR code, then chat with, control, and approve your DeepSeek Harness agents directly in WeChat — fully routed through Tencent's official servers, no public server or tunnel needed.

![WeChat Bot Configuration](docs/screenshots/wechat-bot-config.jpg)

<details>
  <summary>📱 Click to expand mobile WeChat chat screenshot</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/wechat-chat.jpg" width="380" alt="WeChat Chat Example" />
  </p>
</details>

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

![QQ Bot Configuration](docs/screenshots/qq-bot-config.jpg)

<details>
  <summary>📱 Click to expand mobile QQ private and group chat screenshots</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/qq-chat.jpg" width="48%" alt="QQ Private Chat" />
    <img src="docs/screenshots/qq-group.jpg" width="48%" alt="QQ Group Chat" />
  </p>
</details>

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

![Feishu Bot Configuration](docs/screenshots/feishu-bot-config.jpg)

<details>
  <summary>📱 Click to expand mobile Feishu chat & card approval screenshot</summary>
  <br/>
  <p align="center">
    <img src="docs/screenshots/feishu-chat.jpg" width="380" alt="Feishu Chat & Card Approval" />
  </p>
</details>

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

### Telegram Bot (Official Bot API + Proxy Support)

Connect official Telegram Bot API for real-time private and group interactions. Powered by official Long Polling (`getUpdates`), **no public IP / no Webhook required**, built-in **zero-dependency HTTP/HTTPS CONNECT proxy tunnel**, ready to use in any network environment.

![Telegram Bot Configuration](docs/screenshots/telegram-bot-config.jpg)

**Key Features**

- ⚡ **100% No Public IP Needed**: Official Long Polling mechanism allows local machines or private servers to connect directly
- 🌐 **Built-in HTTP/HTTPS Proxy Support**: Easily configure local proxies like Clash / v2ray (`http://127.0.0.1:7890`) with zero external dependencies
- 📜 **Typewriter Streaming Output**: Integrated turn lifecycle updates existing message in-place with `editMessageText`, eliminating message fragmentation
- 🎯 **Native Command Menu (`Menu` Button)**: Automatically registered with `setMyCommands` & `setChatMenuButton`, type `/` or tap `[Menu]` for 1-click command navigation
- 🛡️ **Inline Keyboard Interactive Cards**: Permission approvals send `[✓ Approve]` / `[✕ Reject]` buttons for 1-second approval actions
- 🖼️ **Multimodal & File Transfers**: Inbound images/files automatically saved and sent to Agent; generated artifacts sent back to Telegram
- 🔄 **Session & Workspace Management**: Manage multiple sessions with `/sessions`, switch with `/use N`, view workspaces with `/workspaces`

**Quick Start**

1. Send `/newbot` to [@BotFather](https://t.me/BotFather) on Telegram to create your bot and obtain the **Bot Token**
2. Open DSH Settings → "Remote Access" → "IM Bots" → select "**Telegram**"
3. Enter your **Bot Token** (and optional proxy address like `http://127.0.0.1:7890`), click "Save and Connect"
4. Scan the QR code with Telegram on your phone, send the first message (e.g. `/help`) to **automatically authorize your account into the allowlist**

**Commands in Telegram** (Full guide in [Telegram Bot Guide](docs/telegram-usage.md))

| Command | Description | Interactive Card |
|---------|-------------|------------------|
| *(plain text)* | Send to current active agent | Real-time typewriter stream |
| `/new <prompt>` | Create and start a new session in current workspace | Start fresh turn |
| `/new <prompt> @N` | Create a new session in workspace N | Multi-workspace routing |
| `/sessions` (or `/list`) | List all sessions | 1-click switch buttons |
| `/use N` (or `/resume N`） | Switch to/resume session N | Instant context switch |
| `/workspaces` | List all available workspaces | View workspace paths |
| `/status` | View agent status dashboard | Refresh/Stop/End buttons |
| `/stop` | Stop currently executing task | Immediate abort |
| `/end` | End current active session | Quick-start button attached |
| `/yes` `/no` (or `1`/`2`) | Respond to permission approvals | Click inline buttons directly |
| `/help` | Display quick buttons and help | Full navigation buttons |

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

## FAQ (Frequently Asked Questions)

<details>
  <summary><b>Q1: Getting "Failed to load provider directory: settings are unavailable in this browser" when accessing remotely?</b></summary>
  <br/>

  - **Reason**: This is an upstream security feature in DeepSeek Harness (DSH). To prevent malicious network devices from intercepting API keys and model credentials, DSH restricts the provider catalog & credential modification API exclusively to loopback (`127.0.0.1`).
  - **Recommendations**:
    1. **Recommended Workflow**: Configure your LLM models & API keys once on your desktop computer (`127.0.0.1:3080`). Afterward, you can create sessions, chat, and control agents from your mobile device with 100% full functionality;
    2. **Cloudflare Tunnel**: Accessing through the built-in Cloudflare Tunnel (`https://*.trycloudflare.com`) provides a secure HTTPS context for maximum mobile browser compatibility;
    3. **SSH Port Forwarding**: If you must modify API keys remotely from a phone, use SSH local port forwarding (`ssh -L 3082:127.0.0.1:3082 user@ip`) to map the connection to localhost.
</details>

<details>
  <summary><b>Q2: Prompted with "Admin permission required" or settings locked when modifying config remotely?</b></summary>
  <br/>

  - **Reason**: The plugin incorporates an Anti-Tamper Guard to prevent unauthorized visitors from viewing or tampering with tunnels and bot tokens.
  - **Solution**:
    1. Enter your admin password in the interactive **"🔒 Unlock Admin Console"** dialog to unlock the session (if you haven't set a separate admin password, enter your initial access password);
    2. **Host computer (127.0.0.1) access has permanent physical privileges** and is never locked;
    3. In case of forgotten passwords, execute a single emergency command in your host terminal:
       ```bash
       touch ~/.dsh/dsh-bridge/reset-auth
       ```
       The plugin will instantly clear passwords and restore default passwordless access.
</details>

---

## License

MIT © [wenbin-wb](https://github.com/wenbin-wb)

