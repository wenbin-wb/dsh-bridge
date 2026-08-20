// dsh-bridge 平台抽象层单元测试
//
// 验证 Platform 基类 / ConversationBridge / PlatformManager 可独立于微信工作，
// 并保持与 WechatConversationNode 相同的行为。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Platform, ConversationBridge, PlatformManager, conversationBridgeHelpers, textOfAssistantMessage } from '../lib/platform/index.js'

const { splitForIM, sessionsInDisplayOrder } = conversationBridgeHelpers

// ---------------------------------------------------------------------------
// 造一个最小可用的 mock 平台（模拟任一 IM 平台）
// ---------------------------------------------------------------------------

class MockPlatform extends Platform {
  constructor({ ctx, logger, config = {}, onPersist } = {}) {
    super({ ctx, logger, config, onPersist })
    this.id = 'mock'
    this.name = 'Mock IM'
    this.accountId = config.accountId ?? 'bot-mock'
    this.sent = [] // 记录发送的消息
  }
  get configured() { return Boolean(this.config.token) }
  get capabilities() {
    return { supportsGroup: true, supportsMedia: true, supportsVoice: false, supportsTyping: true, maxMessageChars: 2000 }
  }
  async sendText(peerId, text) {
    this.sent.push({ peerId, text })
    return { success: true }
  }
  async sendTyping(peerId, state) { return { success: true } }
  async login() { this.loginState = { phase: 'done', qrPayload: null, qrKind: null, error: null }; return { ok: true } }
}

function makeMockCtx(extra = {}) {
  const events = {}
  const ctx = {
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
  const p = new MockPlatform({ ctx, logger: ctx.logger, config: { token: 't', accountId: 'bot1' } })
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

test('sessionsInDisplayOrder 按工作区字母序分组', () => {
  const all = [
    { id: 's-a1', cwd: 'B-proj', createdAt: 300 },
    { id: 's-b2', cwd: 'A-proj', createdAt: 200 },
    { id: 's-b1', cwd: 'A-proj', createdAt: 100 },
    { id: 's-n1', cwd: undefined, createdAt: 50 },
  ]
  const ordered = sessionsInDisplayOrder(all).map((s) => s.id)
  assert.deepEqual(ordered, ['s-n1', 's-b2', 's-b1', 's-a1'])
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
