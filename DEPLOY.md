# 部署指南

本文档提供 DSH Bridge 插件和自建隧道服务器的完整部署指南。

## DSH Bridge 插件部署

### 前置要求

- Node.js >= 18.0.0
- DSH 已安装
- npm 或 pnpm

### 安装方式

#### 方式 1: 从 npm 安装（推荐）

```bash
cd /path/to/your/dsh
npm install dsh-bridge
```

#### 方式 2: 从源码安装

```bash
# 克隆仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge

# 安装依赖
npm install

# 链接到全局
npm link

# 在 DSH 项目中链接
cd /path/to/your/dsh
npm link dsh-bridge
```

### 配置插件

编辑 `cordis.yml`：

```yaml
plugins:
  dsh-bridge:
    proxy:
      port: 3082  # 本地代理端口
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com  # 可选
      accessToken: your-secret-token          # 可选
```

### 启动 DSH

```bash
dsh
```

访问 http://localhost:3080，进入设置面板配置访问方式。

---

## 自建隧道服务器部署

自建隧道服务器提供稳定的、自主可控的远程访问解决方案。

### 部署架构

```
Internet
    ↓
[Nginx (443)] → HTTPS/WSS
    ↓
[DSH Bridge Server (8080)] → WebSocket
    ↓
[DSH Instance] ← WebSocket Reverse Tunnel
```

### 方式 1: Docker Compose 部署（推荐）

#### 1. 准备环境

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 克隆仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge/server
```

#### 2. 配置环境

编辑 `docker-compose.yml`：

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
      - ALLOWED_TOKENS=token1,token2,token3  # 修改为你的 token
      - PUBLIC_URL=https://tunnel.yourdomain.com  # 修改为你的域名
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### 3. 生成安全 Token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制生成的 token，更新 `ALLOWED_TOKENS`。

#### 4. 启动服务

```bash
docker-compose up -d
```

#### 5. 查看日志

```bash
docker-compose logs -f
```

### 方式 2: 手动部署

#### 1. 安装依赖

```bash
# 克隆仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge/server

# 安装依赖
npm install --production
```

#### 2. 配置环境变量

创建 `.env` 文件：

```bash
PORT=8080
ALLOWED_TOKENS=token1,token2,token3
PUBLIC_URL=https://tunnel.yourdomain.com
```

#### 3. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start index.js --name dsh-bridge-server

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs dsh-bridge-server
```

### 方式 3: Systemd 服务

#### 1. 创建服务文件

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

#### 2. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl start dsh-bridge
sudo systemctl enable dsh-bridge
sudo systemctl status dsh-bridge
```

---

## Nginx 反向代理配置

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 配置 SSL 证书

#### 使用 Let's Encrypt（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d tunnel.yourdomain.com
```

#### 使用自签名证书

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/tunnel.key \
  -out /etc/ssl/certs/tunnel.crt
```

### Nginx 配置文件

`/etc/nginx/sites-available/dsh-bridge`：

```nginx
upstream dsh_bridge {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 80;
    server_name tunnel.yourdomain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tunnel.yourdomain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/tunnel.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tunnel.yourdomain.com/privkey.pem;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 日志
    access_log /var/log/nginx/dsh-bridge-access.log;
    error_log /var/log/nginx/dsh-bridge-error.log;

    # WebSocket 和 HTTP 代理
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
        
        # 缓冲设置
        proxy_buffering off;
    }

    # 健康检查
    location /health {
        proxy_pass http://dsh_bridge/health;
        access_log off;
    }
}
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/dsh-bridge /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 安全加固

### 1. 防火墙配置

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. Token 管理

- 使用至少 64 字符的随机 Token
- 定期轮换 Token（建议每 90 天）
- 不要在代码或配置文件中硬编码 Token
- 使用环境变量或密钥管理服务

### 3. IP 白名单（可选）

在 Nginx 中限制访问：

```nginx
location / {
    # 只允许特定 IP
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    proxy_pass http://dsh_bridge;
    # ...
}
```

### 4. 速率限制

```nginx
# 在 http 块中定义
limit_req_zone $binary_remote_addr zone=dsh_bridge_limit:10m rate=10r/s;

# 在 location 块中应用
location / {
    limit_req zone=dsh_bridge_limit burst=20 nodelay;
    proxy_pass http://dsh_bridge;
    # ...
}
```

---

## 监控和维护

### 健康检查

```bash
# 检查服务状态
curl https://tunnel.yourdomain.com/health

# 预期响应
{"status":"ok","uptime":12345,"connections":2}
```

### 日志监控

```bash
# Docker 部署
docker-compose logs -f --tail=100

# PM2 部署
pm2 logs dsh-bridge-server

# Systemd 部署
sudo journalctl -u dsh-bridge -f
```

### 性能监控

```bash
# 查看连接数
netstat -an | grep :8080 | wc -l

# 查看内存使用
docker stats dsh-bridge-server

# 或
pm2 monit
```

---

## 故障排除

### 问题 1: 连接失败

**症状**: 客户端无法连接到服务器

**排查步骤**:
1. 检查服务器是否运行：`curl http://localhost:8080/health`
2. 检查防火墙：`sudo ufw status`
3. 检查 Nginx 配置：`sudo nginx -t`
4. 查看服务器日志

### 问题 2: WebSocket 升级失败

**症状**: 连接建立后立即断开

**解决方案**:
- 确认 Nginx 配置中包含 WebSocket 支持
- 检查 `proxy_http_version 1.1`
- 检查 `Upgrade` 和 `Connection` 头

### 问题 3: Token 认证失败

**症状**: 401 Unauthorized

**解决方案**:
- 确认 Token 正确无误
- 检查 `ALLOWED_TOKENS` 环境变量
- Token 之间用逗号分隔，无空格

### 问题 4: 证书过期

**症状**: SSL 错误

**解决方案**:
```bash
# 手动更新证书
sudo certbot renew

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 性能优化

### 1. 调整并发连接数

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 4096;
```

### 2. 启用 HTTP/2

已在配置中启用：`listen 443 ssl http2;`

### 3. 优化 Node.js 进程

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=4096" pm2 start index.js
```

### 4. 启用日志轮转

```bash
# /etc/logrotate.d/dsh-bridge
/var/log/nginx/dsh-bridge-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null
    endscript
}
```

---

## 备份和恢复

### 备份配置

```bash
# 备份脚本
tar -czf dsh-bridge-backup-$(date +%Y%m%d).tar.gz \
  /opt/dsh-bridge/server \
  /etc/nginx/sites-available/dsh-bridge \
  /etc/systemd/system/dsh-bridge.service
```

### 恢复配置

```bash
tar -xzf dsh-bridge-backup-YYYYMMDD.tar.gz -C /
sudo systemctl daemon-reload
sudo systemctl restart dsh-bridge nginx
```

---

## 更新升级

### Docker 部署

```bash
cd dsh-bridge/server
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### 手动部署

```bash
cd dsh-bridge/server
git pull
npm install --production
pm2 restart dsh-bridge-server
```

---

## 生产环境清单

部署到生产环境前的检查清单：

- [ ] 使用 HTTPS/WSS 加密
- [ ] 配置强随机 Token（64+ 字符）
- [ ] 启用防火墙规则
- [ ] 配置日志轮转
- [ ] 设置健康检查和监控
- [ ] 配置自动备份
- [ ] 测试故障恢复流程
- [ ] 文档化服务器信息
- [ ] 设置告警通知
- [ ] 进行压力测试

---

## 支持

如有问题，请访问：
- GitHub Issues: https://github.com/wenbin-wb/dsh-bridge/issues
- 讨论区: https://github.com/wenbin-wb/dsh-bridge/discussions
