# 自建隧道服务器搭建教程

dsh-bridge 的「自建隧道」功能需要一台有公网 IP 的服务器来中转流量。本教程提供一键部署脚本，执行完成后直接复制输出的配置信息填入 dsh-bridge 即可。

## 前置条件

- 一台运行 Linux 的公网服务器（VPS、云主机均可，国内外皆可）
- 服务器有 root 权限
- Node.js 18+ 会**自动安装**，无需手动准备

---

## 一键部署（推荐）

在服务器上以 root 身份执行以下命令：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)
```

脚本会自动完成：

- 检测并安装 Node.js 22 LTS
- 自动获取服务器公网 IP，自动选择可用端口
- 随机生成 16 位访问路径 + 32 位连接令牌（双重保护）
- 部署隧道服务端到 `/opt/dsh-tunnel`
- 注册 systemd 服务并设为开机自启
- 放行防火墙端口（支持 ufw / firewalld）
- 验证服务是否正常运行

执行完成后，终端会打印如下信息：

```
  ┌──────────────────────────────────────────────────────────────┐
  │  DSH 设置  →  远程访问  →  自建隧道                          │
  ├──────────────────────────────────────────────────────────────┤
  │  WebSocket 地址                                              │
  │  ws://YOUR_IP:3000/connect                                   │
  │                                                              │
  │  访问令牌                                                    │
  │  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                            │
  └──────────────────────────────────────────────────────────────┘

  连接成功后，dsh-bridge 会显示以下公网访问地址：
  http://YOUR_IP:3000/a7f2k9m3x1b4c8d2

  安全说明：该地址含随机路径（/a7f2k9m3x1b4c8d2），不知道路径无法访问。
            端口扫描只能看到 404，不会暴露 DSH 的存在。
```

将 WebSocket 地址和访问令牌复制到 DSH 设置页「远程访问 → 自建隧道」，保存后点「开启」即可。

### 安全设计说明

脚本部署的服务端采用**双重保护**机制：

| 层 | 机制 | 说明 |
|----|------|------|
| WebSocket 连接层 | 连接令牌（TOKEN） | dsh-bridge 连接服务端时验证，防止他人建立隧道连接 |
| HTTP 访问层 | 随机路径前缀 | 所有不含该路径的请求返回 404，端口扫描看不出服务存在 |

最终对外的公网地址形如 `http://IP:PORT/a7f2k9m3x1b4c8d2`，路径本身即是密钥——不知道完整地址就无法访问你的 DSH。

### 自定义参数（可选）

如需自定义端口、令牌或指定域名，可通过环境变量传入：

```bash
# 自定义端口
PORT=8080 bash <(curl -fsSL ...)

# 自定义令牌
TOKEN=my-secret-token bash <(curl -fsSL ...)

# 有域名时指定（会自动使用 wss:// 安全连接）
DOMAIN=tunnel.example.com bash <(curl -fsSL ...)
```

### 日常管理

```bash
# 查看服务状态
systemctl status dsh-tunnel

# 查看实时日志
journalctl -u dsh-tunnel -f

# 重启服务
systemctl restart dsh-tunnel

# 修改配置后重启
nano /opt/dsh-tunnel/.env
systemctl restart dsh-tunnel
```

---

## 启用 HTTPS / WSS（可选，有域名时推荐）

默认部署使用 HTTP，如果你有域名并配置了 SSL 证书，可以通过 Nginx 反向代理启用 HTTPS，连接更安全稳定。

### 安装 Nginx 和 Certbot

```bash
# Debian/Ubuntu
apt-get install -y nginx certbot python3-certbot-nginx

# CentOS/Rocky
dnf install -y nginx certbot python3-certbot-nginx
```

### 申请证书并配置 Nginx

```bash
# 申请免费 Let's Encrypt 证书
certbot --nginx -d tunnel.example.com
```

Nginx 配置 `/etc/nginx/sites-available/dsh-tunnel`（Debian 系）：

```nginx
server {
    listen 443 ssl;
    server_name tunnel.example.com;

    ssl_certificate     /etc/letsencrypt/live/tunnel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tunnel.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
    }
}

server {
    listen 80;
    server_name tunnel.example.com;
    return 301 https://$host$request_uri;
}
```

启用并重启 Nginx：

```bash
ln -s /etc/nginx/sites-available/dsh-tunnel /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

配置完成后，修改 `/opt/dsh-tunnel/.env`：

```
PUBLIC_URL=https://tunnel.example.com
```

重启服务并更新 dsh-bridge 中的地址为 `wss://tunnel.example.com/connect`：

```bash
systemctl restart dsh-tunnel
```

---

## 工作原理

```
手机/外网设备
    │  HTTPS 请求
    ▼
隧道服务端（你的公网服务器）
    │  WebSocket 实时转发
    ▼
dsh-bridge（你的本地电脑，主动发起连接）
    │  HTTP 本地转发
    ▼
DSH（127.0.0.1:3080）
```

本地电脑主动连接到服务端，**本地无需开放任何端口**，防火墙不需要特殊配置。

---

## 常见问题

**连接超时 / 无法连接**

1. 检查服务器**云控制台安全组**是否放行了端口（默认 3000）——云主机有两层防火墙：云安全组（控制台配置）和系统防火墙（ufw/firewalld），两层都要放行
2. 确认服务正在运行：`systemctl status dsh-tunnel`
3. 验证健康检查（在服务器本机执行）：`curl http://127.0.0.1:3000/healthz`，应返回 `{"ok":true,...}`
4. 外网访问 `healthz` 返回 404 是正常的（安全设计，防止探测）

**历史记录加载失败 / 提示 "The user aborted a request."**

历史消息较多时，API 响应时间较长。请确保服务端版本 ≥ 1.0.6（脚本已将 API 请求超时提升至 120s）。重新运行安装脚本即可更新：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)
```

**重装后端口变了，安全组不匹配**

插件会自动保留已有配置（令牌/端口/路径不变）。若出现端口变化，通常是上次重装时旧进程仍在占用端口导致自动选了新端口。脚本 1.0.6 起已修复：清理旧进程提前到端口检测之前，重装时始终复用原端口。

WebSocket 长连接需要较长的超时配置。如果使用 Nginx，确保 `proxy_read_timeout` 设为 `3600s`。

**页面加载缓慢**

自建隧道的速度取决于服务器带宽和网络延迟。国内用户建议选择国内云服务器节点。

**重新部署 / 更新**

重新执行一键部署命令即可，会覆盖旧版本并保留配置文件：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wenbin-wb/dsh-bridge/main/scripts/install-tunnel-server.sh)
```
