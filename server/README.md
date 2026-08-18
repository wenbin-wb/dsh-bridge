# DSH Bridge 隧道服务器

生产级 WebSocket 反向隧道服务器。

## 特性

- WebSocket 反向隧道：高效双向通信
- Token 认证：安全访问控制
- 心跳监控：自动超时检测
- 健康检查端点：监控服务器状态
- 优雅关闭：清理所有连接
- Docker 支持：容器化部署

## 快速开始

### Docker（推荐）

```bash
cd server
docker-compose up -d
```

### 手动部署

```bash
cd server
npm install
npm start
```

## 配置

环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务器端口 | `8080` |
| `ALLOWED_TOKENS` | 允许的访问令牌（逗号分隔） | 必需 |
| `PUBLIC_URL` | 公网访问地址 | `http://localhost:8080` |

### 示例

```bash
export PORT=8080
export ALLOWED_TOKENS=secret-token-1,secret-token-2
export PUBLIC_URL=https://tunnel.yourdomain.com
npm start
```

## 部署

### Docker Compose

编辑 `docker-compose.yml`：

```yaml
environment:
  - ALLOWED_TOKENS=your-secret-token-here
  - PUBLIC_URL=https://tunnel.yourdomain.com
```

启动服务：

```bash
docker-compose up -d
```

查看日志：

```bash
docker-compose logs -f
```

### Nginx 反向代理

配置文件示例 `/etc/nginx/sites-available/dsh-bridge`：

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

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/dsh-bridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d tunnel.yourdomain.com

# 自动续期已配置
```

## API

### 健康检查

```bash
GET /health

响应:
{
  "status": "ok",
  "uptime": 12345,
  "connections": 2
}
```

### WebSocket 连接

```
ws://localhost:8080?token=your-secret-token
wss://tunnel.yourdomain.com?token=your-secret-token
```

## 监控

### 查看日志

Docker：
```bash
docker-compose logs -f --tail=100
```

PM2：
```bash
pm2 logs dsh-bridge-server
```

Systemd：
```bash
sudo journalctl -u dsh-bridge -f
```

### 查看连接数

```bash
curl http://localhost:8080/health | jq .connections
```

### 监控资源使用

Docker：
```bash
docker stats dsh-bridge-server
```

系统：
```bash
# 内存使用
ps aux | grep node

# 网络连接
netstat -an | grep :8080 | wc -l
```

## 安全

### Token 管理

生成强随机 Token：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

推荐：
- Token 长度至少 64 字符
- 定期轮换（建议 90 天）
- 使用环境变量存储
- 不要提交到代码仓库

### 防火墙配置

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

### IP 白名单（可选）

在 Nginx 配置中：

```nginx
location / {
    # 只允许特定 IP 访问
    allow 192.168.1.0/24;
    allow 10.0.0.0/8;
    deny all;
    
    proxy_pass http://dsh_bridge;
}
```

## 性能优化

### Node.js 调优

```bash
# 增加内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Nginx 调优

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 4096;

http {
    keepalive_timeout 65;
    keepalive_requests 100;
}
```

### 系统限制

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536

# 重启后生效
ulimit -n 65536
```

## 故障排查

### 连接被拒绝

检查：
1. 服务是否运行：`docker ps` 或 `pm2 list`
2. 端口是否开放：`netstat -tulpn | grep 8080`
3. 防火墙规则：`sudo ufw status`

### Token 认证失败

检查：
1. Token 是否正确
2. `ALLOWED_TOKENS` 环境变量格式（逗号分隔，无空格）
3. 服务器日志中的错误信息

### WebSocket 升级失败

检查：
1. Nginx 配置包含 `Upgrade` 和 `Connection` 头
2. `proxy_http_version 1.1` 已设置
3. 查看 Nginx 错误日志

## 维护

### 更新服务器

Docker：
```bash
cd server
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

手动：
```bash
cd server
git pull
npm install
pm2 restart dsh-bridge-server
```

### 备份

```bash
# 备份配置
tar -czf backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  .env \
  /etc/nginx/sites-available/dsh-bridge
```

### 日志轮转

```bash
# /etc/logrotate.d/dsh-bridge
/var/log/dsh-bridge/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
}
```

## 架构

```
Internet
    ↓
[Nginx:443] → HTTPS/WSS
    ↓
[Server:8080] → WebSocket
    ↓
[Client] → Reverse Tunnel
    ↓
[DSH Instance:3080]
```

## 协议

### 连接流程

```
1. Client → Server: WebSocket 连接 + ?token=xxx
2. Server: 验证 Token
3. Server → Client: 接受连接或拒绝
4. 心跳保持活动（30 秒间隔）
```

### 请求转发

```
1. 外部请求 → Server
2. Server → Client: 通过 WebSocket 转发请求
3. Client → DSH: HTTP 请求
4. DSH → Client: HTTP 响应
5. Client → Server: 通过 WebSocket 返回响应
6. Server → 外部: 返回响应
```

## 资源

- [完整文档](../README.md)
- [部署指南](../DEPLOY.md)
- [使用手册](../USAGE.md)
- [GitHub 仓库](https://github.com/wenbin-wb/dsh-bridge)

## 许可证

MIT License - 详见 [LICENSE](../LICENSE)
