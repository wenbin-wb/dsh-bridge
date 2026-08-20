# QQ Bot 使用指南

本文档介绍如何接入 QQ Bot OpenAPI v2，实现私聊、群聊、Markdown、按钮交互和富媒体消息。

## 前置准备

### 1. 创建 QQ 机器人

访问 [QQ 开放平台](https://q.qq.com/) 创建机器人应用：

1. 登录并进入"机器人管理"
2. 点击"创建机器人"，填写基本信息
3. 创建完成后获取 **AppID** 和 **ClientSecret**（开发设置 → 开发信息）
4. 配置机器人权限：
   - 私域机器人：可接收私聊和群聊消息
   - 需要开通"发送消息"、"接收消息"等基础权限

### 2. 配置事件订阅

QQ Bot 使用 WebSocket 接收事件，需要配置 Intents（事件订阅）：

- **C2C_MESSAGE_CREATE**（私聊消息）：`1 << 25`
- **GROUP_AT_MESSAGE_CREATE**（群聊 @提及）：`1 << 30`
- **AT_MESSAGE_CREATE**（频道 @提及）：`1 << 30`

> dsh-bridge 默认已开启 C2C 和 GROUP_AT_MESSAGE_CREATE，无需额外配置。

## 快速开始

### 1. 启动 dsh-bridge

```bash
# 安装最新版本
npm install -g @wenbin_wb/dsh-bridge@latest

# 启动服务
dsh web
```

访问 `http://127.0.0.1:3080`，在平台选择器中选择"QQ"。

### 2. 配置 QQ Bot 凭证

在"未配置"区域填写：

- **AppID**：QQ 开放平台应用的 AppID
- **ClientSecret**：应用的 ClientSecret（密钥不会回传浏览器，留空表示沿用已保存密钥）

点击"保存并连接"，系统会自动：
1. 保存凭证到 `$DSH_HOME/dsh-bridge/config.json`
2. 获取 Access Token（自动刷新，TTL 7200s）
3. 连接 WebSocket Gateway
4. 开始接收消息事件

### 3. 配置白名单

保存凭证后，在"高级设置"中添加允许的用户/群组 ID：

- **私聊**：用户的 `user_openid`（形如 `11112222333344445555AAAAAAAAAAAA`）
- **群聊**：群组的 `group_openid`（形如 `1A2B3C4D5E6F7890ABCDEFABCDEFABCD`）

> **如何获取 OpenID**：
> 1. 先不设置白名单，用户/群组发送消息后查看日志
> 2. 日志中会显示"未在白名单中，已忽略"，复制其中的 OpenID
> 3. 将 OpenID 添加到白名单并保存

### 4. 开始对话

白名单用户/群组向机器人发送消息后：

- **私聊**：直接发送消息即可
- **群聊**：需要 @机器人 才会触发（`GROUP_AT_MESSAGE_CREATE` 事件）

机器人会自动创建会话，转发消息到 DSH Agent 并回复。

## 功能特性

### 支持的消息类型

| 类型 | 方法 | 说明 |
|------|------|------|
| 文本消息 | `sendText(scope, text)` | 纯文本消息 |
| Markdown | `sendMarkdown(scope, markdown, keyboard)` | 支持 Markdown 格式 + 可选按钮 |
| 按钮键盘 | `sendKeyboard(scope, text, keyboard)` | 文本 + 按钮组（行内按钮） |
| 富媒体 | `sendMedia(scope, type, buffer, filename)` | 图片/视频/音频/文件上传 |

### Markdown 示例

```javascript
await gateway.sendMarkdown(
  'u_11112222333344445555AAAAAAAAAAAA',  // user_openid
  '# 标题\n**粗体** *斜体* `代码`\n[链接](https://example.com)',
  {
    content: {
      rows: [
        {
          buttons: [
            { id: '1', render_data: { label: '选项 A', style: 1 }, action: { type: 2, data: '/cmd_a' } },
            { id: '2', render_data: { label: '选项 B', style: 0 }, action: { type: 2, data: '/cmd_b' } }
          ]
        }
      ]
    }
  }
)
```

### 按钮交互

按钮类型（`action.type`）：
- `0` — 跳转按钮（`action.data` 为 URL）
- `1` — 回调按钮（触发 `INTERACTION_CREATE` 事件，需额外订阅）
- `2` — 指令按钮（用户点击后自动发送 `action.data` 作为消息）

按钮样式（`render_data.style`）：
- `0` — 灰色（次要操作）
- `1` — 蓝色（主要操作）

### 富媒体上传

```javascript
// 发送图片
const imageBuffer = fs.readFileSync('image.png')
await gateway.sendMedia(
  'g_1A2B3C4D5E6F7890ABCDEFABCDEFABCD',  // group_openid
  'image',  // image | video | audio | file
  imageBuffer,
  'screenshot.png'
)
```

支持的媒体类型：
- `image` — 图片（PNG/JPG/GIF，< 10MB）
- `video` — 视频（MP4，< 50MB）
- `audio` — 音频（MP3/WAV，< 10MB）
- `file` — 文件（任意类型，< 20MB）

## 高级配置

### 会话管理

在 UI 的"高级设置"中配置：

- **摘要间隔**（`digestIntervalSec`，默认 300s）：多久向 Agent 发送一次历史消息摘要
- **审批超时**（`approvalTimeoutSec`，默认 600s）：等待用户审批的最长时间
- **单条消息字符数**（`maxMessageChars`，默认 2000）：超长消息会自动分段
- **分段延迟**（`sendChunkDelayMs`，默认 1500ms）：分段消息之间的延迟

### Token 自动刷新

Access Token 有效期为 7200 秒（2 小时），dsh-bridge 会在过期前 5 分钟自动刷新，无需手动处理。

### 消息去重

WebSocket 可能收到重复消息（如网络抖动、重连），Gateway 使用 `msg_id` 去重（TTL 300s），确保同一消息不会被处理多次。

### 断线重连

Gateway 实现指数退避重连策略：
- 初始延迟：1s
- 最大延迟：60s
- 每次失败后延迟翻倍（1s → 2s → 4s → 8s → ...）
- 心跳超时（40s 未收到 `HEARTBEAT_ACK`）自动重连

## 故障排查

### 1. 连接失败

**症状**：UI 显示"未配置"或"已停止"

**排查**：
1. 检查 AppID 和 ClientSecret 是否正确
2. 查看浏览器控制台 Network 面板，检查 `platformLogin` 请求是否返回错误
3. 检查 DSH 终端日志，搜索"QQ"关键词

### 2. 收不到消息

**症状**：用户发送消息后机器人无响应

**排查**：
1. 确认用户/群组 OpenID 已添加到白名单
2. 群聊消息需要 @机器人 才会触发
3. 检查机器人权限是否开通"接收消息"
4. 查看 DSH 终端日志，确认是否收到 `C2C_MESSAGE_CREATE` 或 `GROUP_AT_MESSAGE_CREATE` 事件

### 3. 发送消息失败

**症状**：DSH Agent 回复后，QQ 不显示消息

**排查**：
1. 检查机器人权限是否开通"发送消息"
2. 查看终端日志中的 API 请求错误（状态码、错误信息）
3. 确认消息内容符合 QQ 限制（文本 < 4096 字符，媒体文件大小限制）

### 4. Token 过期

**症状**：运行一段时间后突然无法发送消息

**排查**：
1. 正常情况下 Token 会自动刷新，如果频繁过期可能是 ClientSecret 错误
2. 检查终端日志中的"刷新 Access Token"记录
3. 手动重新保存凭证触发立即刷新

## 参考资料

- [QQ Bot API v2 官方文档](https://bot.q.qq.com/wiki/develop/api-v2/)
- [获取访问凭证](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/access-token.html)
- [WebSocket 事件](https://bot.q.qq.com/wiki/develop/api-v2/dev-prepare/event-emit/websocket.html)
- [消息收发](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/overview.html)
- [Markdown 消息](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/type/markdown.html)
- [消息按钮](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html)
- [富媒体消息](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html)

## 示例项目

完整示例代码见仓库：
- Gateway 实现：`lib/qq/gateway.js`
- Platform 适配器：`lib/qq/index.js`
- ConversationBridge 适配：`lib/qq/node.js`
- 单元测试：`test/qq-service.test.mjs`
