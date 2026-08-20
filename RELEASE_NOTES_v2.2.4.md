# v2.2.4 - QQ 群聊全面可用 + 流式/按钮/API 对齐官方

## 🐛 关键修复（用户反馈）

- **群聊@机器人不回复**：修复 `ConversationBridge` 快速预检查 bug——群聊时直接拦截未授权群（allowFrom 只有单聊 user_openid，群 openid 永不匹配）→ 到不了 handleInbound 的群聊自动授权。**改为单聊才快速拦截，群聊交给自动授权**
- **群聊授权按群维度**：QQ 群聊授权主体改为 `group_openid`（首次 @机器人 自动授权该群，群内成员均可使用）
- **新增 `/end` 命令**：结束当前会话（停止 agent + 清除 activeSessionId），提示文本含文字命令指引（`/new` `/sessions` `/help`），**无按钮权限也能操作**
- **onFirstSender 持久化改为追加式**（完整 allowFrom），避免群聊自动授权覆盖已有单聊白名单

## 🔧 API 全面对齐官方文档

对照 [QQ 官方文档](https://bot.q.qq.com/wiki/) 逐项校准所有不符合项：

- **流式消息**：replace 模式 + 每片递增 msg_seq 防去重（[流式文档](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_stream_messages.post.html)）
- **群聊不支持流式**：官方明确"群消息不支持流式参数"，群聊回复改为直接发送 Markdown
- **按钮键盘结构对齐**（[消息按钮文档](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html)）：
  - `keyboard.content.rows`（之前缺 `content` 包裹层）
  - `action.type=1`（回调按钮触发 INTERACTION_CREATE）
  - 补齐必填字段 `render_data.style` / `action.data` / `action.unsupport_tips`
- **互动事件按类型处理**（[INTERACTION_CREATE](https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/interaction_create.html)）：仅 type=11（消息按钮）/12（快捷菜单）调用 `PUT /interactions/{id}` 回应
- **Intent 修正**：`GROUP_AT_MESSAGE_CREATE` 从错误的 `1<<30` 修正为 `1<<25`（与 `C2C_MESSAGE_CREATE` 同属 `GROUP_AND_C2C_EVENT`）
- **WebSocket 网关域名**：`wss://api.sgroup.qq.com/websocket/` → `wss://api.bot.qq.com/websocket/`（官方 2026-08-10 域名统一）
- **网关发现接口**：`/gateway` → `/gateway/bot`
- **群聊输入状态**：群聊跳过 typing；QQ `supportsTyping` 声明 false → true
- **新增撤回消息**：`withdrawMessage`（DELETE `/v2/users|groups/{id}/messages/{message_id}`）
- **自定义菜单幂等**：先 GET 检查，内容一致则跳过 PUT（避免 version 无限递增）

## 📋 重要说明

- **自定义菜单 / 指令面板 / 消息按钮需要最新版 QQ 客户端**（2026-08-12 新功能，手机版优先支持）。API 配置成功但客户端不显示是正常现象——更新 QQ 到最新版再试，或等官方灰度全量开放
- 官方 `GROUP_AT_MESSAGE_CREATE` 的 content 已自动去除 @机器人 前缀，agent 收到干净文本
- 单元测试 65 → 68 全绿

## 📦 安装

```bash
npm install -g @wenbin_wb/dsh-bridge@2.2.4
# 或
npm update -g @wenbin_wb/dsh-bridge
```

## 🔗 文档

- [QQ 使用文档](https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/qq-usage.md)
- [微信使用文档](https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/wechat-usage.md)
