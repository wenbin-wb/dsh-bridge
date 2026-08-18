# 项目结构

```
dsh-bridge/
├── client/
│   └── index.js                # 客户端插件（浏览器 UI）
├── lib/
│   ├── bridge-rpc.js           # RPC 接口定义
│   ├── tunnel-client.mjs       # 自建隧道客户端
│   └── cloudflared.mjs         # Cloudflared 管理器
├── server/
│   ├── index.js                # 隧道服务器实现
│   ├── package.json            # 服务器依赖
│   ├── Dockerfile              # Docker 镜像
│   ├── docker-compose.yml      # Docker Compose 配置
│   ├── .env.example            # 环境变量示例
│   └── README.md               # 服务器文档
├── test/
│   └── index.test.js           # 单元测试
├── examples/
│   └── config.yml              # 配置示例
├── docs/
│   ├── QUICKSTART.md           # 快速开始
│   ├── DEPLOY.md               # 部署指南
│   ├── USAGE.md                # 使用手册
│   └── STRUCTURE.md            # 本文档
├── index.js                    # Host 端插件入口
├── package.json                # 项目元数据
├── README.md                   # 项目说明
├── CHANGELOG.md                # 变更日志
├── CONTRIBUTING.md             # 贡献指南
├── LICENSE                     # MIT 许可证
└── .gitignore                  # Git 忽略规则
```

## 核心文件说明

### Host 端

#### `index.js`
Host 端主入口，负责：
- 启动代理服务器
- 管理隧道状态
- 提供服务接口
- 协调各组件

关键类：
- `ProxyServer`: HTTP 和 WebSocket 代理
- `BridgeService`: 服务编排和状态管理

#### `lib/tunnel-client.mjs`
WebSocket 反向隧道客户端：
- 连接自建服务器
- Token 认证
- 请求/响应转发
- 自动重连（指数退避）
- 心跳监控

关键类：
- `CustomTunnelClient`: 隧道客户端实现

#### `lib/cloudflared.mjs`
Cloudflare 隧道管理器：
- 平台检测
- 自动下载 cloudflared 二进制
- 进程管理
- URL 解析

关键类：
- `CloudflaredManager`: Cloudflared 生命周期管理

#### `lib/bridge-rpc.js`
RPC 接口定义：
- Loopback-only 权限检查
- 状态查询接口
- 隧道控制接口

方法：
- `getStatus()`: 获取当前状态
- `startCustomTunnel()`: 启动自建隧道
- `stopCustomTunnel()`: 停止自建隧道
- `startCloudflared()`: 启动 Cloudflare 隧道
- `stopCloudflared()`: 停止 Cloudflare 隧道

### Client 端

#### `client/index.js`
浏览器端插件，提供：
- React UI 组件
- 实时状态轮询
- RPC 调用
- 二维码显示

关键功能：
- 状态卡片（局域网、Cloudflare、自建隧道）
- 启动/停止控制
- URL 复制
- 进度指示

### 服务器端

#### `server/index.js`
隧道服务器实现：
- WebSocket 服务器
- Token 验证
- 请求转发
- 连接管理

关键功能：
- 健康检查端点
- 连接跟踪
- 优雅关闭

#### `server/Dockerfile`
Docker 镜像定义：
- 基于 Node.js 18 Alpine
- 生产环境优化
- 非 root 用户运行

#### `server/docker-compose.yml`
Docker Compose 配置：
- 服务定义
- 环境变量
- 端口映射
- 健康检查

### 测试

#### `test/index.test.js`
单元测试套件：
- 服务初始化
- RPC 接口
- 错误处理

### 文档

#### `README.md`
项目主文档：
- 概述和特性
- 快速开始
- 访问方式说明
- 架构图
- 路线图

#### `docs/QUICKSTART.md`
快速开始指南：
- 5 分钟上手
- 基础配置
- 常见场景

#### `docs/DEPLOY.md`
部署指南：
- 插件安装
- 服务器部署（Docker、手动、Systemd）
- Nginx 配置
- SSL 证书
- 安全加固

#### `docs/USAGE.md`
使用手册：
- 详细使用说明
- 配置选项
- 最佳实践
- 常见问题
- 故障排查

#### `docs/STRUCTURE.md`
本文档，项目结构说明。

#### `CHANGELOG.md`
变更日志：
- 版本历史
- 新增功能
- 路线图

#### `CONTRIBUTING.md`
贡献指南：
- 开发环境设置
- 代码规范
- 提交流程

## 架构设计

### 三层架构

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

### 组件交互

```
Browser                    Host                    Remote Server
   │                        │                            │
   │   React UI             │   ProxyServer              │   Tunnel Server
   │   ↓                    │   ↓                        │   ↓
   │   RPC Call             │   BridgeService            │   WebSocket
   │   ────────────────────>│   ────────────────────────>│
   │                        │   CustomTunnelClient       │
   │                        │   ←────────────────────────│
   │   Status Update        │   HTTP/WS Proxy            │
   │   <────────────────────│                            │
   │                        │                            │
```

### 数据流

#### 局域网访问
```
Mobile Device → LAN → ProxyServer (3082) → DSH (3080)
```

#### Cloudflare 隧道
```
Internet → Cloudflare → cloudflared → ProxyServer (3082) → DSH (3080)
```

#### 自建隧道
```
Internet → Nginx (443) → Tunnel Server (8080)
    ↓ WebSocket Reverse Tunnel
CustomTunnelClient → ProxyServer (3082) → DSH (3080)
```

## 核心算法

### 网络检测算法

智能选择最佳 LAN IP：

```javascript
评分规则：
- 私有地址段（RFC1918）: +100
- 物理网卡: +20
- VPN/虚拟网卡: -50
- 非活动接口: -100

选择得分最高的 IPv4 地址
```

### 重连策略

指数退避算法：

```
尝试次数    等待时间
1           5 秒
2           10 秒
3           20 秒
4           40 秒
5           80 秒
5+          失败
```

### 二维码缓存

LRU + TTL 双重策略：

```
- 最大容量: 8 条目
- TTL: 30 分钟
- 淘汰策略: 最久未使用
```

## 安全边界

### 信任模型

```
Trusted Zone (localhost)
├── DSH Instance (3080)
├── ProxyServer (3082)
└── Host Plugin

Untrusted Zone (network)
├── Browser Client
├── Remote Tunnel Server
└── Public Internet

Trust Boundary
├── Loopback-only RPC
├── Token Authentication
└── Host Header Rewriting
```

### 认证流程

```
Client                    Server
  │                          │
  │  WebSocket + ?token=xxx  │
  ├─────────────────────────>│
  │                          │ Validate Token
  │                          │ Check ALLOWED_TOKENS
  │                          │
  │  Accept / Reject         │
  │<─────────────────────────┤
  │                          │
```

## 扩展点

### 添加新的访问方式

1. 在 `lib/` 创建新的客户端类
2. 在 `BridgeService` 中注册
3. 在 `bridge-rpc.js` 添加控制接口
4. 在 `client/index.js` 添加 UI

### 添加机器人集成

1. 在顶层创建 `integrations/` 目录
2. 实现机器人客户端
3. 连接到 `ProxyServer`
4. 添加配置和文档

### 自定义代理逻辑

继承 `ProxyServer` 类：

```javascript
class CustomProxyServer extends ProxyServer {
  handleRequest(req, res) {
    // 自定义逻辑
    super.handleRequest(req, res)
  }
}
```

## 依赖关系

### 运行时依赖

- `ws`: WebSocket 客户端和服务器
- `qrcode`: 二维码生成

### 开发依赖

无（生产级项目，零开发依赖）

### Peer 依赖

- `cordis`: Cordis 插件框架
- DSH 内置服务

## 配置优先级

```
1. 环境变量 (DSH_BRIDGE_*)
2. cordis.yml 配置
3. 内置默认值
```

## 端口分配

- 3080: DSH Web 服务（默认）
- 3082: Bridge 代理服务器（默认）
- 8080: 隧道服务器（服务器端默认）

如果 3082 被占用，会自动尝试 3083、3084...

## 日志级别

```
info: 正常操作
warn: 可恢复错误
error: 严重错误
debug: 详细调试信息（需启用 DEBUG=dsh-bridge:*）
```

## 性能考虑

### 内存使用

- 二维码缓存: 最多约 1MB（8 条目 × 128KB）
- 连接跟踪: 每连接约 1KB
- 总体开销: < 10MB

### CPU 使用

- 代理转发: 最小开销（基于流）
- 二维码生成: 首次缓存未命中时计算
- 心跳检查: 30 秒间隔，可忽略

### 网络带宽

- 心跳: 每 30 秒约 100 字节
- 代理转发: 透传，无额外开销

## 故障恢复

### 自动恢复

- 隧道断线: 自动重连（最多 5 次）
- 代理服务器崩溃: Cordis 自动重启插件
- 服务器重启: 客户端自动重连

### 需要手动干预

- Token 错误: 更新配置
- 端口冲突: 更改端口配置
- 证书过期: 更新 SSL 证书

## 开发工作流

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge

# 2. 链接到本地 DSH
npm link

# 3. 在 DSH 中使用
cd /path/to/dsh
npm link dsh-bridge

# 4. 修改代码后重启 DSH
```

### 测试

```bash
npm test
```

### 发布

```bash
# 1. 更新版本
npm version patch|minor|major

# 2. 推送标签
git push --follow-tags

# 3. 发布到 npm
npm publish
```

## 更多信息

- [快速开始](./QUICKSTART.md)
- [部署指南](./DEPLOY.md)
- [使用手册](./USAGE.md)
- [贡献指南](../CONTRIBUTING.md)
- [变更日志](../CHANGELOG.md)
