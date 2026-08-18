# DSH Bridge

<div align="center">

**DSH 多通道访问桥接插件** - 远程隧道、局域网访问与机器人集成

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![DSH Plugin](https://img.shields.io/badge/DSH-Plugin-blue)](https://github.com/deepseek-ai/dsh)

[English](#english) | [中文](#chinese)

</div>

---

<a name="chinese"></a>

## 概述

DSH Bridge 是一个生产级插件，为 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/dsh) 提供多通道访问能力。通过移动设备、其他计算机或消息平台访问您的 DSH 实例。

### 核心特性

- **局域网访问**：自动检测本地网络并生成二维码
- **Cloudflare 隧道**：一键获取公网地址
- **自建隧道**：WebSocket 反向隧道连接自建服务器
- **机器人就绪**：可扩展架构，为未来的微信、QQ、Telegram、飞书集成做好准备
- **优雅界面**：生产级设置面板，实时状态监控
- **安全可靠**：Token 认证、Loopback-only RPC、严格的信任边界

## 快速开始

### 安装

```bash
# 安装插件
npm install dsh-bridge

# 或使用 pnpm
pnpm add dsh-bridge
```

### 配置

在 `cordis.yml` 中添加：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082  # 代理端口（可选，默认 3082）
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com  # 可选
      accessToken: your-secret-token           # 可选
```

或使用环境变量：

```bash
export DSH_BRIDGE_SERVER=wss://tunnel.yourdomain.com
export DSH_BRIDGE_TOKEN=your-secret-token
```

### 使用

1. 启动启用插件的 DSH
2. 在浏览器打开 `http://localhost:3080`
3. 导航到 **设置 → DSH Bridge**
4. 选择访问方式：
   - **局域网访问**：从同一 Wi-Fi 下的移动设备扫描二维码
   - **Cloudflare**：点击"启动"获取即时公网地址
   - **自建服务器**：配置并启动您自己的隧道

## 访问方式

### 局域网访问

适合从同一网络下的手机或平板访问 DSH。

**特性：**
- 自动检测最佳网络接口
- 二维码即时移动访问
- 无需互联网连接
- 零配置

**使用场景：** 在家或办公室从移动设备快速访问

---

### Cloudflare 隧道

无需服务器设置即可获取公网地址的最快方式。

**特性：**
- 一键激活
- 自动下载 cloudflared 二进制
- 无需账户
- 免费层级可用

**限制：**
- 每次重启 URL 会改变
- 受 Cloudflare 条款约束
- 可能有速率限制

**使用场景：** 快速演示、临时分享、开发测试

---

### 自建隧道

完全控制的生产级解决方案。

**特性：**
- 稳定的自定义域名
- Token 认证
- 完全控制访问和日志
- Docker 一键部署

**优势：**
- 持久化 URL
- 无第三方依赖
- 企业级可靠性
- 自定义 SSL 证书

**使用场景：** 生产环境、长期远程访问、团队协作

## 架构

DSH Bridge 采用分层架构设计：

```
┌─────────────────────────────────────────────────────────────┐
│                        集成层（规划中）                        │
│  ┌──────────┬──────────┬───────────┬──────────┬───────────┐ │
│  │   微信   │    QQ    │ Telegram  │   飞书   │   Slack   │ │
│  └──────────┴──────────┴───────────┴──────────┴───────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                           访问层                             │
│  ┌──────────┬──────────────────┬──────────────────────────┐ │
│  │ 局域网   │  Cloudflare 隧道  │     自建隧道服务器       │ │
│  │ 访问     │                  │   (WebSocket 反向隧道)    │ │
│  └──────────┴──────────────────┴──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │   本地 DSH 实例   │
                    │  (localhost:3080) │
                    └──────────────────┘
```

### 组件

- **访问层**：提供多种访问 DSH 的方式
  - 局域网访问：智能 IP 检测 + 二维码生成
  - Cloudflare 隧道：自动下载和管理 cloudflared
  - 自建隧道：WebSocket 反向隧道客户端

- **集成层**（规划中）：机器人和第三方平台集成
  - 微信机器人（通过 Clawbot）
  - QQ 机器人
  - Telegram 机器人
  - 飞书机器人
  - Slack/Discord 集成

- **服务编排**：
  - 代理服务器：HTTP 和 WebSocket 流量转发
  - 状态管理：集中式连接和健康监控
  - 错误恢复：自动重连和优雅降级

## 自建隧道服务器

### 服务器部署

#### 使用 Docker Compose（推荐）

```bash
cd server
docker-compose up -d
```

#### 手动部署

```bash
cd server
npm install
ALLOWED_TOKENS=token1,token2 PORT=8080 npm start
```

### 环境变量

- `ALLOWED_TOKENS`：允许的访问令牌列表（逗号分隔）
- `PORT`：服务器监听端口（默认 8080）
- `SUBDOMAIN`：自定义子域名（可选）

### 客户端配置

在 DSH Bridge 设置中配置自建服务器：

```yaml
customTunnel:
  serverUrl: wss://tunnel.yourdomain.com
  accessToken: your-secret-token
```

## 安全性

### 认证机制

- **Token 认证**：自建隧道使用 Token 验证客户端
- **Loopback-only RPC**：浏览器到宿主通信限制在本地回环
- **Host Header 重写**：代理服务器重写 Host 头为 `127.0.0.1`

### 最佳实践

1. **Token 管理**
   - 使用强随机 Token（至少 32 字符）
   - 定期轮换 Token
   - 不要在公共仓库中提交 Token

2. **网络隔离**
   - 自建隧道服务器应使用 HTTPS/WSS
   - 配置防火墙规则限制访问
   - 考虑使用 VPN 额外保护

3. **监控和日志**
   - 监控活动连接数
   - 记录访问日志
   - 设置异常告警

## 技术细节

### 代理服务器

- HTTP 和 WebSocket 双协议支持
- 连接跟踪和健康监控
- 自动端口分配（端口冲突时）
- 优雅关闭和资源清理

### 隧道客户端

- 自动重连机制（指数退避：5s → 10s → 20s → 40s → 80s）
- 心跳监控（30 秒间隔）
- 请求多路复用
- 最大 5 次重连尝试
- 详细的连接日志

### Cloudflared 管理器

- 平台检测（Windows/macOS/Linux/ARM）
- 自动下载适配二进制
- 版本管理和缓存
- 进程生命周期管理

### 二维码缓存

- LRU 缓存（最大 8 条目）
- 30 分钟 TTL
- 自动过期清理
- 内存高效

## 开发

### 项目结构

```
dsh-bridge/
├── index.js                 # 主插件入口（Host）
├── client/
│   └── index.js            # 客户端插件（Browser UI）
├── lib/
│   ├── bridge-rpc.js       # RPC 接口定义
│   ├── tunnel-client.mjs   # 自建隧道客户端
│   └── cloudflared.mjs     # Cloudflared 管理器
├── server/
│   ├── index.js            # 隧道服务器实现
│   ├── Dockerfile          # Docker 镜像
│   └── docker-compose.yml  # Docker Compose 配置
├── test/
│   └── index.test.js       # 单元测试
├── examples/
│   └── config.yml          # 配置示例
└── docs/
    ├── QUICKSTART.md       # 快速开始
    ├── DEPLOY.md           # 部署指南
    ├── USAGE.md            # 使用手册
    └── STRUCTURE.md        # 架构说明
```

### 运行测试

```bash
npm test
```

### 贡献

参见 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解贡献指南。

## 路线图

### v1.1.0 - 机器人集成（2025 Q2）
- 微信机器人集成（通过 Clawbot）
- QQ 机器人集成
- Telegram 机器人集成
- 飞书机器人集成

### v1.2.0 - 高级功能（2025 Q3）
- Webhook 端点
- 跨设备会话共享
- 移动端优化界面
- 自定义域名支持
- 流量限速和整形

### v1.3.0 - 企业功能（2025 Q4）
- 多用户支持
- 分析仪表盘
- 流量日志和审计
- Slack/Discord 集成

### v2.0.0 - 平台扩展（2026 Q1）
- 原生移动应用
- 桌面托盘应用
- 浏览器扩展
- 第三方集成 API

## 常见问题

### 为什么需要 DSH Bridge？

DSH 默认只监听 `localhost:3080`，无法从其他设备访问。DSH Bridge 提供安全的远程访问方案，同时为未来的机器人集成预留扩展能力。

### 与 cloudflared 的关系？

DSH Bridge 与 cloudflared 是**共存**关系，不是替代关系。DSH Bridge 提供三种访问方式，Cloudflare 隧道只是其中之一。同时提供自建隧道和局域网访问作为备选方案。

### 自建隧道 vs Cloudflare 隧道？

| 特性 | 自建隧道 | Cloudflare 隧道 |
|------|---------|----------------|
| URL 稳定性 | 固定域名 | 每次重启改变 |
| 部署复杂度 | 需要服务器 | 零配置 |
| 数据控制 | 完全自主 | 经过 Cloudflare |
| 成本 | 服务器成本 | 免费（有限制） |
| 企业适用 | 推荐 | 不推荐 |

### 如何选择访问方式？

- **局域网访问**：移动设备在同一 Wi-Fi，零配置
- **Cloudflare 隧道**：快速演示、临时分享
- **自建隧道**：生产环境、长期使用、团队协作

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

<a name="english"></a>

## Overview (English)

DSH Bridge is a production-grade plugin that extends [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/dsh) with multi-channel access capabilities. Access your DSH instance from anywhere - mobile devices, other computers, or integrate with messaging platforms.

### Key Features

- **LAN Access**: Automatic local network detection with QR code
- **Cloudflare Tunnel**: One-click public URL via cloudflared
- **Custom Tunnel**: Self-hosted WebSocket reverse tunnel
- **Bot Ready**: Extensible architecture for future WeChat, QQ, Telegram, Lark integrations
- **Elegant UI**: Production-grade settings panel with real-time status
- **Secure**: Token authentication, loopback-only RPC, proper trust boundaries

## Quick Start

### Installation

```bash
npm install dsh-bridge
```

### Configuration

Add to your `cordis.yml`:

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: your-secret-token
```

### Usage

1. Start DSH with the plugin enabled
2. Open `http://localhost:3080`
3. Navigate to **Settings → DSH Bridge**
4. Choose your access method

For detailed documentation, see:
- [Quick Start Guide](./docs/QUICKSTART.md)
- [Deployment Guide](./docs/DEPLOY.md)
- [Usage Manual](./docs/USAGE.md)
- [Architecture](./docs/STRUCTURE.md)

## License

MIT License - see [LICENSE](./LICENSE)
