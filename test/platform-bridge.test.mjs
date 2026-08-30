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

test('ConversationBridge 群聊首次发言追加授权，不覆盖已有单聊白名单', async () => {
  const { ctx } = makeMockCtx()
  const platform = new MockPlatform({ ctx, logger: ctx.logger })
  const persisted = []
  const bridge = new ConversationBridge({
    ctx, logger: ctx.logger, config: { allowFrom: ['user-openid'] }, platform,
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
  const tmpFile = path.resolve(process.cwd(), 'scratch', 'test-intro-unit.txt')
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
  const tmpFile = path.resolve(process.cwd(), 'scratch', 'test-auto-send.txt')
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

test('ConversationBridge 在普通代码修改时绝不发送文件且不误判', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const tmpJs = path.resolve(process.cwd(), 'scratch', 'test-code.js')
  const tmpVue = path.resolve(process.cwd(), 'scratch', 'test-code.vue')
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


