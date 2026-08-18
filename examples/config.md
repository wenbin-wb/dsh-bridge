# 配置示例

本文档提供 DSH Bridge 的各种配置示例。

## 基础配置

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082  # 可选，默认 3082
```

## 自建隧道配置

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: your-secret-token-here
```

## 环境变量配置

在 `~/.bashrc` 或 `~/.zshrc` 中：

```bash
# DSH Bridge 配置
export DSH_BRIDGE_SERVER=wss://tunnel.yourdomain.com
export DSH_BRIDGE_TOKEN=your-secret-token
export DSH_BRIDGE_PORT=3082
```

然后在 `cordis.yml` 中简化配置：

```yaml
plugins:
  dsh-bridge: {}
```

## 多用户配置

### 服务器端

```bash
# 生成多个 token，用逗号分隔
export ALLOWED_TOKENS=token1,token2,token3
```

### 客户端

每个用户使用自己的 token：

```yaml
# 用户 A
plugins:
  dsh-bridge:
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: token1

# 用户 B
plugins:
  dsh-bridge:
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: token2
```

## 自定义代理端口

如果 3082 端口被占用：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 9000  # 使用其他端口
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com
      accessToken: your-token
```

## 仅使用 Cloudflare 隧道

如果只需要 Cloudflare，不需要自建服务器：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    # 不设置 customTunnel
```

## 完整配置示例

```yaml
plugins:
  dsh-bridge:
    # 本地代理端口
    proxy:
      port: 3082
    
    # 自建隧道配置（可选）
    customTunnel:
      # 服务器 WebSocket 地址
      # 支持 ws:// (不加密) 和 wss:// (加密)
      # 生产环境强烈推荐使用 wss://
      serverUrl: wss://tunnel.yourdomain.com
      
      # 访问令牌
      # 使用 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` 生成
      accessToken: Kx7vYz9mN2pR8aWq3bTc4dUf5eVg6hXi
```

## 安全配置建议

### 1. 使用环境变量存储敏感信息

不推荐：
```yaml
plugins:
  dsh-bridge:
    customTunnel:
      accessToken: my-secret-token  # 明文存储
```

推荐：
```bash
# 环境变量
export DSH_BRIDGE_TOKEN=my-secret-token
```

```yaml
plugins:
  dsh-bridge: {}  # 自动读取环境变量
```

### 2. 使用强随机 token

```bash
# 生成强随机 token（64 字符）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 生产环境使用 HTTPS/WSS

不推荐：
```yaml
customTunnel:
  serverUrl: ws://your-domain.com  # 明文传输
```

推荐：
```yaml
customTunnel:
  serverUrl: wss://your-domain.com  # 加密传输
```

### 4. 定期更换 token

```bash
# 生成新 token
NEW_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 更新服务器端
export ALLOWED_TOKENS=$NEW_TOKEN
docker restart dsh-bridge-server

# 更新客户端
export DSH_BRIDGE_TOKEN=$NEW_TOKEN
```

## 不同场景的推荐配置

### 个人开发者

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    # 仅使用局域网和 Cloudflare
```

### 小团队

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    customTunnel:
      serverUrl: wss://tunnel.team.com
      accessToken: team-shared-token
```

### 企业部署

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082
    customTunnel:
      serverUrl: wss://tunnel.company.internal
      accessToken: ${DSH_BRIDGE_TOKEN}  # 从环境变量读取
```

配合：
- 独立服务器部署
- Nginx + SSL
- 防火墙限制
- 访问日志审计
- 速率限制

## 故障排查配置

### 启用详细日志

服务器端：

```bash
# Docker 部署
docker-compose logs -f --tail=100

# Systemd 部署
sudo journalctl -u dsh-bridge -f
```

### 测试配置

```bash
# 测试服务器连接
curl https://tunnel.yourdomain.com/health

# 测试代理
curl http://localhost:3082

# 测试 WebSocket（需要安装 wscat）
npm install -g wscat
wscat -c "wss://tunnel.yourdomain.com?token=your-token"
```

## 服务器端配置

### Docker Compose

`server/docker-compose.yml`：

```yaml
version: '3.8'

services:
  dsh-bridge-server:
    build: .
    container_name: dsh-bridge-server
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - ALLOWED_TOKENS=token1,token2,token3
      - PUBLIC_URL=https://tunnel.yourdomain.com
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Systemd 服务

`/etc/systemd/system/dsh-bridge.service`：

```ini
[Unit]
Description=DSH Bridge Tunnel Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/dsh-bridge/server
Environment=PORT=8080
Environment=ALLOWED_TOKENS=token1,token2,token3
Environment=PUBLIC_URL=https://tunnel.yourdomain.com
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Nginx 配置

`/etc/nginx/sites-available/dsh-bridge`：

```nginx
upstream dsh_bridge {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name tunnel.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://dsh_bridge;
        proxy_http_version 1.1;
        
        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    location /health {
        proxy_pass http://dsh_bridge/health;
        access_log off;
    }
}
```

## 参考

- [使用手册](../USAGE.md)
- [部署指南](../DEPLOY.md)
- [项目结构](../STRUCTURE.md)
- [GitHub 仓库](https://github.com/wenbin-wb/dsh-bridge)
