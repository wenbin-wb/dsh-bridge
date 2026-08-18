# DSH Remote 配置示例

## 基础配置

```yaml
plugins:
  # Host 端
  dsh-remote:
    port: 3082
  
  # Client 端
  dsh-remote:client: {}
```

## 自建服务器配置

```yaml
plugins:
  dsh-remote:
    port: 3082
    serverUrl: wss://dsh.your-domain.com
    accessToken: your-generated-token
  
  dsh-remote:client: {}
```

## 环境变量配置

在 `~/.bashrc` 或 `~/.zshrc` 中:

```bash
# DSH Remote 配置
export DSH_REMOTE_SERVER=wss://dsh.your-domain.com
export DSH_REMOTE_TOKEN=your-generated-token
export DSH_REMOTE_PORT=3082
```

然后在 `cordis.yml` 中简化配置:

```yaml
plugins:
  dsh-remote: {}
  dsh-remote:client: {}
```

## 多用户配置

### 服务器端

```bash
# 生成多个 token
export ALLOWED_TOKENS=alice-token,bob-token,charlie-token
```

### 客户端

每个用户使用自己的 token:

```bash
# Alice
export DSH_REMOTE_TOKEN=alice-token

# Bob
export DSH_REMOTE_TOKEN=bob-token

# Charlie
export DSH_REMOTE_TOKEN=charlie-token
```

## 自定义代理端口

如果 3082 端口被占用:

```yaml
plugins:
  dsh-remote:
    port: 9000  # 使用其他端口
    serverUrl: wss://dsh.your-domain.com
    accessToken: your-token
  
  dsh-remote:client: {}
```

## 仅使用 Cloudflare 隧道

如果只需要 Cloudflare,不需要自建服务器:

```yaml
plugins:
  dsh-remote:
    port: 3082
    # 不设置 serverUrl 和 accessToken
  
  dsh-remote:client: {}
```

## 自定义 cloudflared 缓存目录

```yaml
plugins:
  dsh-remote:
    port: 3082
    home: /custom/path/.dsh-remote
  
  dsh-remote:client: {}
```

## 完整配置示例

```yaml
plugins:
  # Host 端 - 完整配置
  dsh-remote:
    # 本地代理端口
    port: 3082
    
    # 自建服务器 WebSocket 地址
    # 支持 ws:// (不加密) 和 wss:// (加密)
    # 生产环境强烈推荐使用 wss://
    serverUrl: wss://dsh.your-domain.com
    
    # 访问令牌
    # 使用 `dsh-remote generate-token` 生成
    accessToken: Kx7vYz9mN2pR8aWq3bTc4dUf5eVg6hXi
    
    # cloudflared 缓存目录
    # 默认: ~/.dsh-remote
    home: null
  
  # Client 端 - UI
  dsh-remote:client: {}
  
  # 其他插件...
```

## 安全配置建议

### 1. 使用环境变量存储敏感信息

❌ 不推荐:
```yaml
plugins:
  dsh-remote:
    accessToken: my-secret-token  # 明文存储
```

✅ 推荐:
```bash
# 环境变量
export DSH_REMOTE_TOKEN=my-secret-token
```

```yaml
plugins:
  dsh-remote: {}  # 自动读取环境变量
```

### 2. 使用强随机 token

```bash
# 生成强随机 token
dsh-remote generate-token

# 或使用 OpenSSL
openssl rand -base64 32
```

### 3. 生产环境使用 HTTPS/WSS

❌ 不推荐:
```yaml
serverUrl: ws://your-domain.com  # 明文传输
```

✅ 推荐:
```yaml
serverUrl: wss://your-domain.com  # 加密传输
```

### 4. 定期更换 token

```bash
# 生成新 token
NEW_TOKEN=$(dsh-remote generate-token | head -1)

# 更新服务器端
export ALLOWED_TOKENS=$NEW_TOKEN
docker restart dsh-remote-server

# 更新客户端
export DSH_REMOTE_TOKEN=$NEW_TOKEN
```

## 不同场景的推荐配置

### 个人开发者

```yaml
plugins:
  dsh-remote:
    port: 3082
    # 仅使用局域网和 Cloudflare
  dsh-remote:client: {}
```

### 小团队

```yaml
plugins:
  dsh-remote:
    port: 3082
    serverUrl: wss://dsh.team.com
    accessToken: team-shared-token
  dsh-remote:client: {}
```

### 企业部署

```yaml
plugins:
  dsh-remote:
    port: 3082
    serverUrl: wss://dsh.company.internal
    accessToken: ${DSH_REMOTE_TOKEN}  # 从环境变量读取
  dsh-remote:client: {}
```

配合:
- 独立服务器部署
- Nginx + SSL
- 防火墙限制
- 访问日志审计
- 速率限制

## 故障排查配置

### 启用详细日志

服务器端:

```bash
# systemd
sudo systemctl edit dsh-remote

# 添加
[Service]
Environment="LOG_LEVEL=debug"
```

客户端:

```bash
# 启动时添加 verbose 标志
dsh web --verbose
```

### 测试配置

```bash
# 测试服务器连接
wscat -c "wss://your-domain.com?token=your-token"

# 测试代理
curl http://localhost:3082

# 查看配置
cat ~/.dsh/cordis.yml
```

## 参考

- [完整使用指南](../USAGE.md)
- [服务器部署指南](../server/README.md)
- [GitHub 仓库](https://github.com/your-username/dsh-remote)
