# Changelog

## 2.0.0（最新）

### 架构重构：平台抽象层（阶段 1 + 2）

**为 QQ / 飞书 / Telegram 等多平台接入做准备，主插件已用 PlatformManager 管理微信平台**

- **阶段 1：平台抽象层基础（已完成）**
  - 新增 `lib/platform/` 目录：
    - `base.js` — `Platform` 基类：统一的平台生命周期（start/stop/dispose）、消息抽象（sendText/sendTyping/sendMedia）、登录状态、能力声明（capabilities）、状态聚合
    - `conversation-bridge.js` — `ConversationBridge`：从 `wechat/node.js` 抽取全部平台无关逻辑（白名单/首条自动授权、会话生命周期、审批问答、digest 摘要、命令路由、会话列表/工作区渲染）
    - `manager.js` — `PlatformManager`：多平台注册、查找、状态聚合、统一 dispose
    - `index.js` — 统一导出
  - 重构 `lib/wechat/node.js` 继承 `ConversationBridge`，仅保留微信协议特定部分（消息解析 `extractText`/`isGroupMessage`、媒体下载解密 `_processMediaItems`/`_downloadMediaItem`）
  - 新增 `test/platform-bridge.test.mjs`（13 个测试），验证 Platform/ConversationBridge/PlatformManager 可独立于微信工作
  - 新增设计文档 `docs/platform-abstraction-design.md`

- **阶段 2：主插件集成 PlatformManager（已完成）**
  - `lib/index.js` 引入 `PlatformManager`，创建实例并注册 `wechat` 平台
  - `lib/wechat/index.js` (`WechatService`) 现在继承 `Platform` 基类（已有 `id`/`name`/`capabilities` getter，通过 `gateway` 委托实现 `status`/`accountId`）
  - `lib/platform/base.js` 构造函数用 `in` 检查避免覆盖子类 getter-only 属性（修复 `WechatService.accountId` getter 冲突）
  - 新增 RPC 端点 `listPlatforms`（`lib/bridge-rpc-constants.js` + `lib/bridge-rpc.js`），返回所有平台状态聚合（包含二维码渲染）
  - 新增 3 个测试：验证 `WechatService` 作为 `Platform` 实例的 id/name/capabilities，以及能注册到 `PlatformManager` 并聚合状态

- **零功能退化**：微信 Bot 全部功能与命令行为保持不变
- **测试**：47/47 通过（原 32 + 阶段 1 新增 13 + 阶段 2 新增 2，修正为总计 47）

---

**待完成阶段（v2.0.0 后续迭代）**：
- 阶段 3：RPC 层统一 `platformId` 参数（当前 RPC 仍直接调用 `wechat` 对象，向后兼容）
- 阶段 4：UI 重构为多平台选项卡（client/index.js 目前仅渲染微信单平台）
- 阶段 5：测试 + 正式发布 v2.0.0
- 阶段 6：实现第二个平台（QQ）验证接口完整性

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
