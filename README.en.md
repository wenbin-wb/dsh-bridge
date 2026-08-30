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

> **Multi-Channel Remote Access & Comprehensive Security Gateway Plugin for DeepSeek Harness**
> 
> Scan a QR code on your phone to continue using DeepSeek Harness anywhere. Whether relaxing on the sofa, commuting, or working across networks—no need to stay at your PC or set up complex servers.
> 
> Seamlessly extends your local DeepSeek Harness instance to mobile web, standalone PWA app, secure public tunnels, and **WeChat / QQ / Feishu / Telegram** bot matrix. Drive AI coding, run tasks, approve operations, and manage workspaces anytime, anywhere.

---

## Table of Contents

- [✨ Key Features](#-key-features)
- [📦 Installation & Upgrade](#-installation--upgrade)
- [🚀 Quick Start](#-quick-start)
  - [1. 🛜 LAN Access & Multi-NIC Smart Selection](#1-🛜-lan-access--multi-nic-smart-selection)
  - [2. 🌐 Public Tunnels (Cloudflare & Custom)](#2-🌐-public-tunnels-cloudflare--custom)
  - [3. 🤖 All-in-One IM Bot Matrix (WeChat / QQ / Feishu / Telegram)](#3-🤖-all-in-one-im-bot-matrix-wechat--qq--feishu--telegram)
  - [4. 🗂️ Web Remote Workspace Directory Picker](#4-🗂️-web-remote-workspace-directory-picker)
  - [5. 🔐 Comprehensive Access Security & Admin Lock](#5-🔐-comprehensive-access-security--admin-lock)
  - [6. 📊 Maintenance Dashboard & Graceful Restart](#6-📊-maintenance-dashboard--graceful-restart)
- [💬 FAQ](#-faq)
- [🛠️ Development & Contribution](#️-development--contribution)
- [📄 License](#-license)

---

## ✨ Key Features

| Domain | Highlights | Description |
| :--- | :--- | :--- |
| **🛜 LAN Access** | **Multi-NIC Smart Detection & Switching** | Filters virtual NICs, prioritizes physical Wi-Fi/Ethernet; supports visual switching & persistent memory for WSL/VMware/Docker |
| **🌐 Public Tunnels** | **Temporary Random & Token Fixed Domains** | 1-click zero-config Cloudflare temporary tunnel; Cloudflare Named Tunnel Token with auto-start on boot; custom WebSocket tunnel |
| **🤖 IM Bot Matrix** | **WeChat / QQ / Feishu / Telegram** | Covers all 4 major platforms; multi-workspace dispatching, cross-restart session persistence, streaming Markdown typewriter, card approvals & file sharing |
| **📱 Mobile Experience** | **Native UI & Standalone PWA** | Dynamic centered header title, native drawer sidebar with `[|` fold icon, anti-overlap responsive layout, PWA install support |
| **🗂️ Remote Workspace** | **Web-based Tree Directory Picker** | Mobile/remote click triggers responsive bottom drawer directory browser; localhost clicks seamlessly route to OS native dialog |
| **🔐 Access Security** | **Dual Defense Lines & Zero-Lock Guard** | QR code secret Token login + visitor password gate + standalone admin tamper-proof lock; localhost privilege & emergency CLI reset |
| **📊 Maintenance** | **System Metrics / Network Diagnostics / Backup** | Real-time CPU / RAM / Uptime monitoring; 1-click port & tunnel latency diagnosis; 1-click JSON configuration backup & restore |
| **🔄 Smooth Upgrade** | **High-Speed Check + 1-Click Upgrade & Restart** | npmmirror millisecond check; auto-augments macOS/Linux PATH and binds sibling Node binaries; 1-click restart with auto-reconnect |

---

## 📦 Installation & Upgrade

### Requirements

1. **Node.js ≥ 22** (DSH requires `^22.19.0` or `≥ 24.0.0`)
2. **dsh CLI available** (runnable directly in terminal)

```bash
# Verify environment
node -v   # v22.19+ or v24+
dsh --version
```

### Installation

```bash
# Method 1: Install from npm (Recommended)
dsh plugin --profile web add @wenbin_wb/dsh-bridge

# Method 2: Global-permission-free npx installation
npx --yes @deepseek-ai/dsh plugin --profile web add @wenbin_wb/dsh-bridge

# Method 3: Install from source
git clone https://github.com/wenbin-wb/dsh-bridge.git
dsh plugin --profile web add ./dsh-bridge
```

### Upgrade

```bash
# Recommended: Click "🚀 1-Click Upgrade & Restart" in Web Settings > Remote Access

# Or force install latest version via CLI:
dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest
```

---

## 🚀 Quick Start

Launch DeepSeek Harness, open Settings in the left sidebar, and click **"Remote Access"**:

<p align="center">
  <img src="docs/screenshots/lan-access.jpg" width="48%" alt="LAN Access Console" />
  <img src="docs/screenshots/tunnel-access.jpg" width="48%" alt="Tunnel Access Configuration" />
</p>

---

### 1. 🛜 LAN Access & Multi-NIC Smart Selection

Starts **automatically with DSH service**, zero configuration required.

* **Instant QR Code Scan**: Connect phone and PC to the same Wi-Fi, scan the QR code with phone camera to access mobile web UI;
* **Multi-NIC Detection & Switching**:
  * Automatically detects multiple network interfaces (physical Wi-Fi, Ethernet, WSL, VMware, Docker) and presents **"🛜 Network Interface / IP Selection"** dropdown;
  * Smart scoring highlights physical network cards; instantly regenerates QR codes upon selection and **persists choice across restarts**.

---

### 2. 🌐 Public Tunnels (Cloudflare & Custom)

Access DeepSeek Harness from anywhere outside your home network without public IP or router port forwarding:

* **Cloudflare Zero-Login Temporary Tunnel (Default)**:
  * Click "Start"; automatically downloads & prepares `cloudflared` binary with permission self-healing;
  * Instantly generates `https://*.trycloudflare.com` URL and QR code.
* **Cloudflare Token Fixed Domain (Permanent · Free)**:
  * Create a Tunnel in [Cloudflare Zero Trust Console](https://one.dash.cloudflare.com/) and bind your custom domain;
  * Enter Tunnel Token & hostname in Advanced Settings, enable **"Auto-start with DSH"** for permanent fixed URL!
* **Custom WebSocket Tunnel**:
  * Connect to your personal VPS reverse proxy server ([View Setup Guide](docs/custom-tunnel.md)), equipped with per-message gzip and SSE optimization.

---

### 3. 🤖 All-in-One IM Bot Matrix (WeChat / QQ / Feishu / Telegram)

Interact with local AI agents directly inside your favorite messaging apps without opening a browser:

<p align="center">
  <img src="docs/screenshots/wechat-chat.jpg" width="23%" alt="WeChat Bot Chat" />
  <img src="docs/screenshots/qq-chat.jpg" width="23%" alt="QQ Bot Chat" />
  <img src="docs/screenshots/feishu-chat.jpg" width="23%" alt="Feishu Card Typewriter" />
  <img src="docs/screenshots/telegram-bot-config.jpg" width="23%" alt="Telegram Bot Config" />
</p>

#### Platform Overview

| Platform | Protocol | Public IP Required | Highlights | Documentation |
| :--- | :--- | :--- | :--- | :--- |
| **WeChat** | Official iLink Bot API | 100% No | QR code personal login; multi-workspace; media sharing; session persistence | [WeChat Guide](docs/wechat-usage.md) |
| **QQ Bot** | Official OpenAPI v2 | 100% No | Official AppID; direct/group @chat; Markdown rendering; interactive buttons | [QQ Guide](docs/qq-usage.md) |
| **Feishu (Lark)**| Official WebSocket 2.0 | 100% No | Enterprise self-built app; Card 2.0 streaming typewriter; 1-click button approval | [Feishu Guide](docs/feishu-usage.md) |
| **Telegram** | Official Bot API (Long Polling) | 100% No | Built-in HTTP/HTTPS proxy; `/ ` quick menu; Inline card approval; live typewriter | [Telegram Guide](docs/telegram-usage.md) |

#### Standardized IM Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| *(Direct Text)* | Drives current active agent to think and code | `Write a quicksort algorithm` |
| `/sessions` or `/list` | List all sessions grouped by workspace | `/sessions` |
| `/use N` or `/resume N` | Switch context to session number N | `/use 2` |
| `/rename <new title>` | Rename active session title | `/rename Refactor Auth` |
| `/workspaces` | List all registered workspaces in DSH | `/workspaces` |
| `/addworkspace <path>` | Remotely register a local project folder | `/addworkspace D:/Projects/app` |
| `/new <prompt>` | Start a new session in current workspace | `/new Write unit tests` |
| `/new <prompt> @N` | Start a new session in workspace N | `/new Fix login bug @2` |
| `/stop` | Immediately abort current running task | `/stop` |
| `/end` | End and suspend active session | `/end` |
| `/yes` / `/no` (or `1`/`2`) | Respond to sensitive operation permission approvals | `/yes` |
| `/status` | View agent status and system summary | `/status` |
| `/help` | View full command and shortcut button help | `/help` |

---

### 4. 🗂️ Web Remote Workspace Directory Picker

Solves the pain point of mobile browsers being unable to trigger PC native folder dialogs:

<p align="center">
  <img src="docs/screenshots/mobile-workspace-picker.jpg" width="360" alt="Mobile Workspace Picker" />
</p>

* **Smart Routing**: PC localhost visits (`127.0.0.1`) invoke OS native file dialogs; mobile/remote visits pop up responsive bottom directory browser;
* **Quick Access**: 1-click access to Windows drives (C:, D:) and standard system folders (Desktop, Documents, Downloads, Projects).

---

### 5. 🔐 Comprehensive Access Security & Admin Lock

Open **"Security"** tab to establish bank-grade protection for your local development environment:

<p align="center">
  <img src="docs/screenshots/remote-auth-login.jpg" width="48%" alt="Remote Access Login Page" />
  <img src="docs/screenshots/admin-lock-screen.jpg" width="48%" alt="Admin Console Lock" />
</p>

* **Line 1: External Access Gateway**
  * **QR Token Passwordless + Password Verification**: QR codes carry 256-bit encrypted Token for instant access; manual IP/domain visits require password;
  * **Channel Isolation**: Choose between "All Channels / Public Tunnels Only (LAN Passwordless) / LAN Only".
* **Line 2: Admin Console Anti-Tamper Lock**
  * Independent admin password; remote devices enter locked console, requiring admin password to view or modify tokens and bot configs.
* **Triple Disaster Recovery (Never Locked Out)**:
  * 💻 **Host Physical Privilege**: PC localhost (`127.0.0.1`) enjoys permanent highest privilege, never locked;
  * 🚑 **Terminal Emergency Reset**: Run `touch ~/.dsh-bridge/reset-auth` in terminal to reset passwords instantly;
  * ❓ **Interactive Guidance**: Built-in interactive recovery guides on all auth pages.

---

### 6. 📊 Maintenance Dashboard & Graceful Restart

<p align="center">
  <img src="docs/screenshots/mobile-remote-settings.jpg" width="360" alt="Maintenance Dashboard" />
</p>

* **📊 Host System Metrics Dashboard**: Real-time CPU model, total/used RAM, Node heap memory, and DSH uptime;
* **🔍 1-Click Network Diagnostics**: Diagnoses reverse proxy port, LAN IPv4, Cloudflare Anycast edge, and npm mirror latency;
* **🗄️ Configuration Backup & Migration**: 1-click export/import of `.json` configuration files;
* **🔄 Graceful Smooth Restart**: 1-click DSH service restart with automatic reconnect and page reload.

---

## 💬 FAQ

<details>
  <summary><b>Q1: Phone cannot connect after scanning QR code?</b></summary>
  <br/>

  1. **Wi-Fi Check**: Ensure phone and PC are on the same Wi-Fi network with AP isolation disabled;
  2. **Multi-NIC Switching**: If WSL/VMware/VPN is enabled, switch to physical Wi-Fi/Ethernet IP in the **"🛜 Network Interface / IP Selection"** dropdown;
  3. **Firewall**: Ensure firewall allows Node.js on port `3082`;
  4. **Use Public Tunnel**: Enable Cloudflare Tunnel if crossing network segments.
</details>

<details>
  <summary><b>Q2: How is IM Bot security ensured? Can strangers trigger my agent?</b></summary>
  <br/>

  1. **Strict Allowlist**: Built-in sender allowlist; only authorized users can drive the Agent;
  2. **Auto First Authorization**: Admin sending the first message after login automatically binds to allowlist;
  3. **Silent Drop**: Unauthorized messages are dropped at the lowest layer (Never fed to LLM).
</details>

<details>
  <summary><b>Q3: What is the difference between Temporary and Fixed Cloudflare Tunnels?</b></summary>
  <br/>

  1. **Temporary (Default)**: Zero-login random `*.trycloudflare.com` domain, ideal for quick outdoor access;
  2. **Fixed (Token Mode)**: Uses Cloudflare Zero Trust Named Tunnel Token to bind your own domain with auto-start on boot.
</details>

<details>
  <summary><b>Q4: Will chat sessions and configurations be lost after upgrading or restarting DSH?</b></summary>
  <br/>

  1. **Persistent Configuration**: All credentials, allowlists, and passwords persist in `~/.dsh-bridge/`;
  2. **Session Context Recovery**: Session history is persisted by DSH core engine; resume conversations with `/resume` anytime;
  3. **Backup & Migration**: 1-click `.json` export/import in Maintenance tab.
</details>

---

## 🛠️ Development & Contribution

Contributions are welcome! Feel free to submit an Issue or Pull Request.

```bash
# 1. Clone repo
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge

# 2. Install dependencies & build
npm install
npm run build:client

# 3. Run unit tests
npm test

# 4. Link to local DSH Web Profile
dsh plugin --profile web add .
```

---

## 📄 License

MIT © [wenbin-wb](https://github.com/wenbin-wb)
