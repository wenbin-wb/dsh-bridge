# DSH Remote 使用指南

完整的使用文档,包括安装、配置、使用和最佳实践。

## 📋 目录

- [快速开始](#快速开始)
- [安装](#安装)
- [配置](#配置)
- [使用](#使用)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [故障排查](#故障排查)

## 🚀 快速开始

### 5 分钟快速体验

```bash
# 1. 安装插件
npm install dsh-remote

# 2. 配置 DSH (在 cordis.yml 中添加)
cat >> ~/.dsh/cordis.yml << 'EOF'
plugins:
  dsh-remote: {}
  dsh-remote:client: {}
EOF

# 3. 启动 DSH
dsh web

# 4. 打开浏览器
# http://localhost:3080

# 5. 进入设置 -> DSH Remote
# 点击"启动 Cloudflare 隧道"获取公网地址
```

就这么简单! 🎉

## 📦 安装

### 方式一: npm (推荐)

```bash
npm install dsh-remote
```

### 方式二: 从源码

```bash
# 克隆仓库
git clone https://github.com/your-username/dsh-remote.git
cd dsh-remote

# 安装依赖
npm install

# 链接到全局
npm link

# 在 DSH 项目中链接
cd /path/to/your/dsh
npm link dsh-remote
```

### 验证安装

```bash
# 检查命令行工具
dsh-remote help

# 生成测试 token
dsh-remote generate-token
```

## ⚙️ 配置

### 基础配置

最小化配置,只使用局域网和 Cloudflare:

```yaml
# ~/.dsh/cordis.yml
plugins:
  dsh-remote: {}
  dsh-remote:client: {}
```

### 完整配置

包含自建服务器:

```yaml
plugins:
  dsh-remote:
    # 本地代理端口
    port: 3082
    
    # 自建服务器配置
    serverUrl: wss://dsh.your-domain.com
    accessToken: your-generated-token
    
    # cloudflared 缓存目录 (可选)
    home: ~/.dsh-remote
  
  dsh-remote:client: {}
```

### 环境变量配置

```bash
# ~/.bashrc 或 ~/.zshrc
export DSH_REMOTE_SERVER=wss://dsh.your-domain.com
export DSH_REMOTE_TOKEN=your-generated-token
export DSH_REMOTE_PORT=3082
```

然后简化 cordis.yml:

```yaml
plugins:
  dsh-remote: {}
  dsh-remote:client: {}
```

### 生成访问令牌

```bash
# 使用内置工具
dsh-remote generate-token

# 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# 使用 OpenSSL
openssl rand -base64 32
```

## 📱 使用

### 局域网访问

**适用场景**: 家庭/办公室同一 Wi-Fi 网络

1. 启动 DSH
2. 打开设置 -> DSH Remote
3. 查看"局域网访问"部分
4. 手机扫描二维码或直接访问 URL

**优点**:
- ✅ 最快的访问速度
- ✅ 最安全 (不暴露到公网)
- ✅ 无需配置

**限制**:
- ❌ 只能在同一网络下访问
- ❌ 公司网络可能有防火墙限制

### Cloudflare 隧道

**适用场景**: 临时公网访问、快速分享

1. 打开设置 -> DSH Remote
2. 找到"Cloudflare 隧道"部分
3. 点击"启动隧道"
4. 等待 10-30 秒获取公网 URL
5. 分享 URL 给他人或在其他设备访问

**优点**:
- ✅ 无需服务器
- ✅ 一键启动
- ✅ 自动 HTTPS
- ✅ 免费使用

**限制**:
- ❌ URL 每次启动会变化
- ❌ 速度可能较慢 (取决于 Cloudflare 节点)
- ❌ 依赖 Cloudflare 服务

**使用技巧**:

```bash
# 查看 cloudflared 版本
~/.dsh-remote/cloudflared --version

# 手动测试
~/.dsh-remote/cloudflared tunnel --url http://localhost:3080

# 清理缓存
rm -rf ~/.dsh-remote/
```

### 自建服务器隧道

**适用场景**: 长期使用、固定域名、高速访问

#### 第一步: 部署服务器

参考 [服务器部署指南](./server/README.md)

#### 第二步: 配置客户端

```bash
# 生成 token
dsh-remote generate-token

# 设置环境变量
export DSH_REMOTE_SERVER=wss://dsh.your-domain.com
export DSH_REMOTE_TOKEN=your-generated-token
```

或在 cordis.yml 中:

```yaml
plugins:
  dsh-remote:
    serverUrl: wss://dsh.your-domain.com
    accessToken: your-generated-token
```

#### 第三步: 启动隧道

1. 打开设置 -> DSH Remote
2. 找到"自建服务器隧道"部分
3. 确认配置正确 (绿色 ✓)
4. 点击"启动隧道"
5. 等待连接成功
6. 复制公网 URL

**优点**:
- ✅ 固定域名
- ✅ 最快的速度
- ✅ 完全掌控
- ✅ 支持多用户

**限制**:
- ❌ 需要自己的服务器
- ❌ 需要配置和维护

### 多设备使用

#### 场景 1: 手机访问桌面 DSH

```
1. 桌面启动 DSH
2. 选择访问方式:
   - 同一 Wi-Fi: 扫描局域网二维码
   - 不同网络: 启动 Cloudflare 或自建隧道
3. 手机浏览器打开 URL
```

#### 场景 2: 平板访问

```
1. 使用局域网访问最流畅
2. 或使用自建服务器固定域名
3. 建议添加书签方便访问
```

#### 场景 3: 远程办公

```
1. 使用自建服务器
2. 配置 VPN (可选)
3. 设置访问控制
```

## 🎯 最佳实践

### 安全实践

#### 1. 使用强随机 token

```bash
# ❌ 弱 token
export DSH_REMOTE_TOKEN=123456

# ✅ 强 token
export DSH_REMOTE_TOKEN=$(dsh-remote generate-token)
```

#### 2. 使用 HTTPS/WSS

```bash
# ❌ 不加密
export DSH_REMOTE_SERVER=ws://dsh.your-domain.com

# ✅ 加密传输
export DSH_REMOTE_SERVER=wss://dsh.your-domain.com
```

#### 3. 不分享包含 token 的 URL

```bash
# ❌ 错误做法
https://dsh.your-domain.com/abc123?token=your-secret-token

# ✅ 正确做法
# Token 应该在 WebSocket 握手时发送,而不是在 HTTP URL 中
```

#### 4. 定期更换 token

```bash
#!/bin/bash
# rotate-token.sh

# 生成新 token
NEW_TOKEN=$(dsh-remote generate-token | head -1)

# 更新服务器
ssh your-server "echo ALLOWED_TOKENS=$NEW_TOKEN > /opt/dsh-remote/.env && systemctl restart dsh-remote"

# 更新本地配置
echo "export DSH_REMOTE_TOKEN=$NEW_TOKEN" >> ~/.bashrc
source ~/.bashrc

echo "Token 已更换: $NEW_TOKEN"
```

### 性能优化

#### 1. 选择合适的访问方式

```
局域网 > 自建服务器 > Cloudflare
(速度从快到慢)
```

#### 2. 使用地理位置接近的服务器

```bash
# 如果在中国,使用中国服务器
export DSH_REMOTE_SERVER=wss://dsh.cn.your-domain.com

# 如果在美国,使用美国服务器
export DSH_REMOTE_SERVER=wss://dsh.us.your-domain.com
```

#### 3. 启用压缩 (服务器端)

```nginx
# Nginx 配置
location / {
    proxy_pass http://127.0.0.1:8080;
    
    # 启用压缩
    gzip on;
    gzip_types text/plain application/json;
}
```

### 多用户管理

#### 服务器端配置

```bash
# 为不同用户生成不同的 token
ALICE_TOKEN=$(dsh-remote generate-token)
BOB_TOKEN=$(dsh-remote generate-token)
CHARLIE_TOKEN=$(dsh-remote generate-token)

# 配置服务器
export ALLOWED_TOKENS="$ALICE_TOKEN,$BOB_TOKEN,$CHARLIE_TOKEN"
```

#### 分发 token

```bash
# Alice
echo "你的访问令牌: $ALICE_TOKEN" | mail alice@example.com

# Bob
echo "你的访问令牌: $BOB_TOKEN" | mail bob@example.com

# Charlie
echo "你的访问令牌: $CHARLIE_TOKEN" | mail charlie@example.com
```

#### 撤销访问

```bash
# 从 ALLOWED_TOKENS 中移除对应的 token
export ALLOWED_TOKENS="$ALICE_TOKEN,$BOB_TOKEN"  # 移除了 CHARLIE_TOKEN
systemctl restart dsh-remote
```

## ❓ 常见问题

### Q1: 如何选择访问方式?

**A**: 根据场景选择:

- **同一 Wi-Fi**: 使用局域网 (最快)
- **临时分享**: 使用 Cloudflare (最方便)
- **长期使用**: 使用自建服务器 (最稳定)

### Q2: Cloudflare 隧道很慢怎么办?

**A**: 
1. 检查本地网络速度
2. 尝试重启隧道 (可能分配到更近的节点)
3. 考虑使用自建服务器

### Q3: 自建服务器需要多少成本?

**A**: 
- 最低: $5/月 (VPS)
- 推荐: $10-20/月 (更好的性能)
- 域名: $10/年

### Q4: 支持哪些平台?

**A**: 
- **服务端**: Windows, macOS, Linux
- **客户端**: 任何支持现代浏览器的设备

### Q5: 可以同时使用多种方式吗?

**A**: 可以! 三种方式可以同时启用:
- 局域网: 自动可用
- Cloudflare: 按需启动
- 自建服务器: 按需启动

### Q6: Token 泄露了怎么办?

**A**: 
1. 立即生成新 token
2. 更新服务器配置
3. 重启服务器
4. 检查访问日志

### Q7: 如何限制访问来源?

**A**: 在服务器端使用防火墙:

```bash
# 只允许特定 IP
sudo ufw allow from 1.2.3.4 to any port 8080

# 或在 Nginx 中配置
location / {
    allow 1.2.3.4;
    deny all;
}
```

## 🔧 故障排查

### 问题 1: 局域网地址无法访问

**症状**: 手机无法访问局域网 URL

**解决方案**:
```bash
# 1. 检查是否在同一 Wi-Fi
ip addr show  # Linux
ipconfig      # Windows

# 2. 检查防火墙
sudo ufw status
sudo ufw allow 3082

# 3. 测试端口
nc -zv 192.168.1.100 3082
```

### 问题 2: Cloudflare 隧道启动失败

**症状**: 点击启动后一直显示"启动中"

**解决方案**:
```bash
# 1. 检查 cloudflared 是否下载成功
ls -la ~/.dsh-remote/

# 2. 手动测试
~/.dsh-remote/cloudflared tunnel --url http://localhost:3080

# 3. 查看日志
# 在 DSH 终端中查看错误信息

# 4. 重新下载
rm -rf ~/.dsh-remote/
# 然后重新启动隧道
```

### 问题 3: 自建服务器连接失败

**症状**: "连接服务器失败" 错误

**解决方案**:
```bash
# 1. 测试服务器是否运行
curl https://dsh.your-domain.com/health

# 2. 测试 WebSocket 连接
wscat -c wss://dsh.your-domain.com?token=your-token

# 3. 检查 token 是否正确
echo $DSH_REMOTE_TOKEN

# 4. 查看服务器日志
sudo journalctl -u dsh-remote -f
```

### 问题 4: Token 认证失败

**症状**: "Invalid token" 错误

**解决方案**:
```bash
# 1. 确认客户端 token
echo $DSH_REMOTE_TOKEN

# 2. 确认服务器端配置
ssh your-server "cat /opt/dsh-remote/.env"

# 3. 确保 token 完全匹配
# 注意空格、换行等

# 4. 重新生成并配置
dsh-remote generate-token
```

### 获取帮助

如果以上方法都无法解决:

1. 查看详细日志
2. 提交 Issue: https://github.com/your-username/dsh-remote/issues
3. 包含以下信息:
   - 操作系统和版本
   - Node.js 版本
   - DSH 版本
   - 错误信息
   - 相关日志

---

更多信息请查看:
- [README](./README.md) - 项目概览
- [服务器部署指南](./server/README.md) - 服务器端详细配置
- [配置示例](./examples/config.md) - 更多配置示例
