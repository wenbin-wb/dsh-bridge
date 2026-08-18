# DSH Remote 项目结构

```
dsh-remote/
├── bin/
│   └── dsh-remote.mjs          # 命令行工具
├── client/
│   └── index.js                # Client 端插件 (Web UI)
├── lib/
│   ├── tunnel.mjs              # 自建服务器隧道客户端
│   ├── cloudflared.mjs         # Cloudflare 隧道管理
│   └── web-rpc.js              # Host-Client RPC 接口
├── server/
│   ├── index.mjs               # 服务器端入口
│   ├── package.json            # 服务器依赖
│   ├── Dockerfile              # Docker 镜像
│   ├── docker-compose.yml      # Docker Compose 配置
│   ├── .env.example            # 环境变量示例
│   └── README.md               # 服务器部署文档
├── examples/
│   └── config.md               # 配置示例
├── index.js                    # Host 端插件入口
├── package.json                # 项目元数据
├── README.md                   # 项目说明
├── USAGE.md                    # 使用指南
├── CHANGELOG.md                # 更新日志
├── LICENSE                     # MIT 许可证
└── .gitignore                  # Git 忽略规则
```

## 核心文件说明

### Host 端

#### `index.js`
- Host 端主入口
- 启动代理服务器
- 管理隧道状态
- 提供服务接口

#### `lib/tunnel.mjs`
- WebSocket 反向隧道客户端
- 连接自建服务器
- Token 认证
- 请求/响应转发

#### `lib/cloudflared.mjs`
- Cloudflare 隧道管理
- 自动下载 cloudflared
- 解析公网 URL
- 进程生命周期管理

#### `lib/web-rpc.js`
- Host-Client RPC 接口
- 状态查询
- 隧道控制
- 错误处理

### Client 端

#### `client/index.js`
- Web UI 插件
- 设置面板
- 实时状态显示
- 操作按钮和二维码

### 服务器端

#### `server/index.mjs`
- WebSocket 服务器
- HTTP 反向代理
- Token 认证
- 多客户端管理

### 工具

#### `bin/dsh-remote.mjs`
- 命令行工具
- 生成 token
- 显示帮助信息

## 数据流

### 局域网访问

```
客户端设备 → 代理服务器 (port 3082) → DSH Web (port 3080)
```

### Cloudflare 隧道

```
公网访问 → Cloudflare 网络 → cloudflared → 代理服务器 → DSH Web
```

### 自建服务器隧道

```
公网访问 → 自建服务器 → WebSocket 隧道 → 代理服务器 → DSH Web
```

## 状态管理

### Host 端状态

```javascript
{
  // 代理服务器
  proxyServer: HttpServer,
  proxyRunning: boolean,
  
  // 局域网
  lanUrls: string[],
  lanQr: string,
  
  // 自建服务器
  reverseTunnel: { close, onClose },
  reverseTunnelRunning: boolean,
  reverseTunnelUrl: string,
  reverseTunnelQr: string,
  reverseTunnelState: { phase, detail },
  
  // Cloudflare
  cloudflared: { kill, onExit },
  cloudflaredRunning: boolean,
  cloudflaredUrl: string,
  cloudflaredQr: string,
  cloudflaredState: { phase, detail },
}
```

### Client 端状态

```javascript
{
  status: {
    lanUrl: string,
    lanUrls: string[],
    lanQr: string,
    
    serverConfigured: boolean,
    reverseTunnelRunning: boolean,
    reverseTunnelUrl: string,
    reverseTunnelQr: string,
    reverseTunnelState: { phase, detail },
    
    cloudflaredRunning: boolean,
    cloudflaredUrl: string,
    cloudflaredQr: string,
    cloudflaredState: { phase, detail },
  },
  
  loading: boolean,
  error: string,
  actionLoading: { [action]: boolean },
}
```

## RPC 接口

### `dsh-remote.status`
- 获取当前状态
- 返回所有隧道信息

### `dsh-remote.startReverseTunnel`
- 启动自建服务器隧道
- 返回 { success, error? }

### `dsh-remote.stopReverseTunnel`
- 停止自建服务器隧道
- 返回 { success, error? }

### `dsh-remote.startCloudflaredTunnel`
- 启动 Cloudflare 隧道
- 返回 { success, error? }

### `dsh-remote.stopCloudflaredTunnel`
- 停止 Cloudflare 隧道
- 返回 { success, error? }

## WebSocket 协议 (自建服务器)

### 客户端 → 服务器

#### 认证
```json
// 通过 URL 参数发送
wss://server?token=YOUR_TOKEN
```

#### 响应
```json
{
  "type": "response",
  "requestId": "abc123",
  "statusCode": 200,
  "headers": {}
}
```

```json
{
  "type": "response-data",
  "requestId": "abc123",
  "data": "base64..."
}
```

```json
{
  "type": "response-end",
  "requestId": "abc123"
}
```

### 服务器 → 客户端

#### 认证成功
```json
{
  "type": "authenticated",
  "tunnelId": "abc123",
  "publicUrl": "https://server/abc123"
}
```

#### 请求
```json
{
  "type": "request",
  "requestId": "def456",
  "method": "GET",
  "path": "/api/status",
  "headers": {},
  "body": "base64..." // 可选
}
```

## 环境变量

### 客户端

- `DSH_REMOTE_PORT` - 代理端口 (默认 3082)
- `DSH_REMOTE_SERVER` - 服务器 WebSocket 地址
- `DSH_REMOTE_TOKEN` - 访问令牌

### 服务器端

- `PORT` - 服务器端口 (默认 8080)
- `ALLOWED_TOKENS` - 允许的令牌 (逗号分隔)
- `LOG_LEVEL` - 日志级别 (可选)

## 配置文件

### Cordis 配置 (cordis.yml)

```yaml
plugins:
  dsh-remote:
    port: 3082
    serverUrl: wss://server
    accessToken: token
    home: ~/.dsh-remote
  
  dsh-remote:client: {}
```

### 服务器配置 (.env)

```bash
PORT=8080
ALLOWED_TOKENS=token1,token2
```

## 依赖关系

### 运行时依赖

- `ws` - WebSocket 库
- `qrcode` - 二维码生成

### 对等依赖

- `cordis` - Cordis 插件系统

### 外部工具

- `cloudflared` - Cloudflare 隧道 (自动下载)

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 链接到全局
npm link

# 在 DSH 项目中使用
cd /path/to/dsh
npm link dsh-remote

# 启动 DSH
dsh web
```

### 测试服务器

```bash
# 启动服务器
cd server
npm install
ALLOWED_TOKENS=test-token node index.mjs

# 测试连接
wscat -c "ws://localhost:8080?token=test-token"
```

### 调试

```bash
# 启用详细日志
DEBUG=dsh-remote dsh web

# 查看 cloudflared 输出
~/.dsh-remote/cloudflared tunnel --url http://localhost:3082
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](./LICENSE)
