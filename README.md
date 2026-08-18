# dsh-bridge

DSH 多通道远程访问插件，在设置页提供局域网、Cloudflare 隧道、自建隧道三种访问方式。

## 安装

```bash
dsh plugin --profile web add /path/to/dsh-remote
```

## 功能

- **局域网访问**：自动检测本机 IP，生成二维码，同网络设备直接扫码访问
- **Cloudflare 隧道**：一键获取公网地址（自动下载 cloudflared，重启后 URL 变化）
- **自建隧道**：WebSocket 反向隧道，连接自己部署的隧道服务器，获得固定域名
- **设置面板**：DSH 设置页「远程访问」，实时状态、二维码、安全提示、版本检查

## 配置

插件开箱即用，无需配置。自建隧道的服务器地址和令牌在设置页 UI 中填写，自动持久化到 `~/.dsh/dsh-bridge/config.json`。

可选 cordis.yml 配置（覆盖默认值）：

```yaml
- name: dsh-bridge
  config:
    port: 3082        # 代理端口，默认 3082
```

## 文件结构

```
lib/
  index.js              # Host 插件入口（代理、状态、RPC）
  bridge-rpc.js         # RPC 端点定义
  cloudflared-manager.mjs  # cloudflared 下载与生命周期管理
  tunnel-client.mjs     # 自建隧道 WebSocket 客户端
client/
  index.js              # 设置面板 React 组件（源码）
  build.mjs             # esbuild 构建脚本
  client.js             # 编译后的 bundle
```

## 开发

```bash
# 修改 client/index.js 后重新构建
node client/build.mjs

# 重新安装到 web profile
dsh plugin --profile web add .
```

## License

MIT
