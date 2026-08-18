# 使用手册

完整的使用文档，包括安装、配置、使用和最佳实践。

## 目录

- [快速开始](#快速开始)
- [安装](#安装)
- [配置](#配置)
- [使用](#使用)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

## 快速开始

### 5 分钟快速体验

```bash
# 1. 安装插件
npm install dsh-bridge

# 2. 配置 DSH（在 cordis.yml 中添加）
cat >> ~/.dsh/cordis.yml << 'EOF'
plugins:
  dsh-bridge: {}
EOF

# 3. 启动 DSH
dsh web

# 4. 打开浏览器
# http://localhost:3080

# 5. 进入设置 -> DSH Bridge
# 点击"启动 Cloudflare 隧道"获取公网地址
```

## 安装

### 方式一: npm（推荐）

```bash
npm install dsh-bridge
```

### 方式二: 从源码

```bash
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge
npm install
npm link
```

## 配置

### 基础配置

编辑 `cordis.yml`：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082  # 本地代理端口，默认 3082
```

### 自建隧道配置

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: your-secret-token-here
```

### 环境变量配置

```bash
# Linux/macOS
export DSH_BRIDGE_SERVER=wss://tunnel.yourdomain.com
export DSH_BRIDGE_TOKEN=your-secret-token
export DSH_BRIDGE_PORT=3082

# Windows PowerShell
$env:DSH_BRIDGE_SERVER="wss://tunnel.yourdomain.com"
$env:DSH_BRIDGE_TOKEN="your-secret-token"
$env:DSH_BRIDGE_PORT="3082"
```

环境变量优先级高于配置文件。

## 使用

### 局域网访问

适合在同一 Wi-Fi 网络下从移动设备访问。

#### 步骤

1. 打开 DSH Bridge 设置页面
2. 查看"局域网访问"卡片
3. 使用移动设备扫描二维码
4. 或者手动输入显示的 URL

#### 特点

- 无需配置，自动检测
- 不依赖互联网
- 低延迟
- 数据不经过第三方

#### 适用场景

- 在家或办公室快速访问
- 开发测试
- 演示展示

### Cloudflare 隧道

快速获取公网地址，无需自建服务器。

#### 步骤

1. 打开 DSH Bridge 设置页面
2. 找到"Cloudflare 隧道"卡片
3. 点击"启动"按钮
4. 等待自动下载 cloudflared（首次约 20MB）
5. 获取公网 URL，扫码或复制访问

#### 特点

- 一键启动
- 无需账户
- 自动配置
- 临时 URL

#### 注意事项

- URL 每次重启会改变
- 依赖 Cloudflare 服务
- 受 Cloudflare 使用条款约束
- 可能有速率限制

#### 适用场景

- 快速分享
- 临时演示
- 开发测试
- 远程协作

### 自建隧道

生产级解决方案，提供稳定的自定义域名。

#### 前置要求

- 一台公网服务器
- 域名（可选，推荐）
- SSL 证书（生产环境必需）

#### 服务器部署

参见 [部署指南](./DEPLOY.md) 获取完整的服务器部署说明。

快速部署：

```bash
# 克隆仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge/server

# 配置环境
nano docker-compose.yml
# 修改 ALLOWED_TOKENS 和 PUBLIC_URL

# 启动服务
docker-compose up -d
```

#### 客户端配置

在 DSH Bridge 设置中：

1. 输入服务器 URL（wss://tunnel.yourdomain.com）
2. 输入访问 Token
3. 点击"启动"

#### 特点

- 固定域名
- 完全自主
- 生产级可靠性
- 自定义 SSL

#### 适用场景

- 生产环境
- 长期使用
- 团队协作
- 企业部署

## 最佳实践

### 开发环境

推荐配置：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
```

访问方式：
- 主要使用**局域网访问**（快速、零配置）
- 需要分享时使用 **Cloudflare 隧道**

### 生产环境

推荐配置：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: ${DSH_BRIDGE_TOKEN}  # 从环境变量读取
```

访问方式：
- 使用**自建隧道**（稳定、可控）
- 配置 HTTPS/WSS
- 使用强 Token（64+ 字符）
- 定期轮换 Token

### 安全建议

1. **Token 管理**
   - 生成强随机 Token：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - 存储在环境变量或密钥管理服务
   - 定期轮换（建议 90 天）
   - 不要提交到代码仓库

2. **网络安全**
   - 生产环境必须使用 HTTPS/WSS
   - 配置防火墙规则
   - 考虑使用 VPN
   - 限制访问 IP（可选）

3. **监控和日志**
   - 监控活动连接数
   - 记录访问日志
   - 设置异常告警
   - 定期检查日志

### 性能优化

1. **本地代理端口**
   - 默认 3082，如有冲突会自动递增
   - 确保端口未被占用

2. **网络优化**
   - 局域网访问：确保同一网络
   - 自建隧道：选择低延迟服务器
   - Cloudflare：依赖 Cloudflare CDN

3. **资源监控**
   - 查看活动连接数
   - 监控内存使用
   - 定期重启服务（长期运行）

## 常见问题

### Q: 局域网访问无法连接？

**A**: 检查以下几点：
1. 设备在同一 Wi-Fi 网络
2. 防火墙允许端口 3082
3. 尝试手动输入 IP:端口
4. 检查路由器是否开启 AP 隔离

### Q: Cloudflare 启动失败？

**A**: 可能的原因：
1. 网络连接问题
2. 磁盘空间不足（需要约 20MB）
3. 下载被中断

解决方案：
- 检查网络连接
- 查看浏览器控制台错误
- 重新启动

### Q: 自建服务器连接不上？

**A**: 排查步骤：
1. 确认服务器 URL 正确（注意 wss:// 前缀）
2. 确认 Token 正确
3. 检查服务器是否运行：`curl https://your-server.com/health`
4. 查看服务器日志
5. 确认防火墙允许 WebSocket 连接

### Q: URL 每次重启都变化？

**A**: 
- Cloudflare 隧道的 URL 每次启动都会变
- 如需固定 URL，请使用自建服务器
- 自建服务器可以配置自定义域名

### Q: 如何停止隧道？

**A**: 在设置页面点击对应的"停止"按钮即可。

### Q: 支持哪些平台？

**A**: 
- 客户端：所有支持 Node.js 18+ 的平台
- 服务器：Linux、macOS、Windows
- 浏览器：Chrome、Firefox、Safari、Edge

### Q: 数据安全吗？

**A**: 
- 局域网访问：数据不离开本地网络
- Cloudflare 隧道：数据经过 Cloudflare
- 自建隧道：完全自主，使用 HTTPS/WSS 加密

### Q: 有连接数限制吗？

**A**: 
- 插件本身无硬性限制
- 取决于服务器资源
- Cloudflare 可能有速率限制

## 故障排查

### 日志查看

#### 客户端日志

浏览器控制台（F12）：
- 查看网络请求
- 查看控制台错误
- 查看 WebSocket 连接状态

#### 服务器日志

Docker 部署：
```bash
docker-compose logs -f dsh-bridge-server
```

PM2 部署：
```bash
pm2 logs dsh-bridge-server
```

Systemd 部署：
```bash
sudo journalctl -u dsh-bridge -f
```

### 常见错误

#### 错误: Port already in use

**原因**: 端口 3082 已被占用

**解决方案**:
```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3083  # 更改为其他端口
```

或者，插件会自动尝试递增端口。

#### 错误: Connection timeout

**原因**: 网络连接超时

**解决方案**:
1. 检查网络连接
2. 检查防火墙规则
3. 检查服务器是否运行
4. 增加超时时间（服务器配置）

#### 错误: Authentication failed

**原因**: Token 验证失败

**解决方案**:
1. 确认 Token 正确
2. 检查服务器 `ALLOWED_TOKENS` 配置
3. 确保 Token 之间用逗号分隔，无空格

#### 错误: WebSocket upgrade failed

**原因**: WebSocket 协议升级失败

**解决方案**:
1. 检查 Nginx 配置是否支持 WebSocket
2. 确认使用 wss:// 而非 ws://（生产环境）
3. 检查代理配置

### 调试模式

启用详细日志：

```bash
# 设置环境变量
export DEBUG=dsh-bridge:*

# 启动 DSH
dsh web
```

### 网络诊断

```bash
# 测试服务器连通性
curl -v https://tunnel.yourdomain.com/health

# 测试 WebSocket 连接
wscat -c wss://tunnel.yourdomain.com?token=your-token

# 检查端口占用
netstat -an | grep 3082

# 测试防火墙
telnet your-server.com 443
```

## 高级用法

### 多实例部署

在不同端口运行多个 DSH 实例：

```yaml
# 实例 1 - cordis.yml
plugins:
  dsh-bridge:
    proxy:
      port: 3082

# 实例 2 - cordis-2.yml
plugins:
  dsh-bridge:
    proxy:
      port: 3083
```

### 自定义代理逻辑

如需修改代理行为，可以 fork 项目并修改 `index.js` 中的 `ProxyServer` 类。

### API 集成

服务器提供健康检查端点：

```bash
GET /health

响应：
{
  "status": "ok",
  "uptime": 12345,
  "connections": 2
}
```

## 更多帮助

- 文档：https://github.com/wenbin-wb/dsh-bridge#readme
- 部署指南：https://github.com/wenbin-wb/dsh-bridge/blob/main/DEPLOY.md
- 问题反馈：https://github.com/wenbin-wb/dsh-bridge/issues
- 讨论区：https://github.com/wenbin-wb/dsh-bridge/discussions

---

如有其他问题，欢迎在 GitHub 上提 issue 或参与讨论。
