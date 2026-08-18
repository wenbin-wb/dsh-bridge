# Changelog

## 1.0.0

- 局域网代理（自动启动，自动检测 IP，生成二维码）
- Cloudflare 隧道（自动下载 cloudflared，非阻塞启动，中文进度提示）
- 自建 WebSocket 隧道（Token 认证，状态回调）
- DSH 设置页「远程访问」面板
  - 三种通道卡片，实时状态轮询（3秒）
  - URL 复制、二维码默认展开、安全警告
  - Cloudflare 隧道重置链接按钮
  - 自建隧道服务器配置表单（UI 持久化到 JSON 文件）
  - 自建隧道搭建教程折叠面板
  - 版本检查功能
- 配置持久化：`~/.dsh/dsh-bridge/config.json`
- Loopback-only RPC（`/dsh-bridge` 频道）
- 代理正确转发 Host/Origin 头 + crypto.randomUUID polyfill
