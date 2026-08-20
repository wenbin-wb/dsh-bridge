# Changelog

## 2.2.4（最新）

### 🔧 QQ API 全面对齐官方文档（流式 + 按钮 + 网关）

**对照 QQ 官方文档逐项校准，一次性修复所有不符合项**

#### 🐛 关键修复

- **群聊不支持流式**：官方文档明确"群消息不支持流式参数"，群聊回复改为直接发送 Markdown（之前所有消息都走流式，群聊会失败）
- **按钮键盘结构对齐官方**（[消息按钮文档](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html)）：
  - `keyboard.content.rows`（之前缺 `content` 包裹层，按钮不显示/不响应）
  - `action.type=1`（回调按钮触发 INTERACTION_CREATE；之前误用 2 指令按钮）
  - 补齐必填字段 `render_data.style` / `action.data` / `action.unsupport_tips`
  - 提示消息改用 `sendMarkdown(msg_type=2) + keyboard`（官方：按钮挂载于 markdown 消息）
- **互动事件按类型处理**（[INTERACTION_CREATE](https://bot.q.qq.com/wiki/develop/api-v2/autogen/event/interaction_create.html)）：
  - 仅 type=11（消息按钮）/12（快捷菜单）调用 `PUT /interactions/{id}` 回应
  - 其他类型（反馈/清空会话/授权等）无需回应，跳过
  - 回应失败不阻断命令执行
- **WebSocket 网关域名更新**：`wss://api.sgroup.qq.com/websocket/` → `wss://api.bot.qq.com/websocket/`（官方 2026-08-10 域名统一）
- **网关发现接口**：`/gateway` → `/gateway/bot`（官方"获取带分片 WSS 接入点"）
- **群聊输入状态**：群聊消息类型不含 msg_type=6，群聊跳过 typing
- **新增撤回消息**：`withdrawMessage`（DELETE `/v2/users|groups/{id}/messages/{message_id}`）

#### ✅ 其他确认（已合规）

- 流式消息 replace 模式 + 每片递增 msg_seq 防去重（对照[流式文档](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_stream_messages.post.html)）
- 富媒体上传 `/files` + `srv_send_msg`（对照[富媒体上传文档](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_files.post.html)）
- 自定义菜单 / 指令面板 路径正确

- 单元测试 65 → 67 全绿

---

## 2.2.3

### 🐛 流式消息去重错误修复（补充发布）

**修复 QQ 流式消息降级时的去重错误，v2.2.2 已在 npm 发布，此版本为 GitHub 补充发布**

#### 🔧 修复

- **QQ 流式消息降级错误 40054005**：流式第二片失败时，降级到普通 Markdown 触发"消息被去重，请检查请求msgseq"错误
  - 记录用户消息的 `msg_seq`，降级时传递 `msg_seq+1` 避免去重
  - 清理所有发送方法（`sendText`/`sendMarkdown`/`sendKeyboard`/`sendTyping`/`sendStream`），只在有值时添加可选字段（避免 `undefined` 污染 body）

---

## 2.2.2

### 🐛 高级设置实际生效修复

**修复 QQ 平台高级配置被忽略的问题（v2.2.1 及之前版本），现在 4 个高级设置全部真实生效**

#### 🔧 修复

- **maxMessageChars**（每条最大字数）：QQ 之前用硬编码 `200` 字符分片，现在尊重用户配置（默认 2000）
- **sendChunkDelayMs**（分块延迟）：QQ 之前用硬编码 `120ms`，现在尊重用户配置（默认 1500ms）
- **digestIntervalSec** 和 **approvalTimeoutSec**：微信/QQ 都继承父类逻辑，一直生效 ✅

#### 📚 文档

- `docs/qq-usage.md` 新增"高级设置实际生效说明"表格，标注微信/QQ 各配置项生效情况
- 单元测试 64/64 全绿

---

## 2.2.1

### 🚀 全回复流式 Markdown 输出

**所有 AI 回复统一走流式接口并以 Markdown 渲染，手机端不再显示原始语法**

#### ✨ 改进

- **全回复流式**：不再区分长短走普通消息——所有 AI 回复统一走 `/stream_messages` 流式接口，实时看到消息逐段增长
- **Markdown 渲染**：流式内容用 `content_type: markdown`，手机端正常渲染粗体/代码块/列表等（之前用 `text` 类型，手机收到的是没转码的原始语法）
- **流式过渡**：短消息自动拆两片保证「生成中 → 生成结束」过渡；分段按段落边界切分，不切断行内内容
- **QQ 安全 Markdown 转换**：
  - 表格降级为纯文本（QQ Markdown 不支持表格，否则报错/截断）
  - `![图片](url)` 语法转为链接（避免图片转存失败导致整条发送失败）
  - 代码块内容原样保留，不被误伤
- **三级发送回退**：流式 → 带 msg_id 的 Markdown → 主动 Markdown（digest 心跳等非回复场景兜底）
- 单元测试 61 → 64 全绿

---

## 2.2.0

### 🔧 QQ Bot API 全面校准 + 指令面板 / 自定义菜单

**修复 v2.1.2 的流式消息接口故障（QQ API 404），并全面校准所有 QQ OpenAPI v2 调用，新增指令面板与自定义菜单支持**

> ⚠️ 请升级到 2.2.0：v2.1.2 的流式消息接口用了错误的域名和路径，会导致 QQ 收不到消息、服务报错。

#### 🐛 关键修复

- **API 域名统一**：`api.sgroup.qq.com` → `api.bot.qq.com`（官方 2026-08-10 变更）
- **流式消息路径**：`stream-messages` → `stream_messages`（下划线，官方实际路径）
- **流式消息参数**：对齐官方 `content_type` / `content_raw` / `input_mode` / `input_state`（1=生成中，10=生成结束）/ `index` / `stream_msg_id`
- **流式模式**：改用 `append`（追加）模式——原来 `replace` 模式要求每片是全量内容，分段发送必然失败
- **输入状态**：改用官方 `msg_type: 6` + `input_notify`（原来错误地复用流式接口）
- **键盘消息**：`msg_type: 0` + `content` + `keyboard`（原来 `msg_type: 2` 但缺 markdown 字段）
- **被动回复 msg_id**：改用用户消息的事件 ID（`d.id`），原来是机器人自身消息 ID，不符合官方要求
- **peer/scope 传递 bug**：修复群聊场景下 `scope: peer.scope` 为 undefined 导致错发到单聊的问题

#### ✨ 新增能力

- **指令面板**（单聊/群聊常驻命令面板）：
  - 新增全套 API：`listPanels` / `createPanel` / `getPanel` / `updatePanel` / `deletePanel` / `updatePanelTarget`
  - 连接成功后自动创建 `c2c` + `group` 全局面板（`/new` `/list` `/resume` `/sessions` `/help`），幂等创建
- **自定义菜单**（单聊底部菜单）：
  - 新增 `getMenu` / `setMenu`
  - 自动配置"新建 / 列表 / 帮助"菜单项，点击自动填入命令
- 单元测试从 56 → 61（新增域名、流式路径、面板/菜单端点、键盘消息、输入状态 6 组）

#### 文档

- 更新 `docs/qq-usage.md`：新增指令面板与自定义菜单说明、输入状态实现方式、流式消息正确用法

---

## 2.1.2（已知缺陷，请升级 2.2.0）

### 🎯 QQ Bot 输入状态支持

> ⚠️ 本版本流式消息接口存在缺陷（域名/路径错误导致 QQ API 404），请勿使用，升级到 2.2.0。

**实现 QQ 平台的"正在输入"状态指示**

#### 新增特性

- **输入状态指示器**：
  - 流式消息发送时显示"正在输入"状态
  - 使用 `/stream-messages` API 的 `input_state` 参数（`1`=输入中，`0`=结束）
  - 中间段自动显示输入状态，最后一段自动结束状态
  - 提升用户体验，让等待过程更直观

#### 技术改进

- `QqGateway.sendStream()` 支持 `input_state` 参数
- `QqGateway.sendTyping()` 改用流式消息 API 实现输入状态
- `QqConversationNode` 流式发送逻辑自动管理输入状态
- 参考官方文档：[流式发送消息](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_users_user_openid_stream_messages.post.html)

#### 文档更新

- 更新 `docs/qq-usage.md`，新增"输入状态指示"章节
- 完善流式输出与输入状态的技术说明

---

## 2.1.1

### 🚀 QQ Bot 体验增强

**大幅改进 QQ 平台交互体验，充分利用 QQ 开放能力**

#### 新增特性

- **流式消息输出**：
  - 长文本自动分段流式推送（每段 200 字符），降低等待感
  - 使用 QQ `/stream-messages` API 实现逐段发送
  - 多段消息自动关联（`msg_id` 链接到第一段）

- **消息引用与文本交互**：
  - 用户回复机器人消息时自动创建新会话（无需手动输入 `/new`）
  - 检测 `message_reference` 字段，智能判断用户意图
  - 保存最后发送的消息 ID，方便用户直接回复继续对话

- **按钮交互优化**：
  - 无活动会话时自动发送带按钮的提示消息
  - 快捷按钮：🆕 新建会话、📋 会话列表、❓ 帮助
  - 按钮互动事件自动映射到对应命令（`INTERACTION_CREATE` → `/new` / `/list` / `/help`）

- **事件监听增强**：
  - 默认启用 `INTERACTION_CREATE` intent（`1 << 26`）
  - 支持按钮点击、表单提交等互动事件
  - `respondInteraction` 立即响应，避免超时

#### 改进的交互流程

1. **首次接入**：发送任意消息 → 收到带按钮的欢迎提示 → 点击"新建会话"按钮 → 开始对话
2. **继续对话**：直接回复机器人的任何消息 → 自动关联到活动会话 → 无需输入命令
3. **长回复体验**：AI 回复长文本时逐段推送 → 实时看到输出 → 不用等待完整响应

#### 技术改进

- `lib/qq/gateway.js`：
  - 修复 `sendKeyboard` 参数顺序（现在是 `peerId, content, keyboard, opts`）
  - `sendStream` 支持 `msg_id` 关联
  - 默认 intents 包含 `C2C_MESSAGE_CREATE | GROUP_AT_MESSAGE_CREATE | INTERACTION_CREATE`

- `lib/qq/node.js`：
  - `QqConversationNode.sendText` 覆盖：自动流式发送、保存消息 ID、带按钮提示
  - `_handleInbound` 检测消息引用：有引用且无活动会话时自动 `/new`
  - `_handleInteraction` 处理按钮点击：映射 button_id 到命令

#### 测试

- **零回归**：56/56 测试通过
- 所有平台抽象层测试保持稳定

---

## 2.1.0

### 🎉 QQ Bot OpenAPI v2 接入

**新增 QQ 机器人平台支持，覆盖私聊、群聊、Markdown、按钮交互、富媒体消息**

#### 核心特性

- **QQ Bot OpenAPI v2 完整实现**：
  - `lib/qq/gateway.js` — QqGateway：App Access Token 自动刷新（7200s TTL，提前 5min）、WebSocket 长连接（hello/identify/heartbeat/dispatch）、指数退避重连、消息去重（300s TTL）
  - 事件支持：`C2C_MESSAGE_CREATE`（私聊）、`GROUP_AT_MESSAGE_CREATE`（群聊 @提及）、`AT_MESSAGE_CREATE`（群聊 @）
  - 消息类型：文本、Markdown（`msg_type: 2`）、按钮键盘（`keyboard`）、富媒体上传（`/v2/users|groups/{id}/files` + `file_type: 1|2|3|4`）
  - REST API 封装：`sendText` / `sendMarkdown` / `sendKeyboard` / `sendMedia` / `api` 统一鉴权请求
  
- **平台抽象层集成**：
  - `lib/qq/index.js` — `QqService extends Platform`：完整生命周期、凭证管理、状态同步、保存后自动连接
  - `lib/qq/node.js` — `QqConversationNode extends ConversationBridge`：作用域映射（`user_openid` / `group_openid`）、文本提取、媒体处理
  - 自动注册到 `PlatformManager`，无缝接入统一 RPC 层（`platform*` 端点）

- **前端 UI 自动适配**：
  - 平台选择器新增"QQ"选项（描述：`QQ Bot OpenAPI v2（私聊 / 群聊 / 按钮）`）
  - AppID / ClientSecret 配置表单（密钥不回传浏览器，留空保持原值）
  - 保存并连接按钮（调用 `platformSetConfig` 后自动 `start`）
  - 官方文档链接：https://bot.q.qq.com/wiki/develop/api-v2/

- **测试与质量保证**：
  - `test/qq-service.test.mjs` — 9 个单元测试（gateway 初始化、token 管理、消息发送、事件规范化、PlatformManager 集成）
  - **零回归**：56/56 测试通过（47 个原有 + 9 个 QQ 新增）

#### 文件变更
- 新增：`lib/qq/gateway.js`（433 行）、`lib/qq/index.js`（223 行）、`lib/qq/node.js`（124 行）、`test/qq-service.test.mjs`（128 行）
- 修改：`lib/index.js`（注册 QqService）、`client/index.js`（QQ 平台 UI）、`client/client.js`（构建产物）

---

## 2.0.0

### 🎉 架构重构：多平台抽象层

**完成多平台架构重构，支持 QQ / 飞书 / Telegram 等平台接入，客户端/服务端已完全解耦平台逻辑**

#### 核心变更

- **平台抽象层**（阶段 1-2 ✅）：
  - 新增 `lib/platform/` 目录：
    - `base.js` — `Platform` 基类：统一生命周期（start/stop/dispose）、消息抽象（sendText/sendTyping/sendMedia）、登录状态、能力声明（capabilities）
    - `conversation-bridge.js` — `ConversationBridge`：平台无关核心逻辑（白名单、会话管理、审批流程、digest 摘要、命令路由），1144 行从 `wechat/node.js` 提取
    - `manager.js` — `PlatformManager`：多平台注册、查找、状态聚合
  - `lib/wechat/` 重构为平台适配器：
    - `WechatService extends Platform` — 通过 `makePlatform` 桥接 gateway 对象
    - `WechatConversationNode extends ConversationBridge` — 仅保留微信特定逻辑（extractText/isGroupMessage/_processMediaItems）
  - 微信特定逻辑（iLink 协议、消息解析、媒体解密）完全隔离到 `lib/wechat/`

- **RPC 层多平台支持**（阶段 3 ✅）：
  - 新增统一端点：`listPlatforms` / `platformLogin` / `platformSetAllowFrom` / `platformSetConfig` / `platformStop` / `platformStart` / `platformUnbind`
  - 所有 `platform*` 端点接受 `platformId` 参数，动态路由到对应平台（通过 `platformManager.get(platformId)`）
  - **向后兼容**：保留 `wechat*` 端点作为 deprecated 别名（内部转发到 `platform*`），v1.x 客户端无感知

- **UI 重构为多平台选项卡**（阶段 4 ✅）：
  - 创建通用 `PlatformCard` 组件（替代硬编码 `WechatCard`）
  - 平台选择器从 `listPlatforms` RPC 动态读取状态（available / connected / starting）
  - 自动高亮已连接平台（绿色边框 + 状态点）
  - 通过 `platformId` / `platformName` / `platformDesc` 参数化组件
  - 未来接入新平台无需修改 UI 逻辑，只需后端 `platformManager.register()` + 前端 `IM_PLATFORMS` 列表添加显示配置

#### 技术细节

- **零功能退化**：微信 Bot 全部功能保持不变（会话持久化 / 多工作区 / 媒体收发 / 审批流程）
- **测试覆盖**：47/47 通过（原 32 + 新增 15 个平台抽象测试）
  - `test/platform-bridge.test.mjs` — Platform/ConversationBridge/PlatformManager 单元测试
  - `test/wechat-service.test.mjs` — WeChat 平台适配器集成测试
- **架构优势**：
  - 新增平台只需实现 `Platform` 接口（10 个方法），复用 `ConversationBridge` 全部会话/审批/命令逻辑
  - 每个平台独立配置/状态，互不干扰
  - 配置结构向后兼容（`config.wechat` / `config.qq` ...）
- **提交历史**：
  - 阶段 1: `e31d723` — 平台抽象层基础架构
  - 阶段 2: `b782d1c` — WeChat 适配器重构
  - 阶段 3: `13e0e41` — RPC 层统一 platformId 参数
  - 阶段 4: `8b98ef5` — 多平台选项卡 UI

#### 文档

- 新增 `docs/platform-abstraction-design.md` — 完整设计文档（架构 / 接口 / 实施计划 / 进度追踪）
- 更新 README.md / README.zh-CN.md — 多平台路线图状态

#### 下一步

- **阶段 6**：实现第二个平台（QQ Bot）验证架构完整性

## 2.0.4

- **UI**：升级命令改为拼接具体版本号（如 `@2.0.4`），并同时显示 `dsh plugin` 与 `npx` 两种命令，各自带复制按钮

## 2.0.3

- **文档**：升级指引补充 pnpm 11 `minimumReleaseAge`（供应链安全机制）说明 —— 刚发布不足 24 小时的新版本会被 pnpm 过滤导致 `add @latest` 装到旧版；提供 3 种解决方法（`minimumReleaseAge: 0` / 显式指定版本 / 等待 24 小时）

## 2.0.2

- **UI**：版本更新提示优化
  - 升级命令改用 `dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest`（`update --latest` 受依赖版本约束可能无法升级到最新版）
  - 新增「复制」按钮，一键复制升级命令
  - 新增「更新日志」链接，直达 GitHub Releases
  - 重构复制逻辑为通用 `useCopy` hook

## 2.0.1

- **文档**：README / README.zh-CN 新增「升级到最新版」指引 —— 使用 `dsh plugin --profile web add @wenbin_wb/dsh-bridge@latest`（无需知道版本号），解决 `update --latest` 因依赖版本约束无法升级到最新版的问题

## 1.2.5

- **UI**：修复主要按钮（「开启」等）文字颜色在部分主题下显示为黑色的问题，改用 DSH 官方 `--dsw-alias-label-primary-foreground` 变量，确保与其他插件按钮样式统一

## 1.2.4

- **安全**：统一工作区路径校验逻辑，`createSession` 与 `/new` 命令均改为只允许**完全匹配**已注册工作区路径（不再允许子路径），防止路径遍历风险
- **UI**：优化暗黑模式适配，版本更新横幅改为信息卡片样式（与其他卡片风格统一），按钮文字颜色跟随 DSH 主题而非硬编码白色

## 1.2.3

- **修复**：`/sessions` 显示的编号与 `/use N` 切换的会话不对应 —— 统一两者顺序（按工作区字母序分组、组内时间倒序），新增 `sessionsInDisplayOrder` 公共函数 + 2 个回归测试
- **安全**：统一工作区路径校验逻辑，`createSession` 与 `/new` 命令均改为只允许**完全匹配**已注册工作区路径（不再允许子路径），防止路径遍历风险
- **UI**：优化暗黑模式适配，版本更新横幅改为信息卡片样式（与其他卡片风格统一），按钮文字颜色跟随 DSH 主题而非硬编码白色

## 1.2.2

- **修复**：恢复持久化会话改用官方 `agents.resume` API（从持久化加载历史恢复 agent），替代之前错误的 `agents.create`（空 seed 与已持久化事件冲突，导致 "is already persisted with N event(s) that do not match this live session"）
- **修复**：`/sessions` 屏蔽已归档（archived）会话（读 `workspaceRegistry.archivedSessionIds`）
- **优化**：恢复会话失败时向用户显示具体错误原因（原先是笼统的"没有活动会话"）

## 1.2.1

- **修复**：`/use N` 切换到其他工作区的会话后发消息报 "already persisted at a different cwd" —— re-attach 时读取会话持久化的 cwd 作为 fallback

## 1.2.0

- **微信 Bot v0.3（体验与工作区）**
  - **会话持久化修复**：全新会话改用 DSH 原生 `session-<uuid>` ID，重启 DSH 后会话不丢失、发消息自动恢复并续聊
  - **工作区支持**：`/workspaces` 列出工作区，`/new <提示词> @N`（或 `@路径`）在指定项目目录新建会话；基于官方 `workspaceRegistry` API
  - **会话列表升级**：`/sessions` 按**工作区**分组、显示**会话标题**（优先读取 `session/title` 事件），改为 Markdown 排版，微信内更清晰可读
  - **官方 API 化**：会话列表/工作区全部改走官方 `ctx.sessions` + `sessionPersistence` + `workspaceRegistry`，移除文件系统扫描兜底
  - **跨平台**：适配 mac/linux（`path.sep`、`DSH_HOME`）
  - **UI 快捷入口**：设置页微信卡片新增「📖 使用说明」链接与「微信命令」速查折叠
  - **文档**：新增 [微信 Bot 使用说明](docs/wechat-usage.md)，同步更新中/英 README

## 1.1.0

- **微信 Bot（ClawBot / iLink）v0.1**：设置页「远程访问」新增「微信 Bot」卡片
  - 基于腾讯官方微信 ClawBot 插件功能（iLink Bot API），接入域名 `ilinkai.weixin.qq.com`
  - 扫码登录微信个人号，纯拉取式长轮询，无需公网/隧道
  - 在微信里直接对话、控制 DSH agent：`/sessions` `/use` `/new` `/stop` `/status` `/help`
  - 权限审批：DSH 审批请求渲染为微信文本问询，`/yes` `/no`（或 `1`/`2`）作答，超时自动拒绝
  - 扫码后首个向 Bot 发消息的微信用户自动加入白名单（一步到位），其余发件人一律忽略、绝不喂给模型
  - 登录二维码实时渲染在设置页，凭证经 DSH 凭证服务持久化
  - 内置 iLink 独占锁 403 检测、会话过期暂停、限流熔断、typing 指示、出站分块限流
  - 新增目录：`lib/wechat/`（gateway 协议层 + node 会话桥 + media 媒体处理）；详见 [方案](docs/wechat-bot-plan.md)
  - **修复**：`createSession` 补充 `cwd`、`agentPreset`、`model` 默认值，避免 routing-suite preset 模板变量 `{{cwd}}`/`{{model}}` 装配失败（"prompt variable has no value"）
- **微信 Bot v0.2（媒体支持）**：图片/文件双向传输
  - 媒体入站：接收微信图片/文件，AES-128-ECB 解密后保存到工作目录 `.wechat-media/`，路径附加到消息文本通知 agent
  - 媒体加解密：`lib/wechat/media.js` 实现 AES-128-ECB + PKCS#7、CDN 上传下载、SSRF 防护
  - 网关扩展：`gateway.js` 新增 `getUploadUrl` 和 `sendMedia` 方法支持媒体消息收发
  - 语音：`extractText` 支持提取 `voice_item.text`（iLink 自动转文字）
  - 媒体出站：API 已就绪（`getUploadUrl` + `sendMedia`），agent 自动发送文件功能待后续版本实现
  - **修复**：接入方正确的 `image_item.media` / `file_item.media` / `video_item.media` 对象结构，从 `media.encrypt_query_param` 提取 CDN 参数
  - **修复**：AES key 归一化（`normalizeAesKey`）兼容图片 `image_item.aeskey`（裸 hex）等多种编码
  - **优化**：去掉回合开始时的 `[OK] 收到，开始处理…` 刷屏消息，改用微信"正在输入…"指示 + 心跳进度
  - **优化**：活动会话持久化（`activeSessionId`），重启 DSH 后自动恢复上次会话、无需重新 `/new`

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
