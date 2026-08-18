# 快速开始 | Quick Start

## 安装 | Installation

```bash
# 进入你的 DSH 项目目录
cd /path/to/your/dsh

# 安装插件
npm install dsh-bridge

# 或使用 pnpm
pnpm add dsh-bridge
```

## 配置 | Configuration

### 方式 1: 修改 cordis.yml

```yaml
plugins:
  # 其他插件...
  
  dsh-bridge:
    proxy:
      port: 3082  # 可选,默认 3082
    customTunnel:
      serverUrl: wss://tunnel.yourdomain.com  # 可选
      accessToken: your-secret-token-here      # 可选
```

### 方式 2: 使用环境变量

```bash
# Linux/macOS
export DSH_BRIDGE_SERVER=wss://tunnel.yourdomain.com
export DSH_BRIDGE_TOKEN=your-secret-token

# Windows PowerShell
$env:DSH_BRIDGE_SERVER="wss://tunnel.yourdomain.com"
$env:DSH_BRIDGE_TOKEN="your-secret-token"
```

## 使用 | Usage

### 1. 启动 DSH

```bash
dsh
```

### 2. 打开 Web 界面

浏览器访问: http://localhost:3080

### 3. 进入设置

点击导航栏的 **Settings** → **DSH Bridge**

### 4. 选择访问方式

#### 🏠 局域网访问 (推荐首选)
- 无需配置,自动检测
- 扫描二维码即可访问
- 适合: 同一 Wi-Fi 下的手机、平板

#### ☁️ Cloudflare 隧道 (快速公网)
- 点击"启动"按钮
- 首次使用会自动下载 cloudflared (~20MB)
- 获得公网地址,扫码或复制链接访问
- 适合: 快速分享、临时演示

#### 🔧 自建服务器 (生产环境)
- 需要先配置服务器地址和 Token
- 固定域名,长期使用
- 适合: 团队协作、生产部署

## 自建服务器部署 | Custom Server Setup

### 使用 Docker (推荐)

```bash
# 克隆仓库
git clone https://github.com/wenbin-wb/dsh-bridge.git
cd dsh-bridge/server

# 编辑配置
nano docker-compose.yml

# 修改以下内容:
# ALLOWED_TOKENS=token1,token2,token3
# PUBLIC_URL=https://tunnel.yourdomain.com

# 启动服务器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 生成安全 Token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name tunnel.yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 常见问题 | FAQ

### Q: 局域网访问无法连接?

**A**: 检查以下几点:
1. 确保防火墙允许端口 3082
2. 设备在同一 Wi-Fi 网络
3. 尝试手动输入 IP:端口

### Q: Cloudflare 启动失败?

**A**: 
1. 检查网络连接
2. 确保有足够磁盘空间 (~20MB)
3. 查看浏览器控制台错误信息

### Q: 自建服务器连接不上?

**A**:
1. 确认服务器 URL 和 Token 正确
2. 检查服务器是否运行: `curl https://your-server.com/health`
3. 查看服务器日志: `docker-compose logs -f`
4. 确认防火墙允许 WebSocket 连接

### Q: URL 每次重启都变化?

**A**: 
- Cloudflare 隧道的 URL 每次启动都会变
- 如需固定 URL,请使用自建服务器

### Q: 如何停止隧道?

**A**: 在设置页面点击对应的"停止"按钮

## 最佳实践 | Best Practices

### 开发环境
- 使用**局域网访问**或 **Cloudflare**
- 快速、简单、零配置

### 生产环境
- 使用**自建服务器**
- 配置 HTTPS/SSL
- 使用强 Token (64 字符)
- 定期更换 Token
- 配置防火墙规则

### 安全建议
1. 生产环境必须使用 HTTPS
2. Token 存储在环境变量,不要写在代码里
3. 定期检查服务器日志
4. 使用复杂的随机 Token
5. 考虑添加 IP 白名单

## 性能优化 | Performance

- **QR 码缓存**: 30 分钟 TTL,最多 50 个
- **活动连接监控**: 实时追踪连接数
- **自动重连**: 指数退避,最多 5 次
- **心跳检测**: 30 秒一次
- **优雅关闭**: 清理所有资源

## 更多帮助 | More Help

- 📖 [完整文档](https://github.com/wenbin-wb/dsh-bridge#readme)
- 📚 [部署指南](https://github.com/wenbin-wb/dsh-bridge/blob/main/server/README.md)
- 🐛 [问题反馈](https://github.com/wenbin-wb/dsh-bridge/issues)
- 💬 [讨论区](https://github.com/wenbin-wb/dsh-bridge/discussions)

---

🎉 享受 DSH Bridge 带来的便利!
