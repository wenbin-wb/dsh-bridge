# QQ Bot 使用指南

本文档介绍如何接入 QQ Bot OpenAPI v2，实现私聊、群聊、流式输出、按钮交互、消息引用和富媒体消息。

## ✨ v2.1.1 新特性

- **🚀 流式消息输出**：长文本自动分段推送（200字符/段），实时看到 AI 输出
- **💬 消息引用交互**：直接回复机器人消息即可继续对话，无需输入命令
- **🔘 按钮快捷操作**：无活动会话时自动显示快捷按钮（新建会话/列表/帮助）
- **⚡ 互动事件支持**：按钮点击自动映射到对应命令

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
- **INTERACTION_CREATE**（互动事件）：`1 << 26`

> dsh-bridge 默认已开启以上三个 intents，支持私聊、群聊和按钮交互，无需额外配置。

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

#### 私聊场景

1. 在 QQ 中搜索并添加你的机器人为好友
2. 发送任意消息，机器人会回复带按钮的欢迎提示：
   - 🆕 **新建会话**：创建新的 AI 对话
   - 📋 **会话列表**：查看所有可用会话
   - ❓ **帮助**：显示命令帮助
3. 点击「新建会话」按钮开始对话
4. 或者直接回复机器人的任何消息，自动创建新会话并继续对话

#### 群聊场景

1. 将机器人拉入 QQ 群
2. 在群内 @机器人 并发送消息（例如：`@机器人 你好`）
3. 机器人会响应并提供快捷按钮
4. 后续可以：
   - 点击按钮快捷操作
   - 回复机器人的消息继续对话
   - @机器人 发送新消息

### 5. 流式输出体验

当 AI 回复较长内容时，dsh-bridge 会自动分段流式推送：

- **分段大小**：200 字符/段
- **推送间隔**：100ms
- **消息关联**：所有段落通过 `msg_id` 关联
- **用户体验**：实时看到输出，无需等待完整响应

## 功能特性

### 交互方式

#### 1. 快捷按钮（推荐）

当没有活动会话时，机器人会自动发送带按钮的提示：

- **🆕 新建会话**：点击后立即创建新的 AI 对话
- **📋 会话列表**：查看所有可用会话及其编号
- **❓ 帮助**：显示所有可用命令

按钮点击会触发 `INTERACTION_CREATE` 事件，自动映射到对应命令。

#### 2. 消息引用（最便捷）

直接回复机器人的任何消息，自动关联到对应会话：

1. 机器人发送回复
2. 你使用 QQ 的"引用回复"功能回复该消息
3. 如果没有活动会话，自动创建新会话
4. 你的消息会发送到 AI，无需输入 `/new` 等命令

> **提示**：这是最自然的交互方式，就像正常聊天一样。

#### 3. 文本命令（兼容性）

所有操作都支持传统文本命令：

- `/new` - 新建会话
- `/list` - 列出所有会话
- `/resume <number>` - 恢复指定会话
- `/forget` - 清空当前会话历史
- `/help` - 显示帮助

### 支持的消息类型

| 类型 | 方法 | 说明 |
|------|------|------|
| 文本消息 | `sendText(scope, text)` | 纯文本消息 |
| 流式消息 | `sendStream(scope, text, opts)` | 长文本自动分段推送（200字符/段） |
| Markdown | `sendMarkdown(scope, markdown, keyboard)` | 支持 Markdown 格式 + 可选按钮 |
| 按钮键盘 | `sendKeyboard(scope, text, keyboard)` | 文本 + 按钮组（行内按钮） |
| 富媒体 | `sendMedia(scope, type, buffer, filename)` | 图片/视频/音频/文件上传 |

### 流式消息示例

```javascript
// 发送长文本，自动分段推送
await gateway.sendStream(
  'u_11112222333344445555AAAAAAAAAAAA',  // user_openid
  '这是一段很长的 AI 回复内容...',
  { msgId: 'parent_msg_id' }  // 可选：关联到某条消息
)
// 自动分段为 200 字符/段，每段间隔 100ms
```

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
- `1` — 回调按钮（触发 `INTERACTION_CREATE` 事件）
- `2` — 指令按钮（用户点击后自动发送 `action.data` 作为消息）

按钮样式（`render_data.style`）：
- `0` — 灰色（次要操作）
- `1` — 蓝色（主要操作）

> **v2.1.1 改进**：dsh-bridge 已启用 `INTERACTION_CREATE` intent，按钮点击会自动映射到对应命令（如 `/new`、`/list`、`/help`），无需用户手动输入。

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
- **单条消息字符数**（`maxMessageChars`，默认 4096）：QQ API 单条消息限制
- **流式分段大小**（固定 200 字符）：长文本自动分段推送的每段大小
- **分段延迟**（固定 100ms）：流式消息每段之间的延迟

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
- [流式消息](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/passive.html#%E6%B6%88%E6%81%AF%E6%B5%81%E5%BC%8F%E6%8E%A8%E9%80%81)
- [Markdown 消息](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/type/markdown.html)
- [消息按钮](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html)
- [富媒体消息](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html)

## 版本历史

### v2.1.1 (2024-01-XX)
- ✨ 流式消息输出：长文本自动分段推送（200字符/段）
- ✨ 消息引用：检测 `message_reference`，用户回复消息时自动创建会话
- ✨ 按钮交互：无活动会话时发送快捷按钮（新建会话/列表/帮助）
- ✨ 事件增强：启用 `INTERACTION_CREATE` intent，支持按钮点击映射到命令
- 🐛 修复 `sendKeyboard` 参数顺序
- 🐛 保存最后消息 ID，优化用户回复体验

### v2.1.0 (2024-01-XX)
- 🎉 初始版本：QQ Bot OpenAPI v2 完整实现
- ✨ 私聊、群聊、Markdown、按钮、富媒体
- ✨ 平台抽象层集成
- ✨ Web UI 自动适配

## 示例项目

完整示例代码见仓库：
- Gateway 实现：`lib/qq/gateway.js`
- Platform 适配器：`lib/qq/index.js`
- ConversationBridge 适配：`lib/qq/node.js`
- 单元测试：`test/qq-service.test.mjs`
