# Fix: 自建隧道 SSE 504 超时 & 会话列表不显示

## 问题现象

通过自建 WebSocket 隧道（`wss://` 中转服务器）远程访问 DSH 时，出现两个问题：

1. **`/plugins/events` SSE 端点返回 504 超时** — HMR 插件的 Server-Sent Events 连接永远不结束，隧道服务器超时后返回 504
2. **Web 侧边栏会话列表不显示** — 页面其他功能正常，唯独会话列表空白

## 根因分析

### 问题 1：SSE 504 超时

隧道协议将 HTTP 请求/响应封装为 WebSocket 消息：tunnel client 向本地 DSH 发起 HTTP 请求，**缓冲完整响应**后再通过 WebSocket 回传给 tunnel server，再由 tunnel server 转发给浏览器。

SSE（`text/event-stream`）响应是**永不结束**的流式连接 — 服务器持续推送事件，不调用 `res.end()`。原代码的 `res.on('end')` 回调永远不会触发，tunnel server 的超时（30s 非 API 路径 / 120s API 路径）到期后返回 504。

### 问题 2：会话列表不显示

DSH 的 `session.list` RPC 返回所有会话的完整投影数据。在会话数量较多时（233 个会话），响应体高达 **63MB**，其中：

| 字段 | 大小 | 占比 |
|------|------|------|
| `contextHeaders` | 57.4 MB | 92% |
| `contextTimeline` | 5.0 MB | 8% |
| 其他投影字段 | ~0.2 MB | <1% |

`contextHeaders` 包含每个会话的完整对话上下文头（系统提示、消息头等），侧边栏列表**完全不需要**这些数据 — 打开会话时通过 WebSocket 实时获取即可。

即使 gzip 压缩后仍有 13.5MB，通过 WebSocket 隧道传输需要 ~33s，超过 DSH 客户端的 `AbortSignal.timeout(30000)` 默认超时，导致请求被中止。

## 修复方案

### 修复 1：SSE 流式响应提前返回

### 修复 1：SSE 流式响应提前返回

在 `_handleHttpRequest()` 中检测 `text/event-stream` content-type，收集初始数据（2 个 chunk 或 500ms 超时）后立即返回响应，不等 `res.end()`：

```javascript
if (isSSE) {
  let sseSent = false;
  const sseTimer = setTimeout(() => { /* 发送已收集数据 */ }, 500);
  res.on('data', (c) => {
    if (sseSent) return;
    chunks.push(c);
    if (chunks.length >= 2) {
      clearTimeout(sseTimer);
      sseSent = true;
      // 立即发送已收集的初始数据
      this._sendMessage({ type: 'response', ... });
      res.destroy();
    }
  });
  // ... error/end 处理
  return;
}
```

### 修复 2：剥离 session.list 中的大字段

对 `/api/session.list` 的 200 响应，解析 JSON 并删除每个会话投影中的 `contextHeaders` 和 `contextTimeline`：

```javascript
if (path === '/api/session.list' && res.statusCode === 200) {
  try {
    const json = JSON.parse(bodyBuf.toString('utf8'));
    if (json?.result?.ok && json.result.value?.items) {
      for (const item of json.result.value.items) {
        const proj = item?.projections?.values;
        if (proj) {
          delete proj.contextHeaders;
          delete proj.contextTimeline;
        }
      }
      bodyBuf = Buffer.from(JSON.stringify(json), 'utf8');
    }
  } catch {}
}
```

### 修复 3：大响应 gzip 压缩

对超过 100KB 的可压缩响应（`text/*`、`application/json` 等）自动 gzip 压缩，设置 `content-encoding: gzip` 头：

```javascript
if (bodyBuf.length > GZIP_THRESHOLD && compressible && !alreadyEncoded) {
  bodyBuf = gzipSync(bodyBuf);
  respHeaders['content-encoding'] = 'gzip';
  respHeaders['content-length'] = String(bodyBuf.length);
}
```

### 修复 4：启用 WebSocket per-message 压缩

将隧道 WebSocket 的 `perMessageDeflate` 从 `false` 改为启用，进一步减少隧道传输量：

```javascript
this.ws = new WebSocket(url.toString(), {
  handshakeTimeout: 10000,
  perMessageDeflate: {
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    clientMaxWindowBits: 15,
    serverMaxWindowBits: 15,
  },
});
```

## 效果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| `session.list` 响应大小 | 63 MB | ~290 KB (剥离后) / 31 KB (gzip 后) |
| `session.list` 隧道传输时间 | 33s (超时) | 0.74s |
| `/plugins/events` SSE | 504 超时 | 正常返回初始数据 |
| 侧边栏会话列表 | 不显示 | 正常显示 |

## 影响范围

- **非隧道模式不受影响**：所有修改仅在 `_handleHttpRequest()` 中，只影响自建隧道的 HTTP 代理路径
- **WebSocket 透传不受影响**：`/api/events.mux` 和 `/api/events.host` 的 WebSocket 升级走独立的 `_handleWsOpen()` 路径，不受此修改影响
- **非 session.list 请求不受影响**：contextHeaders 剥离仅对 `/api/session.list` 路径生效
- **小响应不受影响**：gzip 压缩仅对超过 100KB 的可压缩响应生效
- **已有 content-encoding 的响应不受影响**：不重复压缩

## 测试验证

- ✅ 本地 WebSocket 直连 DSH（`/api/events.mux`）正常接收 `session/subscribed` 事件
- ✅ 通过隧道的 WebSocket（`wss://ds.missus.top/api/events.mux`）正常接收 26+ 条消息
- ✅ 通过隧道的 `session.list` 请求：31KB / 0.74s（修复前 63MB / 33s 超时）
- ✅ 响应包含 234 个会话，`contextHeaders` 和 `contextTimeline` 已剥离，`title` 等字段完整
- ✅ TLS 证书有效，gzip content-encoding 头正确传递
>>>>>>> pr-21
