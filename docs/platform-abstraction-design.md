# 平台抽象层设计方案

## 目标

将 `dsh-bridge` 从单一微信集成重构为支持多 IM 平台的架构：
- 抽象出平台无关的核心逻辑（会话管理、消息路由、审批流程）
- 定义统一的平台接口（Platform Interface）
- 每个 IM 平台实现自己的适配器（WeChat / QQ / Feishu / Telegram）
- UI 支持多平台并存，每个平台独立 Tab

## 现状分析

### 当前架构（v1.2.5，WeChat 专用）

```
lib/
  index.js                    主插件入口，注册服务 + RPC
  bridge-rpc.js               Loopback RPC（浏览器 ⇄ Node）
  wechat/
    index.js                  WechatService 协调器
    gateway.js                iLink 协议客户端（扫码/收发/typing）
    node.js                   WechatConversationNode 会话桥
    media.js                  AES-128-ECB 媒体加解密（v0.1 未用）
client/
  index.js                    React UI（单一 WeChat 面板）
```

### 核心逻辑分层

#### 1. **平台协议层**（gateway.js）
- 协议细节：iLink API、长轮询、扫码登录、消息收发
- 状态机：idle → connecting → online → offline
- 凭证管理：token/accountId 持久化
- **平台特定**：每个 IM 平台协议完全不同

#### 2. **会话桥接层**（node.js）
- **平台通用**部分：
  - 白名单验证（allowFrom）
  - DSH 会话生命周期（创建/切换/停止/恢复）
  - 审批问答（approval request/response）
  - 出站 digest 摘要
  - 工作区选择
- **平台特定**部分：
  - 消息格式转换（IM → DSH UserMessage）
  - 出站分块策略（微信 2000 字符限制）
  - 媒体处理（图片/文件/语音）

#### 3. **UI 层**（client/index.js）
- 扫码登录流程
- 状态展示（在线/离线/会话信息）
- 白名单配置
- 参数调整（digest 间隔、审批超时）

## 重构方案

### 架构图

```
lib/
  index.js                           # 主插件入口
  bridge-rpc.js                      # RPC 层（保持不变）
  
  platform/
    base.js                          # Platform 基类（抽象接口）
    manager.js                       # PlatformManager（多平台协调）
    conversation-bridge.js           # 平台无关的会话桥逻辑
  
  platforms/
    wechat/
      index.js                       # WechatPlatform extends Platform
      gateway.js                     # iLink 协议（保持不变）
      adapter.js                     # WeChat 消息适配器
      media.js                       # 媒体处理（保持不变）
    
    qq/
      index.js                       # QQPlatform extends Platform
      gateway.js                     # QQ Bot API
      adapter.js                     # QQ 消息适配器
    
    feishu/
      index.js                       # FeishuPlatform extends Platform
      ...

client/
  index.js                           # 重构：多 Tab UI
  components/
    PlatformPanel.js                 # 通用平台面板组件
    WechatPanel.js                   # 微信专用配置
    QQPanel.js                       # QQ 专用配置
```

### 核心接口设计

#### Platform 基类

```javascript
// lib/platform/base.js
export class Platform {
  constructor({ ctx, logger, config, onPersist }) {
    this.ctx = ctx
    this.logger = logger
    this.config = config
    this.onPersist = onPersist
    
    // 平台标识
    this.id = ''           // 'wechat' | 'qq' | 'feishu'
    this.name = ''         // '微信' | 'QQ' | '飞书'
    this.icon = ''         // emoji or icon name
    
    // 状态
    this.status = 'idle'   // idle | connecting | online | offline | error
    this.accountId = null
    
    // 会话桥
    this.bridge = null     // ConversationBridge 实例
  }
  
  // --- 生命周期 ---
  async start() { throw new Error('Not implemented') }
  async stop() { throw new Error('Not implemented') }
  dispose() { throw new Error('Not implemented') }
  
  // --- 登录 ---
  async login(opts) { throw new Error('Not implemented') }
  getLoginState() { throw new Error('Not implemented') }
  
  // --- 消息收发 ---
  async sendText(peerId, text, opts) { throw new Error('Not implemented') }
  async sendTyping(peerId, state) { throw new Error('Not implemented') }
  async sendMedia(peerId, media) { throw new Error('Not implemented') }
  
  // --- 配置 ---
  getStatus() { throw new Error('Not implemented') }
  async setAllowFrom(list) { throw new Error('Not implemented') }
  async updateConfig(patch) { throw new Error('Not implemented') }
  
  // --- 平台特定能力 ---
  get capabilities() {
    return {
      supportsGroup: false,      // 是否支持群聊
      supportsMedia: false,      // 是否支持媒体
      supportsVoice: false,      // 是否支持语音
      supportsTyping: false,     // 是否支持 typing 状态
      maxMessageChars: 2000,     // 单条消息最大字符数
    }
  }
}
```

#### ConversationBridge（平台无关）

```javascript
// lib/platform/conversation-bridge.js
export class ConversationBridge {
  constructor({ ctx, platform, logger, config }) {
    this.ctx = ctx
    this.platform = platform        // Platform 实例（用于发送消息）
    this.logger = logger
    this.config = config
    
    // 平台无关的状态
    this.allowFrom = config.allowFrom ?? []
    this.peerId = null              // 当前对话的 peer
    this.activeSessionId = null
    this.pendingApprovals = new Map()
    
    // 定时器
    this.digestTimer = null
  }
  
  // --- 消息处理（平台无关逻辑）---
  async handleInboundMessage(message) {
    // 1. 白名单验证
    if (!this.isAllowed(message.senderId)) {
      return
    }
    
    // 2. 路由到当前会话或创建新会话
    const session = await this.getOrCreateSession()
    
    // 3. 转换为 DSH UserMessage（调用平台适配器）
    const userMessage = await this.platform.adapter.toDSHMessage(message)
    
    // 4. 发送到 agent
    await this.sendToAgent(session, userMessage)
    
    // 5. 启动 digest 定时器
    this.scheduleDigest()
  }
  
  // --- 审批处理（平台无关）---
  async handleApprovalRequest(request) { /* ... */ }
  async handleApprovalResponse(senderId, response) { /* ... */ }
  
  // --- Digest 摘要（平台无关）---
  async sendDigest(session) { /* ... */ }
  
  // --- 会话管理（平台无关）---
  async createSession(cwd) { /* ... */ }
  async switchSession(sessionId) { /* ... */ }
  async stopSession() { /* ... */ }
  
  // --- 工作区选择（平台无关）---
  async listWorkspaces() { /* ... */ }
}
```

#### MessageAdapter（平台特定）

```javascript
// lib/platforms/wechat/adapter.js
export class WechatMessageAdapter {
  // IM 消息 → DSH UserMessage
  async toDSHMessage(wechatMessage) {
    const content = []
    
    for (const item of wechatMessage.items) {
      if (item.item_type === ITEM_TEXT) {
        content.push({ type: 'text', text: item.text })
      } else if (item.item_type === ITEM_IMAGE) {
        // 下载 + 解密
        const imageData = await this.downloadMedia(item.item_content)
        content.push({ type: 'image', source: { ... } })
      }
    }
    
    return createUserMessage({ content })
  }
  
  // DSH 消息 → IM 格式（出站分块）
  async toIMChunks(assistantMessage, maxChars) {
    const text = textOfAssistantMessage(assistantMessage)
    return splitForWechat(text, maxChars)
  }
  
  // 下载媒体
  async downloadMedia(url) { /* ... */ }
}
```

#### PlatformManager（多平台协调）

```javascript
// lib/platform/manager.js
export class PlatformManager {
  constructor({ ctx, logger, config, onPersist }) {
    this.ctx = ctx
    this.logger = logger
    this.platforms = new Map()      // platformId → Platform 实例
    
    // 注册平台
    this.register(new WechatPlatform({ ctx, logger, config: config.wechat, onPersist }))
    // this.register(new QQPlatform({ ... }))
    // this.register(new FeishuPlatform({ ... }))
  }
  
  register(platform) {
    this.platforms.set(platform.id, platform)
    
    // 如果已配置，自动启动
    if (platform.config?.token) {
      void platform.start()
    }
  }
  
  get(platformId) {
    return this.platforms.get(platformId)
  }
  
  getStatus() {
    const status = {}
    for (const [id, platform] of this.platforms) {
      status[id] = platform.getStatus()
    }
    return status
  }
  
  dispose() {
    for (const platform of this.platforms.values()) {
      platform.dispose()
    }
  }
}
```

### RPC 接口调整

```javascript
// bridge-rpc.js（新增 platformId 参数）

// 旧：getWechatStatus() → 新：getPlatformStatus(platformId)
async getPlatformStatus({ platformId }) {
  const platform = ctx.platformManager.get(platformId)
  return platform?.getStatus() ?? null
}

// 旧：wechatLogin(opts) → 新：platformLogin({ platformId, opts })
async platformLogin({ platformId, opts }) {
  const platform = ctx.platformManager.get(platformId)
  return await platform.login(opts)
}

// 新增：listPlatforms()
async listPlatforms() {
  return ctx.platformManager.getStatus()
}
```

### UI 重构（多 Tab）

```javascript
// client/index.js（伪代码）

function RemoteAccessPanel() {
  const [platforms, setPlatforms] = useState({})
  const [activeTab, setActiveTab] = useState('wechat')
  
  useEffect(() => {
    // 轮询所有平台状态
    const timer = setInterval(async () => {
      const status = await rpc('listPlatforms')
      setPlatforms(status)
    }, 2000)
    return () => clearInterval(timer)
  }, [])
  
  return h('div', null,
    // Tab 导航
    h('div', { style: tabNav },
      h('button', { onClick: () => setActiveTab('wechat') }, '微信'),
      h('button', { onClick: () => setActiveTab('qq') }, 'QQ'),
      h('button', { onClick: () => setActiveTab('feishu') }, '飞书'),
    ),
    
    // 当前 Tab 面板
    activeTab === 'wechat' && h(WechatPanel, { status: platforms.wechat }),
    activeTab === 'qq' && h(QQPanel, { status: platforms.qq }),
    activeTab === 'feishu' && h(FeishuPanel, { status: platforms.feishu }),
  )
}

// 通用平台面板组件
function PlatformPanel({ platform, status, children }) {
  return h('div', { style: card },
    h('h3', null, platform.name),
    h('div', null, `状态：${status.status}`),
    h('div', null, `账号：${status.accountId ?? '未登录'}`),
    
    // 平台特定配置（通过 children 插槽）
    children,
  )
}
```

## 迁移路径

### 阶段 1：抽取平台无关逻辑
1. 创建 `lib/platform/base.js`（Platform 基类）
2. 创建 `lib/platform/conversation-bridge.js`（从 `node.js` 提取）
3. 创建 `lib/platform/manager.js`（PlatformManager）

### 阶段 2：重构 WeChat 为平台适配器
1. 创建 `lib/platforms/wechat/index.js`（WechatPlatform extends Platform）
2. 创建 `lib/platforms/wechat/adapter.js`（WechatMessageAdapter）
3. 移动 `lib/wechat/*` → `lib/platforms/wechat/*`
4. 重构 `WechatService` → `WechatPlatform`（实现 Platform 接口）

### 阶段 3：更新主插件 + RPC
1. `lib/index.js`：从 `WechatService` 改为 `PlatformManager`
2. `lib/bridge-rpc.js`：添加 `platformId` 参数到所有 RPC 方法
3. 保持向后兼容：`getWechatStatus()` 内部调用 `getPlatformStatus({ platformId: 'wechat' })`

### 阶段 4：重构 UI
1. 创建 `client/components/PlatformPanel.js`（通用组件）
2. 创建 `client/components/WechatPanel.js`（微信专用）
3. 重构 `client/index.js`：多 Tab 布局

### 阶段 5：测试 + 发版
1. 所有现有测试必须通过（WeChat 功能不能退化）
2. 验证 UI 在单平台（WeChat）下与之前行为一致
3. 发布 v2.0.0（大版本变更：架构重构）

### 阶段 6：实现第二个平台（QQ）
1. 创建 `lib/platforms/qq/*`
2. 实现 `QQPlatform` + `QQMessageAdapter`
3. 添加 `client/components/QQPanel.js`
4. 验证多平台并存

## 设计原则

1. **单一职责**：
   - Platform：协议 + 连接管理
   - ConversationBridge：会话逻辑 + DSH 集成
   - MessageAdapter：消息格式转换

2. **开放封闭**：
   - 新增平台无需修改核心逻辑
   - Platform 接口固定，平台内部实现自由

3. **依赖注入**：
   - Platform 通过构造函数注入 ctx/logger/config
   - ConversationBridge 注入 Platform 实例

4. **向后兼容**：
   - 持久化配置结构保持：`config.wechat` / `config.qq`
   - RPC 方法添加新参数，旧方法 deprecated 但保留

5. **测试覆盖**：
   - Platform 基类可 mock（方便测试 ConversationBridge）
   - 每个平台独立测试套件

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 重构破坏现有 WeChat 功能 | 高 | 保持所有测试通过；灰度发布 |
| 抽象层过度设计 | 中 | 先实现 WeChat + QQ 两个平台验证接口合理性 |
| UI 重构影响用户体验 | 中 | 保持单平台下 UI 与 v1.x 一致 |
| 配置迁移问题 | 低 | 保持配置结构兼容；自动迁移脚本 |

## 实施进度

### ✅ 阶段 1：抽取平台无关逻辑（已完成）
- ✅ 创建 `lib/platform/base.js`（Platform 基类）
- ✅ 创建 `lib/platform/conversation-bridge.js`（从 `node.js` 提取）
- ✅ 创建 `lib/platform/manager.js`（PlatformManager）
- ✅ 13 个平台抽象层测试通过
- 提交：`e31d723`

### ✅ 阶段 2：重构 WeChat 为平台适配器（已完成）
- ✅ `lib/wechat/index.js` → `WechatPlatform extends Platform`
- ✅ `lib/wechat/node.js` 继承 `ConversationBridge`，仅保留微信特定逻辑
- ✅ 通过 `makePlatform(ctx)` 适配对象桥接 gateway → Platform 接口
- ✅ 保持 `config.wechat` 配置结构不变
- ✅ 45/45 测试通过（零退化）
- 提交：`e31d723`

### ✅ 阶段 3：更新主插件 + RPC（已完成）
- ✅ `lib/index.js` 使用 `PlatformManager` 管理所有平台
- ✅ 添加新端点：`listPlatforms` / `platformLogin` / `platformSetAllowFrom` / `platformSetConfig` / `platformStop` / `platformUnbind`
- ✅ 保留旧端点向后兼容：`wechatGetStatus` / `wechatLogin` 等（内部调用新端点）
- ✅ RPC 方法添加 `platformId` 参数
- ✅ 47/47 测试通过
- 提交：`e31d723`

### ✅ 阶段 4：重构 UI（已完成）
- ✅ 创建 `PlatformCard` 通用组件（替代 `WechatCard`）
- ✅ 支持动态平台选择（wechat / qq / feishu）
- ✅ 平台选择器从 `listPlatforms` RPC 动态读取状态（available / connected / starting）
- ✅ 平台选择器显示连接状态绿点，可点击切换
- ✅ 通过 `platformId` / `platformName` / `platformDesc` 参数化组件
- ✅ 保留微信使用说明链接（`platformId === 'wechat'` 时）
- ✅ 客户端构建成功，47/47 测试通过
- 提交：`8b98ef5`

### ✅ 阶段 5：测试 + 发版 v2.0.0（进行中）
- ✅ 所有单元测试通过：47/47
- ✅ 客户端构建成功
- ✅ 架构完整性验证：Platform 抽象层 / ConversationBridge / PlatformManager / 统一 RPC / 多平台 UI
- ✅ 向后兼容性验证：v1.x `wechat*` 端点保留，配置结构不变
- 🔄 更新文档（CHANGELOG / README / 设计文档）
- ⏳ 准备发布 npm 包 v2.0.0
- 提交：`[待提交]`

### ⏳ 阶段 6：实现第二个平台（QQ）
- [ ] 创建 `lib/qq/index.js`（QQPlatform）
- [ ] 实现 QQ Bot 协议（NapCat / Mirai）
- [ ] 添加 QQ 特定消息解析
- [ ] 验证多平台并存

## 下一步行动

阶段 5 完成，准备提交并发布 v2.0.0。阶段 6（QQ 平台）可作为独立任务开始。
