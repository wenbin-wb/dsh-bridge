# Changelog

## 1.0.6

- **自建隧道：WebSocket 代理支持**（修复会话历史/实时事件通道）
  - 服务端拦截浏览器 WebSocket 升级请求（`/api/events.host`、`/api/events.mux` 等），通过控制通道通知 tunnel client
  - 客户端用裸 TCP 连本地 DSH 完成握手，双向帧转发
  - 修复通过隧道访问时会话历史不显示、页面像新安装一样的问题
- **服务端脚本：API 请求超时从 30s 提升到 120s**（修复历史消息多的对话加载失败）
- **服务端脚本：透传所有路径**（修复 Vite 绝对路径资源 404 / 页面空白）
- **服务端脚本：清理旧进程提前到端口检测之前**（防止重装时自动换端口导致云安全组不匹配）

## 1.0.5

- 修复隧道转发 socket hang up：转发 HTTP 请求/响应前过滤 hop-by-hop 头（`transfer-encoding`、`connection` 等），防止本地 DSH HTTP 解析器因 header 与实际 body 不匹配而断开连接
- 补充响应端 `res.on('error')` 兜底处理

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
