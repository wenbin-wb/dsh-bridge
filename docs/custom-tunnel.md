# 自建隧道服务器搭建教程

dsh-bridge 的「自建隧道」功能基于 WebSocket 反向代理协议，你需要一台有公网 IP 的服务器来部署隧道服务端。

## 工作原理

```
手机/外网设备
    │  HTTPS 请求
    ▼
隧道服务端（你的公网服务器）
    │  WebSocket 转发
    ▼
dsh-bridge（你的本地电脑）
    │  HTTP 转发
    ▼
DSH（127.0.0.1:3080）
```

dsh-bridge 主动连接到你的服务端，外部请求通过 WebSocket 实时转发到本地，本地无需开放任何端口。

## 前置条件

- 一台有公网 IP 的 VPS 或云服务器（国内外均可）
- 服务器上安装 Node.js 18+
- 有一个域名（推荐），并解析到该服务器

## 方式一：使用 frp（推荐新手）

frp 是目前最成熟的内网穿透工具，配置简单。

### 1. 在服务器上安装 frp 服务端

```bash
# 下载 frp（以 0.58.0 为例，可到 https://github.com/fatedier/frp/releases 查看最新版本）
wget https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_amd64.tar.gz
tar -xzf frp_0.58.0_linux_amd64.tar.gz
cd frp_0.58.0_linux_amd64
```

### 2. 配置服务端 `frps.toml`

```toml
bindPort = 7000

# 开启 HTTP 代理（用于访问 DSH）
vhostHTTPPort = 8080

# 鉴权（设置一个复杂的 token）
auth.method = "token"
auth.token = "your-secret-token"
```

启动：
```bash
./frps -c frps.toml
```

### 3. 在本地 dsh-bridge 配置客户端

frp 的客户端配置比 dsh-bridge 内置协议复杂，推荐使用方式二。

---

## 方式二：使用兼容 dsh-bridge 协议的 Node.js 服务端（推荐）

dsh-bridge 的自建隧道使用简单的 WebSocket 协议，你只需在服务端运行一个小型 Node.js 程序。

### 服务端协议说明

客户端连接时会发送：
```
WebSocket: wss://your-server.com/connect?token=your-token
```

服务端握手成功后发送：
```json
{ "type": "ready", "publicUrl": "https://your-server.com" }
```

之后服务端将外部 HTTP 请求转发给客户端：
```json
{ "type": "request", "requestId": "xxx", "method": "GET", "path": "/", "headers": {...}, "body": "base64..." }
```

客户端响应：
```json
{ "type": "response", "requestId": "xxx", "statusCode": 200, "headers": {...}, "body": "base64..." }
```

心跳检测：
```json
// 客户端发送
{ "type": "ping" }
// 服务端回复
{ "type": "pong" }
```

### 最简服务端实现

在服务器上创建 `tunnel-server.mjs`：

```js
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = 3000;
const TOKEN = process.env.TOKEN || 'your-secret-token';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://your-server.com:${PORT}`;

const httpServer = createServer((req, res) => {
  // 找到已连接的隧道客户端
  const client = [...tunnelClients.values()][0];
  if (!client) {
    res.writeHead(503);
    res.end('No tunnel client connected');
    return;
  }

  // 读取请求 body
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const requestId = Math.random().toString(36).slice(2);
    const body = Buffer.concat(chunks).toString('base64');

    // 转发给隧道客户端
    client.send(JSON.stringify({
      type: 'request',
      requestId,
      method: req.method,
      path: req.url,
      headers: req.headers,
      body,
    }));

    // 等待客户端响应
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      res.writeHead(504);
      res.end('Gateway Timeout');
    }, 30000);

    pending.set(requestId, { res, timeout });
  });
});

const wss = new WebSocketServer({ server: httpServer, path: '/connect' });
const tunnelClients = new Map();
const pending = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');

  if (token !== TOKEN) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  const id = Math.random().toString(36).slice(2);
  tunnelClients.set(id, ws);
  console.log(`Tunnel client connected: ${id}`);

  // 发送 ready 消息
  ws.send(JSON.stringify({ type: 'ready', publicUrl: PUBLIC_URL }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'response') {
        const p = pending.get(msg.requestId);
        if (p) {
          clearTimeout(p.timeout);
          pending.delete(msg.requestId);
          p.res.writeHead(msg.statusCode, msg.headers);
          p.res.end(Buffer.from(msg.body || '', 'base64'));
        }
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {}
  });

  ws.on('close', () => {
    tunnelClients.delete(id);
    console.log(`Tunnel client disconnected: ${id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Tunnel server running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
});
```

安装依赖并启动：

```bash
npm init -y
npm install ws
TOKEN=your-secret-token PUBLIC_URL=https://your-domain.com node tunnel-server.mjs
```

### 用 Nginx 反向代理（启用 HTTPS）

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        # WebSocket 支持（关键）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

---

## 在 dsh-bridge 中配置

服务端启动后，在 DSH 设置页「远程访问」→「自建隧道」中填写：

- **WebSocket 地址**：`wss://your-domain.com/connect`（如果没有 HTTPS，用 `ws://your-server.com:3000/connect`）
- **访问令牌**：与服务端 TOKEN 一致

点「保存配置」后点「开启」，连接成功后会显示公网 URL。

---

## 常见问题

**连接超时**：检查服务器防火墙是否放行了对应端口，以及 Nginx 是否正确配置了 WebSocket 升级头。

**连接后断开**：检查 Nginx 的 `proxy_read_timeout`，WebSocket 长连接需要设置较长的超时时间（建议 3600s）。

**显示 Bad Gateway**：dsh-bridge 连接到服务端成功，但服务端转发到 DSH 失败。检查 DSH 是否在运行，以及 dsh-bridge 配置的本地代理端口是否正确。
