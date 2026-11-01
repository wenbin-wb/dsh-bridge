// dsh-bridge 平台抽象层单元测试
//
// 验证 Platform 基类 / ConversationBridge / PlatformManager 可独立于微信工作，
// 并保持与 WechatConversationNode 相同的行为。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Platform, ConversationBridge, PlatformManager, conversationBridgeHelpers, textOfAssistantMessage } from '../lib/platform/index.js'

const { splitForIM, sessionsInDisplayOrder, extractFilePathsFromText, resolveFilePath } = conversationBridgeHelpers

// ---------------------------------------------------------------------------
// 造一个最小可用的 mock 平台（模拟任一 IM 平台）
// ---------------------------------------------------------------------------

class MockPlatform extends Platform {
  constructor({ ctx, logger, config = {}, onPersist } = {}) {
    super({ ctx, logger, config, onPersist })
    this.id = 'mock'
    this.name = 'Mock IM'
    this.status = config.status ?? 'connected'
    this.accountId = config.accountId ?? 'bot-mock'
    this.sent = [] // 记录发送的消息
    this.sentMedia = [] // 记录发送的媒体文件
  }
  get configured() { return Boolean(this.config.token) }
  get capabilities() {
    return { supportsGroup: true, supportsMedia: true, supportsVoice: false, supportsTyping: true, maxMessageChars: 2000 }
  }
  async sendText(peerId, text) {
    this.sent.push({ peerId, text })
    return { success: true }
  }
  async sendMediaFile(peerId, filePath) {
    this.sentMedia.push({ peerId, filePath })
    return { success: true }
  }
  async sendTyping(peerId, state) { return { success: true } }
  async login() { this.loginState = { phase: 'done', qrPayload: null, qrKind: null, error: null }; return { ok: true } }
}

function makeMockCtx(extra = {}) {
  const events = {}
  const ctx = {
    _mock: true,
    on(event, fn) { (events[event] ??= []).push(fn); return () => { events[event] = events[event].filter(f => f !== fn) } },
    emit(event, ...args) { (events[event] ?? []).forEach((fn) => fn(...args)) },
    logger: { info() {}, warn() {}, error() {} },
    sessions: { list: () => [], get: () => undefined },
    agents: {
      create: async ({ sessionId }) => ({ agent: { session: { id: sessionId }, followup: () => {}, status: 'idle', cancel: () => {} } }),
      resume: async ({ resumeSessionId }) => ({ agent: { session: { id: resumeSessionId }, followup: () => {}, status: 'idle', cancel: () => {} } }),
      get: () => undefined,
    },
    // 内存优先的存储注入点：避免 dsh-storage.js 的磁盘兜底读到开发机真实的 ~/.dsh
    // （旧实现靠 ctx._mock 后门跳过磁盘读取，拆分后由这里显式提供内存服务/缓存）
    workspaceRegistry: { archivedSessionIds: [], list: async () => [] },
    sessionProjCache: {},
    ...extra,
  }
  return { ctx, events }
}

// ---------------------------------------------------------------------------
// Platform 基类
// ---------------------------------------------------------------------------

test('Platform 基类提供生命周期与消息抽象接口', () => {
  const { ctx } = makeMockCtx()
  const p = new MockPlatform({ ctx, logger: ctx.logger, config: { token: 't', accountId: 'bot1', status: 'idle' } })
  assert.equal(p.id, 'mock')
  assert.equal(p.configured, true)
  assert.equal(p.status, 'idle')
  assert.equal(p.capabilities.maxMessageChars, 2000)
  p.setStatus('online')
  assert.equal(p.status, 'online')
  assert.equal(p.getStatus().status, 'online')
  p.dispose()
})

test('Platform.setStatus 触发 <id>/status 事件', () => {
  const { ctx, events } = makeMockCtx()
  const p = new MockPlatform({ ctx, logger: ctx.logger })
  let seen = null
  ctx.on('mock/status', (s) => { seen = s })
  p.setStatus('online')
  assert.equal(seen, 'online')
  p.dispose()
})

test('Platform.dispose 清理 bridge', () => {
  const { ctx } = makeMockCtx()
  const bridge = { dispose: () => { bridge.disposed = true } }
  const p = new MockPlatform({ ctx, logger: ctx.logger })
  p.bridge = bridge
  p.dispose()
  assert.equal(bridge.disposed, true)
  assert.equal(p.bridge, null)
})

// ---------------------------------------------------------------------------
// ConversationBridge
// ---------------------------------------------------------------------------

test('ConversationBridge 白名单：非授权发件人被忽略（never fed to model）', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] } })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  let fed = 0
  ctx.agents.get = () => ({ session: { id: 's1' }, status: 'idle', followup: () => { fed++ }, cancel: () => {} })
  ctx.sessions.list = () => [{ id: 's1', events: [], header: {}, seq: 0 }]
  bridge.activeSessionId = 's1'

  const out = await bridge.handleInbound({ senderId: 'evil', text: 'do the thing' })
  assert.equal(out, 'ignored')
  assert.equal(fed, 0)

  const ok = await bridge.handleInbound({ senderId: 'u1', text: 'hi' })
  assert.equal(ok, 'routed')
  assert.equal(fed, 1)
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge 首条自动授权（白名单为空时）', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  let persisted = null
  const bridge = new ConversationBridge({
    ctx, logger: ctx.logger, config: {}, platform,
    onFirstSender: (id) => { persisted = id },
  })
  await bridge.handleInbound({ senderId: 'u-new', text: '开始' })
  assert.deepEqual(bridge.config.allowFrom, ['u-new'])
  assert.equal(persisted, 'u-new')
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge 群消息：支持群聊的平台放行并路由', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  // MockPlatform supportsGroup=true → 群消息应放行
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['g1'] }, platform })
  let fed = 0
  ctx.agents.get = () => ({ session: { id: 's1' }, status: 'idle', followup: () => { fed++ }, cancel: () => {} })
  bridge.activeSessionId = 's1'
  const out = await bridge.handleInbound({ senderId: 'g1', text: 'hi', isGroup: true })
  assert.equal(out, 'routed')
  assert.equal(fed, 1)
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge 群消息：不支持群聊的平台忽略', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  // 覆盖为不支持群聊 → 群消息忽略（旧行为保持）
  Object.defineProperty(platform, 'capabilities', { get: () => ({ supportsGroup: false }) })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  let fed = 0
  ctx.agents.get = () => ({ session: { id: 's1' }, status: 'idle', followup: () => { fed++ }, cancel: () => {} })
  bridge.activeSessionId = 's1'
  const out = await bridge.handleInbound({ senderId: 'u1', text: 'hi', isGroup: true })
  assert.equal(out, 'ignored')
  assert.equal(fed, 0)
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge 审批：/yes 通过', () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  let outcome = null
  const timer = setTimeout(() => {}, 100000)
  try {
    bridge.registerApproval(bridge.nextApprovalNumber(), {
      request: { agent: { session: { id: 's1' } }, toolName: 'bash' },
      resolve: (o) => { outcome = o },
      timer,
    })
    assert.equal(bridge.resolveApproval('/yes'), true)
    assert.equal(outcome, 'allowed-once')
  } finally {
    clearTimeout(timer)
    bridge.dispose()
    platform.dispose()
  }
})

test('ConversationBridge 出站分块 + typing 指示', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { maxMessageChars: 10, sendChunkDelayMs: 0 }, platform })
  bridge.peerId = 'u1'
  await bridge.sendText('你好世界，这是一条很长的测试消息需要分块')
  assert.ok(platform.sent.length >= 2, '应分块为多条')
  assert.ok(platform.sent.every((s) => s.text.length <= 10 || s.text.length === 0), '每块不超过 maxMessageChars')
  assert.equal(platform.sent[platform.sent.length - 1].text.trim().length > 0, true)
  bridge.dispose()
  platform.dispose()
})

test('textOfAssistantMessage 提取文本块', () => {
  const msg = { content: [{ type: 'text', text: 'hello' }, { type: 'tool_call', name: 'x' }, { type: 'text', text: ' world' }] }
  assert.equal(textOfAssistantMessage(msg), 'hello\n world')
})

test('splitForIM 保留 fenced code block 完整', () => {
  const code = '```js\nconst a = 1\n```\n\n正文'
  const out = splitForIM(code, 2000)
  assert.equal(out.length, 1)
  assert.ok(out[0].includes('```js'))
})

test('sessionsInDisplayOrder 按工作区分组，保持组内顺序', () => {
  const all = [
    { id: 's-a1', cwd: 'B-proj', createdAt: 300 },
    { id: 's-b2', cwd: 'A-proj', createdAt: 200 },
    { id: 's-b1', cwd: 'A-proj', createdAt: 100 },
    { id: 's-n1', cwd: undefined, createdAt: 50 },
  ]
  const ordered = sessionsInDisplayOrder(all).map((s) => s.id)
  assert.deepEqual(ordered, ['s-a1', 's-b2', 's-b1', 's-n1'])
})

test('ConversationBridge 群聊授权：默认关闭，显式开启 groupAutoApprove 后追加且不覆盖白名单', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const persisted = []
  const bridge = new ConversationBridge({
    ctx, logger: ctx.logger, config: { allowFrom: ['user-openid'] }, platform,
    onFirstSender: (id) => persisted.push({ id, allowFrom: [...bridge.config.allowFrom] }),
  })
  // T2.5：白名单非空时群聊默认不再自动授权（防止任意陌生群 @机器人 即获得访问权）
  const denied = await bridge.handleInbound({ senderId: 'group-openid', text: '群消息', isGroup: true })
  assert.equal(denied, 'ignored')
  assert.deepEqual(bridge.config.allowFrom, ['user-openid'])
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge 群聊显式开启 groupAutoApprove 后自动授权', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const persisted = []
  const bridge = new ConversationBridge({
    ctx, logger: ctx.logger, config: { allowFrom: ['user-openid'], groupAutoApprove: true }, platform,
    onFirstSender: (id) => persisted.push({ id, allowFrom: [...bridge.config.allowFrom] }),
  })
  const out = await bridge.handleInbound({ senderId: 'group-openid', text: '群消息', isGroup: true })
  assert.equal(out, 'routed')
  assert.deepEqual(bridge.config.allowFrom, ['user-openid', 'group-openid'])
  assert.deepEqual(persisted, [{ id: 'group-openid', allowFrom: ['user-openid', 'group-openid'] }])
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge /end 清除活动会话并持久化 null', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const persisted = []
  const bridge = new ConversationBridge({
    ctx, logger: ctx.logger, config: { allowFrom: ['u1'], activeSessionId: 's1' }, platform,
    onActiveSessionChange: (id) => persisted.push(id),
  })
  ctx.agents.get = () => ({ session: { id: 's1' }, status: 'idle', followup() {}, cancel() {} })
  const out = await bridge.handleInbound({ senderId: 'u1', text: '/end' })
  assert.equal(out, 'routed')
  assert.equal(bridge.activeSessionId, null)
  assert.deepEqual(persisted, [null])
  assert.match(platform.sent.at(-1)?.text ?? '', /没有活动会话/)
  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge /list 与 /resume 命令别名正常路由', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const mockSessions = [
    { id: 's-1', cwd: 'proj-a', createdAt: 100, title: 'Session 1' },
    { id: 's-2', cwd: 'proj-b', createdAt: 200, title: 'Session 2' },
  ]
  ctx.sessions.list = () => mockSessions
  ctx.sessions.get = (id) => mockSessions.find((s) => s.id === id)
  const bridge = new ConversationBridge({
    ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform,
  })

  // /list 测试
  const listOut = await bridge.handleInbound({ senderId: 'u1', text: '/list' })
  assert.equal(listOut, 'routed')
  assert.match(platform.sent.at(-1)?.text ?? '', /会话列表/)

  // /resume 测试
  const resumeOut = await bridge.handleInbound({ senderId: 'u1', text: '/resume 1' })
  assert.equal(resumeOut, 'routed')
  assert.equal(bridge.activeSessionId, 's-1')
  assert.match(platform.sent.at(-1)?.text ?? '', /已切换到会话 #1/)

  bridge.dispose()
  platform.dispose()
})

// ---------------------------------------------------------------------------
// PlatformManager
// ---------------------------------------------------------------------------

test('PlatformManager 注册、查找与聚合状态', () => {
  const { ctx } = makeMockCtx()
  const manager = new PlatformManager({ logger: ctx.logger })
  const p1 = new MockPlatform({ ctx, logger: ctx.logger, config: { token: 't1', accountId: 'bot1' } })
  const p2 = new MockPlatform({ ctx, logger: ctx.logger, config: { token: 't2', accountId: 'bot2' } })
  p2.id = 'mock2'
  p2.name = 'Mock IM 2'

  manager.register(p1)
  manager.register(p2)

  assert.equal(manager.get('mock'), p1)
  assert.equal(manager.get('mock2'), p2)
  assert.equal(manager.list().length, 2)

  const status = manager.getStatus()
  assert.ok('mock' in status)
  assert.ok('mock2' in status)
  assert.equal(status.mock.accountId, 'bot1')

  manager.dispose()
})

test('PlatformManager 重复注册同 id 会替换并 dispose 旧实例', () => {
  const { ctx } = makeMockCtx()
  const manager = new PlatformManager({ logger: ctx.logger })
  const p1 = new MockPlatform({ ctx, logger: ctx.logger })
  const p2 = new MockPlatform({ ctx, logger: ctx.logger })
  manager.register(p1)
  manager.register(p2) // 同 id 'mock'
  assert.equal(manager.get('mock'), p2)
  manager.dispose()
})

test('extractAndStripSendFileDirectives 准确提取指令并从聊天正文中剥离', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const tmpDir = path.resolve(process.cwd(), 'scratch')
  fs.mkdirSync(tmpDir, { recursive: true }) // CI 检出里没有 scratch/（本地为未入库的开发目录）
  const tmpFile = path.join(tmpDir, 'test-intro-unit.txt')
  fs.writeFileSync(tmpFile, '自我介绍内容测试')
  try {
    const raw = `我已经为你生成了自我介绍文件，请查收：\n[SEND_FILE: ${tmpFile}]\n祝你使用愉快！`
    const { cleanText, files } = conversationBridgeHelpers.extractAndStripSendFileDirectives(raw, process.cwd())
    assert.equal(files.length, 1)
    assert.equal(files[0], tmpFile)
    assert.equal(cleanText, '我已经为你生成了自我介绍文件，请查收：\n\n祝你使用愉快！')
    assert.ok(!cleanText.includes('SEND_FILE'))
  } finally {
    try { fs.unlinkSync(tmpFile) } catch {}
  }
})

test('ConversationBridge 仅在收到 [SEND_FILE: path] 指令时发送媒体文件且聊天正文过滤指令', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const tmpDir = path.resolve(process.cwd(), 'scratch')
  fs.mkdirSync(tmpDir, { recursive: true }) // 同上：CI 检出无 scratch/
  const tmpFile = path.join(tmpDir, 'test-auto-send.txt')
  fs.writeFileSync(tmpFile, '自动发送测试内容')

  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  bridge.peerId = 'user-wechat-123'
  bridge.activeSessionId = 's1'

  try {
    ctx.emit('session/event', { id: 's1' }, { type: 'turn/start', data: { turn: 1 } })
    ctx.emit('session/event', { id: 's1' }, {
      type: 'assistant/message',
      data: {
        message: {
          content: [{ type: 'text', text: `文件生成完毕，请查收！\n[SEND_FILE: ${tmpFile}]` }]
        }
      }
    })
    ctx.emit('session/event', { id: 's1' }, { type: 'turn/end', data: { reason: { kind: 'stop' } } })
    await new Promise((r) => setTimeout(r, 15))

    // 1. 验证聊天气泡收到的文本已剥离 [SEND_FILE: ...] 指令
    assert.equal(platform.sent.length, 1)
    assert.equal(platform.sent[0].text, '文件生成完毕，请查收！')

    // 2. 验证自动触发了 sendMediaFile
    assert.equal(platform.sentMedia.length, 1)
    assert.equal(platform.sentMedia[0].peerId, 'user-wechat-123')
    assert.equal(platform.sentMedia[0].filePath, tmpFile)
  } finally {
    try { fs.unlinkSync(tmpFile) } catch {}
    bridge.dispose()
    platform.dispose()
  }
})

test('本轮改动摘要：workspace/changes 播报一次（同轮重复事件去重）', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  // 记录 opts：摘要必须带 standalone（否则会被飞书/Telegram 的流式卡片吞掉）
  const sentOpts = []
  const origSendText = platform.sendText.bind(platform)
  platform.sendText = async (peerId, text, opts) => { sentOpts.push(opts); return origSendText(peerId, text) }
  const summary = {
    turn: 3, cwd: '/w', total: 2, added: 12, deleted: 4,
    files: [
      { path: 'src/a.js', display: 'src/a.js', added: 10, deleted: 4 },
      { path: 'src/b.css', display: 'src/b.css', added: 2, deleted: 0 },
    ],
  }
  ctx.workspaceChanges = { summary: (_sid, seq) => (seq === 7 ? summary : undefined), diff: async () => undefined }
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  bridge.peerId = 'peer-1'
  bridge.activeSessionId = 's-chg'

  ctx.emit('session/event', { id: 's-chg' }, { type: 'workspace/changes', seq: 7, data: { turn: 3 } })
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(platform.sent.length, 1, '应播报一条摘要')
  assert.match(platform.sent[0].text, /本轮改动\*\* 2 个文件（\+12\/-4）/)
  assert.match(platform.sent[0].text, /src\/a\.js/)
  // 回归（2026-10-16 真机）：宿主顺序是 workspace/changes → turn/end，摘要发送时
  // 飞书/Telegram 的 _inTurn 仍为 true；不带 standalone 就会被并入流式卡片、随即被
  // turn/end 的收尾覆盖 → 用户侧"摘要一条都收不到"。这里锁死该 opts。
  assert.equal(sentOpts.at(-1)?.standalone, true, '摘要必须标记 standalone 以绕过流式卡片')

  // 同一轮重复事件（宿主可能追加多次）→ 不重复播报
  ctx.emit('session/event', { id: 's-chg' }, { type: 'workspace/changes', seq: 8, data: { turn: 3 } })
  await new Promise((r) => setTimeout(r, 10))
  assert.equal(platform.sent.length, 1, '同一轮只播一次')

  bridge.dispose()
  platform.dispose()
})

test('本轮改动摘要：开关关闭 / 宿主无该服务 / 本轮无改动 → 全程静默', async () => {
  const mk = (config, withService) => {
    const { ctx } = makeMockCtx()
    const platform = new MockPlatform({ ctx, logger: ctx.logger })
    if (withService) ctx.workspaceChanges = { summary: () => ({ turn: 1, total: 0, files: [] }), diff: async () => undefined }
    const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config, platform })
    bridge.peerId = 'peer-1'
    bridge.activeSessionId = 's-quiet'
    return { ctx, platform, bridge }
  }

  // ① 显式关闭
  {
    const { ctx, platform, bridge } = mk({ changesDigest: false }, true)
    ctx.workspaceChanges = { summary: () => ({ turn: 1, total: 2, added: 1, deleted: 0, files: [{ path: 'a', display: 'a', added: 1, deleted: 0 }] }), diff: async () => undefined }
    ctx.emit('session/event', { id: 's-quiet' }, { type: 'workspace/changes', seq: 1, data: { turn: 1 } })
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(platform.sent.length, 0, '关闭后不得播报')
    bridge.dispose(); platform.dispose()
  }
  // ② 老宿主（无 workspaceChanges 服务）
  {
    const { ctx, platform, bridge } = mk({}, false)
    ctx.emit('session/event', { id: 's-quiet' }, { type: 'workspace/changes', seq: 1, data: { turn: 1 } })
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(platform.sent.length, 0, '无服务时静默跳过')
    bridge.dispose(); platform.dispose()
  }
  // ③ 本轮没有文件改动
  {
    const { ctx, platform, bridge } = mk({}, true)
    ctx.emit('session/event', { id: 's-quiet' }, { type: 'workspace/changes', seq: 1, data: { turn: 1 } })
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(platform.sent.length, 0, 'total=0 不刷屏')
    bridge.dispose(); platform.dispose()
  }
})

test('回归：cordis 未 inject 的服务必须"探测"而非直接取属性 —— 否则崩掉整个宿主', async () => {
  // 真实事故（2026-10-16 03:02）：宿主 session 事件回调里直接读 this.ctx.workspaceChanges，
  // 而该服务不在 inject 列表里，cordis 取属性即抛 `cannot get property "workspaceChanges"
  // without inject`；异常从 onEvent 冒泡成 `dsh: fatal load failure`，主进程退出、
  // systemd 重启 dsh-web（IM 侧表现为"改动摘要一条都没播报"）。
  //
  // 为什么既有用例没拦住：makeMockCtx 是普通对象，取不存在的键只得到 undefined，
  // 与真正 cordis ctx 的"抛错"行为不同。这里补一个**忠实模拟 cordis** 的 ctx：
  //   - 未 inject 的**服务**属性访问 → 抛错（真 cordis 行为，就是它崩掉了宿主）；
  //   - `ctx.get(name)` → 宿主官方为可选服务提供的读取口：有则给值、无则 undefined、**不抛错**；
  //   - 框架成员（on/emit/logger…）正常返回。
  const makeCordisLikeCtx = (services = {}) => {
    const { ctx } = makeMockCtx()
    const FRAMEWORK = new Set(['inject', 'on', 'off', 'emit', 'effect', 'logger', 'set', 'plugin', 'extend', 'isolate'])
    Object.assign(ctx, services)
    ctx.get = (name) => (Object.prototype.hasOwnProperty.call(services, name) ? services[name] : undefined)
    return new Proxy(ctx, {
      get(target, prop, recv) {
        if (typeof prop !== 'string' || prop.startsWith('_') || FRAMEWORK.has(prop) || prop === 'get') {
          return Reflect.get(target, prop, recv)
        }
        if (!(prop in target)) throw new Error(`cannot get property "${prop}" without inject`)
        return Reflect.get(target, prop, recv)
      },
    })
  }

  // ① 宿主未提供 workspaceChanges（老宿主 / 未装 workspace-changes）：
  //    必须静默跳过，绝不抛错
  {
    const ctx = makeCordisLikeCtx({})
    const platform = new MockPlatform({ ctx, logger: ctx.logger })
    const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
    bridge.peerId = 'peer-1'
    bridge.activeSessionId = 's-cordis'
    assert.doesNotThrow(() => {
      ctx.emit('session/event', { id: 's-cordis' }, { type: 'workspace/changes', seq: 1, data: { turn: 1 } })
    }, '服务缺失不得让事件回调抛错（会升级为 fatal load failure）')
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(platform.sent.length, 0, '无服务时静默跳过')
    bridge.dispose(); platform.dispose()
  }

  // ② /diff 同一条路径：服务缺失时给友好提示，同样不得抛错
  {
    const ctx = makeCordisLikeCtx({})
    const platform = new MockPlatform({ ctx, logger: ctx.logger })
    const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
    bridge.peerId = 'peer-1'
    bridge.activeSessionId = 's-cordis'
    await assert.doesNotReject(() => bridge.sendSessionDiff(), '服务缺失时 /diff 不得抛错')
    assert.match(platform.sent.at(-1)?.text ?? '', /还没有可导出的改动记录/)
    bridge.dispose(); platform.dispose()
  }

  // ③ 【最关键】宿主提供该服务时，必须**真的拿到**并正常播报。
  //    只 try/catch 的"不崩"写法会在这里失败（服务永远拿不到 → 摘要静默失效），
  //    这正是第一版修复的缺陷：宿主不崩了，但功能被悄悄废掉。
  {
    let svc
    const ctx = makeCordisLikeCtx({
      get workspaceChanges() {
        return svc
      },
    })
    svc = {
      summary: () => ({ turn: 2, total: 1, added: 3, deleted: 1, files: [{ path: 'a.js', display: 'a.js', added: 3, deleted: 1 }] }),
      diff: async () => undefined,
    }
    const platform = new MockPlatform({ ctx, logger: ctx.logger })
    const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
    bridge.peerId = 'peer-1'
    bridge.activeSessionId = 's-cordis'
    assert.ok(bridge._changesSvc, '应通过宿主官方的 ctx.get 拿到 workspaceChanges 服务')
    ctx.emit('session/event', { id: 's-cordis' }, { type: 'workspace/changes', seq: 2, data: { turn: 2 } })
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(platform.sent.length, 1, '有服务时摘要必须照常播报（不能只是"不崩"）')
    assert.match(platform.sent[0].text, /本轮改动/)
    bridge.dispose(); platform.dispose()
  }
})

test('/diff：导出本轮改动为 .patch 附件 + 摘要文本；无记录时友好提示', async () => {
  const fs = await import('node:fs')
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const captured = []
  platform.sendMediaFile = async (peerId, filePath, opts) => {
    captured.push({ peerId, filePath, opts, content: fs.readFileSync(filePath, 'utf8') })
    return { success: true }
  }
  const summary = {
    turn: 5, cwd: '/w', total: 1, added: 1, deleted: 1,
    files: [{ path: 'src/a.js', display: 'src/a.js', added: 1, deleted: 1 }],
  }
  ctx.workspaceChanges = {
    summary: (_sid, seq) => (seq === 9 ? summary : undefined),
    diff: async () => ({ kind: 'text', path: 'src/a.js', display: 'src/a.js', hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-old', '+new'] }] }),
  }
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  bridge.peerId = 'peer-1'
  bridge.activeSessionId = 's-diff'

  // 还没有改动记录 → 友好提示，不发附件
  await bridge.sendSessionDiff()
  assert.equal(captured.length, 0, '无记录不发附件')
  assert.match(platform.sent.at(-1).text, /还没有可导出的改动记录/)

  // 播报事件登记本轮改动后 → /diff 出 patch
  ctx.emit('session/event', { id: 's-diff' }, { type: 'workspace/changes', seq: 9, data: { turn: 5 } })
  await new Promise((r) => setTimeout(r, 10))
  platform.sent.length = 0
  await bridge.sendSessionDiff()
  await new Promise((r) => setTimeout(r, 10))

  assert.equal(captured.length, 1, '应发出一个附件')
  assert.match(captured[0].filePath, /changes-turn-5\.patch$/)
  assert.equal(captured[0].peerId, 'peer-1')
  assert.match(captured[0].content, /diff --git a\/src\/a\.js b\/src\/a\.js/)
  assert.match(captured[0].content, /\+new/)
  assert.match(platform.sent.at(-1).text, /已导出本轮改动补丁/)
  assert.equal(fs.existsSync(captured[0].filePath), false, '发送后应清理临时文件')
  // 不得再往共享临时目录里写可预测文件名（CodeQL js/insecure-temporary-file / CWE-377）：
  // 必须写进 mkdtemp 建出的私有目录，且目录用完即删。
  const os = await import('node:os')
  const pathMod = await import('node:path')
  assert.notEqual(pathMod.dirname(captured[0].filePath), os.tmpdir(), 'patch 不得直接落在共享临时目录根')
  assert.match(pathMod.dirname(captured[0].filePath), /dsh-bridge-diff-/)
  assert.equal(fs.existsSync(pathMod.dirname(captured[0].filePath)), false, '私有临时目录应一并清理')

  bridge.dispose()
  platform.dispose()
})

test('SEND_FILE：会话 cwd 在 header 里时也应放行（回归：曾误读 sess.cwd 导致附件被静默拦掉）', async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')

  // 会话工作区与 dsh 进程启动目录不同，确保不是"碰巧因为 process.cwd()"通过
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-bridge-ws-'))
  const tmpFile = path.join(workDir, 'report.html')
  fs.writeFileSync(tmpFile, '<html>report</html>')

  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  bridge.peerId = 'user-wechat-123'
  bridge.activeSessionId = 's-sendfile'

  try {
    const session = { id: 's-sendfile', header: { cwd: workDir } } // DSH：cwd 在 header 内
    ctx.emit('session/event', session, { type: 'turn/start', data: { turn: 1 } })
    ctx.emit('session/event', session, {
      type: 'assistant/message',
      data: { message: { content: [{ type: 'text', text: `导出完成：\n[SEND_FILE: ${tmpFile}]` }] } },
    })
    ctx.emit('session/event', session, { type: 'turn/end', data: { reason: { kind: 'stop' } } })
    await new Promise((r) => setTimeout(r, 15))

    assert.equal(platform.sentMedia.length, 1, '会话工作区内的附件必须放行')
    assert.equal(platform.sentMedia[0].filePath, tmpFile)
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }) } catch {}
    bridge.dispose()
    platform.dispose()
  }
})

test('ConversationBridge 在普通代码修改时绝不发送文件且不误判', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const tmpDir = path.resolve(process.cwd(), 'scratch')
  fs.mkdirSync(tmpDir, { recursive: true }) // 同上：CI 检出无 scratch/
  const tmpJs = path.join(tmpDir, 'test-code.js')
  const tmpVue = path.join(tmpDir, 'test-code.vue')
  fs.writeFileSync(tmpJs, 'console.log("hello")')
  fs.writeFileSync(tmpVue, '<template><div></div></template>')

  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  bridge.peerId = 'user-wechat-123'
  bridge.activeSessionId = 's-code'

  try {
    ctx.emit('session/event', { id: 's-code' }, { type: 'turn/start', data: { turn: 1 } })
    ctx.emit('session/event', { id: 's-code' }, {
      type: 'tool/call',
      data: { name: 'replace_file_content', parameters: { TargetFile: tmpJs } }
    })
    ctx.emit('session/event', { id: 's-code' }, {
      type: 'assistant/message',
      data: {
        message: {
          content: [{ type: 'text', text: `已修改源码文件：\n- ${tmpJs}\n- ${tmpVue}` }]
        }
      }
    })
    ctx.emit('session/event', { id: 's-code' }, { type: 'turn/end', data: { reason: { kind: 'stop' } } })
    await new Promise((r) => setTimeout(r, 15))

    // 验证源码修改未触发 sendMediaFile
    assert.equal(platform.sentMedia.length, 0)
    // 验证正常发送了修改日志
    assert.equal(platform.sent.length, 1)
    assert.ok(platform.sent[0].text.includes('已修改源码文件'))
  } finally {
    try { fs.unlinkSync(tmpJs) } catch {}
    try { fs.unlinkSync(tmpVue) } catch {}
    bridge.dispose()
    platform.dispose()
  }
})

test('ConversationBridge listSessions 严格过滤已归档会话（内存与持久化）', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })

  ctx.workspaceRegistry = {
    archivedSessionIds: ['archived-s1', 'archived-s2'],
    list: async () => [], // 内存服务齐全，避免 dsh-storage 磁盘兜底读到真实 ~/.dsh
  }
  ctx.sessions.list = () => [
    { id: 'live-s1', header: { createdAt: 100, cwd: '/app' }, events: [{ type: 'session/title', data: { title: '活跃会话1' } }] },
    { id: 'archived-s1', header: { createdAt: 90, cwd: '/app' }, events: [{ type: 'session/title', data: { title: '已归档会话1' } }] },
  ]
  ctx.sessionPersistence = {
    list: async () => [
      { id: 'cold-s1', cwd: '/app', createdAt: 80 },
      { id: 'archived-s2', cwd: '/app', createdAt: 70 },
    ],
    load: async (id) => ({
      events: [{ type: 'session/title', data: { title: id === 'cold-s1' ? '冷会话1' : '归档冷会话' } }],
    }),
  }

  const { listSessions } = conversationBridgeHelpers
  const result = await listSessions(bridge)
  const resultIds = result.map((s) => s.id)

  assert.deepEqual(resultIds, ['live-s1', 'cold-s1'])
  assert.ok(!resultIds.includes('archived-s1'))
  assert.ok(!resultIds.includes('archived-s2'))

  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge 当平台断开连接(status=idle)时严格拦截出站消息', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  platform.status = 'idle' // 已断开连接
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: {}, platform })
  bridge.peerId = 'user-qq-123'
  bridge.activeSessionId = 's1'

  ctx.emit('session/event', { id: 's1' }, { type: 'turn/start', data: { turn: 1 } })
  ctx.emit('session/event', { id: 's1' }, {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: '这条消息不应该发送' }] } }
  })
  ctx.emit('session/event', { id: 's1' }, { type: 'turn/end', data: { reason: { kind: 'stop' } } })
  await new Promise((r) => setTimeout(r, 15))

  // 验证平台未发送任何消息
  assert.equal(platform.sent.length, 0)
  assert.equal(platform.sentMedia.length, 0)

  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge renderSessions 安全处理 object 类型的 goal 标题，防止 TypeError 崩溃', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['user1'] }, platform })

  ctx.sessions.list = () => [
    {
      id: 's1',
      header: { createdAt: Date.now(), cwd: '/workspace/project-a' },
      cwd: '/workspace/project-a',
      title: { objective: '重构登录模块', goal: { objective: '嵌套目标' } },
    },
    {
      id: 's2',
      header: { createdAt: Date.now(), cwd: '/workspace/project-a' },
      cwd: '/workspace/project-a',
      title: { goal: { objective: '修复网络超时' } },
    },
    {
      id: 's3',
      header: { createdAt: Date.now(), cwd: '/workspace/project-a' },
      cwd: '/workspace/project-a',
      title: null,
    },
  ]

  const { renderSessions } = conversationBridgeHelpers
  const output = await renderSessions(bridge)
  assert.ok(output.includes('重构登录模块'))
  assert.ok(output.includes('修复网络超时'))
  assert.ok(output.includes('活跃会话') || output.includes('新会话'))

  bridge.dispose()
  platform.dispose()
})

test('ConversationBridge createSession 默认使用首个已注册工作区并 attach 到 workspaceRegistry', async () => {
  const attachedSessions = []
  const { ctx } = makeMockCtx({
    workspaceRegistry: {
      list: async () => [
        {
          id: 'ws-1',
          path: '/home/user/my-project',
          title: 'My Project',
          attachSession: async (sId) => { attachedSessions.push(sId) },
        },
      ],
    },
  })

  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['user1'] }, platform })
  bridge.peerId = 'user1'

  await bridge.createSession('测试提示词')

  // 验证 attachSession 成功被调用
  assert.equal(attachedSessions.length, 1)
  assert.ok(attachedSessions[0].startsWith('session-'))
  assert.equal(platform.sent.length, 1)
  assert.ok(platform.sent[0].text.includes('已创建新会话'))
  assert.ok(platform.sent[0].text.includes('/home/user/my-project'))

  bridge.dispose()
  platform.dispose()
})



// ---------------------------------------------------------------------------
// 回归：dispose 必须解绑 session/event 监听器（曾因 disposer 闭包引用未定义的
// digestState 抛 ReferenceError，被 dispose 的 try/catch 吞掉导致监听器泄漏）
// ---------------------------------------------------------------------------

test('ConversationBridge.dispose 解绑 session/event 监听器（P0-1 回归）', async () => {
  const { ctx, events } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  bridge.activeSessionId = 's1'

  const before = events['session/event']?.length ?? 0
  assert.ok(before >= 1, 'bridge 应已订阅 session/event')

  bridge.dispose()
  platform.dispose()

  assert.equal(events['session/event']?.length ?? 0, 0, 'dispose 后监听器必须被解绑')

  // dispose 后派发事件不得再驱动已销毁的 bridge（幽灵事件不应触发外发）
  ctx.emit(
    'session/event',
    { id: 's1', events: [], header: {}, seq: 0 },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'ghost output' }] } } },
  )
  assert.equal(platform.sent.length, 0, 'dispose 后不应有任何外发')
})

// ---------------------------------------------------------------------------
// 回归：出站发送队列（T2.1/T2.2）
// ---------------------------------------------------------------------------

test('并发 sendText 经队列串行执行，平台抛异常不逃逸', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const order = []
  platform.sendText = async (peer, text) => {
    order.push(text)
    await new Promise(r => setTimeout(r, text === 'first' ? 30 : 1))
    if (text === 'boom') throw new Error('gateway exploded')
    return { success: true }
  }
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  bridge.activeSessionId = 's1'
  bridge.peerId = 'u1'
  ctx.sessions.list = () => [{ id: 's1', events: [], header: {}, seq: 0 }]

  await Promise.all([
    bridge.sendText('first'),
    bridge.sendText('boom'),
    bridge.sendText('last'),
  ])

  assert.deepEqual(order, ['first', 'boom', 'last'], '发送顺序必须与调用顺序一致')
  bridge.dispose()
  platform.dispose()
})

// ---------------------------------------------------------------------------
// 回归：真实平台适配器携带 gateway 的真实 status（T3.3，离线守卫生效）
// ---------------------------------------------------------------------------

test('QqConversationNode 的 platform.status 透传网关状态，离线时出站被拦截', async () => {
  const { QqConversationNode } = await import('../lib/qq/node.js')
  const sent = []
  const gateway = {
    status: 'idle',
    accountId: 'qq-bot',
    capabilities: { supportsGroup: true, maxMessageChars: 2000 },
    sendText: async (peer, text) => { sent.push({ peer, text }); return { id: 'm1' } },
  }
  const ctx = {
    on: () => () => {},
    emit: () => {},
    logger: { warn() {}, info() {}, error() {}, debug() {} },
    sessions: { list: () => [] },
    agents: { get: () => undefined },
    qq: gateway,
  }
  const node = new QqConversationNode(ctx, { allowFrom: ['u1'] }, ctx.logger)
  assert.equal(node.platform.status, 'idle', '鸭子适配器必须透传网关 status')
  assert.equal(node.platform.id, 'qq')

  await node.sendText('不该发出去')
  assert.equal(sent.length, 0, '网关离线时出站必须被拦截')

  gateway.status = 'connected'
  assert.equal(node.platform.status, 'connected')
  node.dispose()
})

// ---------------------------------------------------------------------------
// 回归：出站事件流绑定发起轮次的 peer（T2.3）
// ---------------------------------------------------------------------------

test('assistant/message 与 turn/end 绑定发起会话的 outboundPeer，而非被覆盖的 peerId', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['a'] }, platform })
  bridge.activeSessionId = 's-a'
  ctx.sessions.list = () => [{ id: 's-a', events: [], header: {}, seq: 0 }]
  ctx.agents.get = () => ({ session: { id: 's-a' }, status: 'idle', followup() {}, cancel() {} })

  await bridge.handleInbound({ senderId: 'a', text: 'run long task', outboundPeer: { peerId: 'chat-a' } })
  // 模拟任务进行期间 this.peerId 被其他来源覆盖（旧实现会把回复串到别的窗口）
  bridge.peerId = 'someone-else'

  const session = { id: 's-a', events: [], header: {}, seq: 0 }
  ctx.emit('session/event', session, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: 'partial output' }] } } })
  await new Promise(r => setTimeout(r, 20))
  const outs = platform.sent.filter(s => s.text === 'partial output')
  assert.equal(outs.length, 1)
  assert.equal(outs[0].peerId, 'chat-a', '回复必须发到发起轮次绑定的会话 peer')

  // turn/end 后轮次绑定释放，Map 不累积
  ctx.emit('session/event', session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
  await new Promise(r => setTimeout(r, 20))
  assert.equal(bridge._turnPeers.has('s-a'), false)
  bridge.dispose()
  platform.dispose()
})

// ---------------------------------------------------------------------------
// 回归：审批桥必须 prepend 到 waterfall 最外层（微信收不到审批卡修复）
//
// DSH 的审批分发是 cordis waterfall：宿主 apiproxy 先注册的 GUI 认领监听器
// 会认领 approval/asked 并 veto（不调 next()）等待网页回答。桥若不 prepend，
// 永远轮不到执行 → IM 端收不到卡片 → 工具调用以 unavailable 失败。
// ---------------------------------------------------------------------------

const { Context: CordisContext } = await import('@deepseek-ai/cordis')

async function makeApprovalHarness() {
  const app = new CordisContext()
  const platform = new MockPlatform({ ctx: app, logger: { info() {}, warn() {}, error() {}, debug() {} } })
  const bridge = new ConversationBridge({
    ctx: app, logger: platform.logger, config: { allowFrom: ['u1'] }, platform,
  })
  bridge.activeSessionId = 's1'
  app.sessions = { list: () => [{ id: 's1', events: [], header: {}, seq: 0 }], get: () => undefined }
  app.agents = {
    get: () => undefined,
    create: async ({ sessionId }) => ({ agent: { session: { id: sessionId }, followup() {}, cancel() {}, status: 'idle' } }),
    resume: async ({ resumeSessionId }) => ({ agent: { session: { id: resumeSessionId }, followup() {}, cancel() {}, status: 'idle' } }),
  }
  app.workspaceRegistry = { archivedSessionIds: [], list: async () => [] }
  app.sessionProjCache = {}

  // 宿主式 GUI 认领监听器：先注册（模拟 dsh-host-apiproxy），认领后挂起等网页回答
  let hostResolve = null
  const hostClaims = []
  app.on('approval/request', () => {
    hostClaims.push(1)
    return new Promise((resolve) => { hostResolve = resolve })
  })
  return { app, platform, bridge, get hostResolve() { return hostResolve }, hostClaims }
}

test('审批桥 prepend 最外层：卡片发到 IM，/yes 决议生效（微信收不到审批卡回归）', async () => {
  const { app, platform, bridge, hostClaims } = await makeApprovalHarness()

  await bridge.handleInbound({ senderId: 'u1', text: '把 readme 发我', outboundPeer: { peerId: 'u1' } })

  // 模拟 dsh-user-approval.decide 的 waterfall 调用（含 unavailable 兜底）
  const decidePromise = app.waterfall('approval/request', { agent: { session: { id: 's1' } }, toolName: 'read_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 30))

  // 归属模型：IM 轮次只在 IM 决议，不调用 next() —— 宿主 GUI 不得认领，
  // 否则 IM 决议后 Web 弹窗会永久残留（用户实测报告）
  assert.equal(hostClaims.length, 0, 'IM 轮次不得打开宿主 GUI 通道')
  assert.ok(platform.sent.some((m) => m.text.includes('操作权限确认')), '审批卡片必须发到 IM')

  // 用户回复 /yes → IM 侧决议
  await bridge.handleInbound({ senderId: 'u1', text: '/yes', outboundPeer: { peerId: 'u1' } })
  const outcome = await decidePromise
  assert.equal(outcome, 'allowed-once')
  await new Promise((r) => setTimeout(r, 30)) // 等待发送队列落地确认消息
  assert.ok(platform.sent.some((m) => m.text.includes('已批准执行')))

  bridge.dispose()
  platform.dispose()
})


test('Web 端发起轮次的审批放行给宿主 GUI，不被 IM 桥劫持（会话归属回归）', async () => {
  const harness = await makeApprovalHarness()
  const { app, platform, bridge } = harness
  // 模拟 Web 端直接驱动该会话（没有经过 handleInbound → 无 _turnPeers 轮次记录）
  assert.equal(bridge._turnPeers.has('s1'), false)

  const decidePromise = app.waterfall('approval/request', { agent: { session: { id: 's1' } }, toolName: 'read_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 30))

  assert.equal(harness.hostClaims.length, 1, '宿主 GUI 监听器必须被直接认领（IM 桥放行）')
  assert.equal(platform.sent.length, 0, 'IM 端不得收到任何审批卡片')
  assert.ok(bridge.pending.size === 0, 'IM 桥不得注册待决审批')

  // GUI 回答后 waterfall 正常闭合
  harness.hostResolve('allowed-once')
  assert.equal(await decidePromise, 'allowed-once')

  bridge.dispose()
  platform.dispose()
})

test('/new <提示词> 后新会话的审批仍走 IM，不被宿主 GUI 接管（轮次绑定迁到新会话 ID 回归）', async () => {
  const harness = await makeApprovalHarness()
  const { app, platform, bridge } = harness

  // 入站时 activeSessionId 还是旧会话 s1；/new 在同一条消息里切到新会话并直接开跑
  await bridge.handleInbound({ senderId: 'u1', text: '/new 在桌面创建一个 dsh-test.txt', outboundPeer: { peerId: 'u1' } })
  const newId = bridge.activeSessionId
  assert.notEqual(newId, 's1')
  assert.ok(bridge._turnPeers.has(newId), '轮次绑定必须迁到新会话 ID')
  assert.equal(bridge._turnPeers.has('s1'), false, '旧会话上不得残留本条入站的轮次绑定')

  const decidePromise = app.waterfall('approval/request', { agent: { session: { id: newId } }, toolName: 'write_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(harness.hostClaims.length, 0, 'IM 发起的轮次不得调用 next() 交给宿主 GUI')
  assert.ok(platform.sent.some((m) => m.text.includes('操作权限确认')), '审批卡片必须发到 IM')

  // Web 端驱动的另一会话（无 IM 轮次记录）仍放行给宿主 GUI
  const webPromise = app.waterfall('approval/request', { agent: { session: { id: 's-web' } }, toolName: 'write_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(harness.hostClaims.length, 1, 'Web 会话的审批必须交给宿主 GUI')
  harness.hostResolve('allowed-once')
  assert.equal(await webPromise, 'allowed-once')

  await bridge.handleInbound({ senderId: 'u1', text: '/yes', outboundPeer: { peerId: 'u1' } })
  assert.equal(await decidePromise, 'allowed-once')

  bridge.dispose()
  platform.dispose()
})

// ---------------------------------------------------------------------------
// 回归：模型把工具调用协议标记（DSML）当正文输出时，不得原样转发到 IM
// ---------------------------------------------------------------------------

test('DSML 协议标记整块剥离，不转发到 IM（协议泄漏回归）', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  bridge.activeSessionId = 's1'
  bridge.peerId = 'u1'
  ctx.sessions.list = () => [{ id: 's1', events: [], header: {}, seq: 0 }]

  const session = { id: 's1', events: [], header: {}, seq: 0 }
  // 用户实测样本：整条消息就是工具调用协议块
  ctx.emit('session/event', session, {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: '<｜｜DSML｜｜tool_calls><｜｜DSML｜｜invoke name="browser_navigate"><｜｜DSML｜｜parameter name="url" string="true">https://example.com</｜｜DSML｜｜parameter></｜｜DSML｜｜invoke></｜｜DSML｜｜tool_calls>' }] } },
  })
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(platform.sent.length, 0, '纯协议标记不得外发')

  // 正文 + 尾部泄漏的协议块：正文保留
  ctx.emit('session/event', session, {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: '我已完成修改。\n<｜｜DSML｜｜tool_calls><｜｜DSML｜｜invoke name="f"></｜｜DSML｜｜invoke></｜｜DSML｜｜tool_calls>' }] } },
  })
  await new Promise((r) => setTimeout(r, 30))
  assert.ok(platform.sent.some((m) => m.text === '我已完成修改。'), '正文必须保留且剥离协议块')

  // 普通文本不受影响
  ctx.emit('session/event', session, {
    type: 'assistant/message',
    data: { message: { content: [{ type: 'text', text: '今天聊到 DSML 的时候要注意格式' }] } },
  })
  await new Promise((r) => setTimeout(r, 30))
  assert.ok(platform.sent.some((m) => m.text.includes('今天聊到 DSML')), '正文提及 DSML 不受影响')

  bridge.dispose()
  platform.dispose()
})

// ---------------------------------------------------------------------------
// 回归：宿主 cordis 上下文对未 inject 属性的读取会抛错（/list 报错修复）
// ---------------------------------------------------------------------------

/** 模拟 DSH 宿主的插件上下文：读取未声明的属性直接抛 'cannot get property ... without inject' */
function makeHostLikeCtx(plain) {
  const declared = new Set(['connection', 'webServer', 'sessions', 'agents', 'approval', 'workspaceRegistry', 'sessionPersistence'])
  const allowed = new Set(['logger', 'on', 'emit', 'effect', 'get'])
  return new Proxy(plain, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop in target || declared.has(prop) || allowed.has(prop)) return target[prop]
      throw new Error(`cannot get property "${String(prop)}" without inject`)
    },
  })
}

test('宿主强制 inject 时 /list 正常回落磁盘存储（sessionProjCache 抛错回归）', async () => {
  const raw = makeMockCtx()
  // 关键：不提供 sessionProjCache —— 宿主上读取它会抛错，必须安全回落
  delete raw.ctx.sessionProjCache
  const ctx = makeHostLikeCtx(raw.ctx)
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const bridge = new ConversationBridge({ ctx, logger: ctx.logger, config: { allowFrom: ['u1'] }, platform })
  bridge.activeSessionId = 's1'
  ctx.sessions.list = () => [
    { id: 'live-1', header: { createdAt: Date.now(), cwd: '/app' }, events: [{ type: 'session/title', data: { title: '活跃会话' } }], seq: 1 },
  ]

  const out = await bridge.handleInbound({ senderId: 'u1', text: '/list', outboundPeer: { peerId: 'u1' } })
  assert.equal(out, 'routed', '命令必须成功路由而不是执行出错')
  assert.ok(platform.sent.some((m) => m.text.includes('会话列表')), '必须正常渲染会话列表而非报错')

  bridge.dispose()
  platform.dispose()
})

// ---------------------------------------------------------------------------
// 回归：飞书审批桥必须 prepend + 归属门槛（飞书收不到审批卡修复）
//
// FeishuConversationNode 曾有自己的遗留审批桥（非 prepend、无轮次门槛、
// 还调用 next() 开 Web 通道）——宿主 GUI 认领先行否决后飞书永远收不到卡片。
// ---------------------------------------------------------------------------

const { FeishuConversationNode } = await import('../lib/feishu/node.js')

async function makeFeishuHarness() {
  const app = new CordisContext()
  const cardSends = []
  const markdownSends = []
  const gateway = {
    status: 'online',
    configured: true,
    accountId: 'feishu-bot',
    capabilities: { supportsGroup: true, supportsMedia: true, supportsTyping: false, maxMessageChars: 2000 },
    sendText: async (peerId, text) => { markdownSends.push({ peerId, text }); return { messageId: 'om_t' } },
    sendCard: async (peerId, card) => { cardSends.push({ peerId, card }); return { messageId: 'om_1' } },
    sendMediaFile: async () => ({ success: true }),
    openStream: async (peerId) => ({
      to: peerId,
      setContent: async () => {},
      finish: async () => {},
    }),
  }
  app.feishu = gateway
  const live = [{ id: 'session-f1', header: { createdAt: Date.now(), cwd: '/app' }, events: [], seq: 1 }]
  app.sessions = { list: () => live, get: (id) => live.find((s) => s.id === id) }
  app.agents = { get: () => ({ session: { id: 'session-f1' }, status: 'idle', followup() {}, cancel() {} }) }
  app.workspaceRegistry = { archivedSessionIds: [], list: async () => [] }

  const node = new FeishuConversationNode(app, { allowFrom: ['u1'] }, { info() {}, warn() {}, error() {}, debug() {} })
  node.activeSessionId = 'session-f1'
  return { app, node, cardSends, markdownSends }
}

test('飞书发起的审批：prepend 抢在宿主前、按钮卡片送达、按钮决议生效', async () => {
  const harness = await makeFeishuHarness()
  const { app, node, cardSends } = harness

  app.emit('feishu/message', { chatId: 'oc_u1', peerId: 'oc_u1', senderId: 'u1', isGroup: false, text: '创建文件', messageId: 'm1', rawContentType: 'text', resources: [] })
  await new Promise((r) => setTimeout(r, 40))

  // 宿主式 GUI 认领监听器：桥必须先于它执行（prepend），且不得调用 next()
  let hostClaimed = false
  app.on('approval/request', () => { hostClaimed = true; return new Promise(() => {}) })

  const decide = app.waterfall('approval/request', { agent: { session: { id: 'session-f1' } }, toolName: 'write_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(hostClaimed, false, 'IM 轮次不得打开宿主 GUI 通道')
  assert.equal(cardSends.length, 1, '飞书交互按钮卡片必须发出')
  assert.equal(cardSends[0].peerId, 'oc_u1')

  // 按钮决议：发起者点击批准
  node._handleAction({ operatorId: 'u1', value: { action: 'approve', approvalId: 1 } })
  assert.equal(await decide, 'allowed-once')

  node.dispose()
})

test('飞书：非发起者点击按钮被拒绝', async () => {
  const harness = await makeFeishuHarness()
  const { app, node, cardSends } = harness

  app.emit('feishu/message', { chatId: 'oc_u1', peerId: 'oc_u1', senderId: 'u1', isGroup: false, text: '创建文件', messageId: 'm1', rawContentType: 'text', resources: [] })
  await new Promise((r) => setTimeout(r, 40))
  const decide = app.waterfall('approval/request', { agent: { session: { id: 'session-f1' } }, toolName: 'write_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(cardSends.length, 1)

  node._handleAction({ operatorId: 'u-evil', value: { action: 'approve', approvalId: 1 } })
  // 给出 50ms：若错误地决议了，decide 会立即落定；否则仍挂起
  const winner = await Promise.race([decide.then(() => 'decided'), new Promise((r) => setTimeout(() => r('pending'), 50))])
  assert.equal(winner, 'pending', '非发起者的按钮点击不得决议')

  // 发起者仍可决议
  node._handleAction({ operatorId: 'u1', value: { action: 'reject', approvalId: 1 } })
  assert.equal(await decide, 'rejected')

  node.dispose()
})

test('飞书：/new <提示词> 后新会话的审批卡片仍发到飞书，不落到宿主 GUI', async () => {
  const harness = await makeFeishuHarness()
  const { app, node, cardSends } = harness
  app.agents.create = async ({ sessionId }) => ({ agent: { session: { id: sessionId }, status: 'idle', followup() {}, cancel() {} } })

  app.emit('feishu/message', { chatId: 'oc_u1', peerId: 'oc_u1', senderId: 'u1', isGroup: false, text: '/new 在桌面创建一个 dsh-test.txt', messageId: 'm1', rawContentType: 'text', resources: [] })
  await new Promise((r) => setTimeout(r, 40))
  const newId = node.activeSessionId
  assert.notEqual(newId, 'session-f1')

  let hostClaimed = false
  app.on('approval/request', () => { hostClaimed = true; return new Promise(() => {}) })
  const decide = app.waterfall('approval/request', { agent: { session: { id: newId } }, toolName: 'write_file' }, () => Promise.resolve('unavailable'))
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(hostClaimed, false, '飞书发起的轮次不得交给宿主 GUI')
  assert.equal(cardSends.filter((c) => JSON.stringify(c.card).includes('approvalId')).length, 1, '审批卡片必须发到飞书')

  node._handleAction({ operatorId: 'u1', value: { action: 'approve', approvalId: 1 } })
  assert.equal(await decide, 'allowed-once')

  node.dispose()
})
